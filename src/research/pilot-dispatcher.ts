import { z } from "zod";
import { type Database } from "../customer/store";
import type { ExpansionScope } from "../customer/expansion";
import { expansionConfiguration } from "../customer/expansion-contracts";
import {
  marketCategories,
  storedMarket,
  type Ingestion,
} from "../customer/market-contracts";
import { ReviewedImports } from "../customer/reviewed-imports";
import { PreparedExpansionProvider } from "./prepared-provider";
import { ProviderLedger } from "./provider-ledger";
import { BoundedSources, SourceError } from "./source-adapters";
import { PilotTransport, type PinnedFixtureConnector } from "./pilot-transport";

export const pilotPolicy = z
  .object({
    config: expansionConfiguration,
    plans: z.record(
      z.enum(marketCategories),
      z
        .object({
          query: z.string().min(1).max(1000),
          hosts: z.array(z.string()).min(1).max(20),
          requiredUrls: z.array(z.url()).max(4),
        })
        .strict(),
    ),
    grants: z
      .array(
        z
          .object({
            host: z.string().min(1),
            paths: z.array(z.string().startsWith("/")).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
type Job = {
  id: string;
  pilot_id: string;
  state: string;
  lease: string;
  lease_until: number;
  document_json: string;
};

// Server-only orchestration. No HTTP route, default network connector, secret
// lookup or production activation switch is introduced by this fixture pass.
export class PilotDispatcher {
  constructor(
    private db: Database,
    private scope: ExpansionScope,
    private connector:
      | PinnedFixtureConnector
      | ((
          category: (typeof marketCategories)[number],
          config: z.infer<typeof expansionConfiguration>,
          at: string,
        ) => Promise<PinnedFixtureConnector>),
    private revalidate: () => Promise<void>,
    private now = Date.now,
  ) {}
  private bind() {
    return [this.scope.tenantId, this.scope.propertyId];
  }
  private async access() {
    if (
      !this.scope.tenantId.startsWith("fixture_") ||
      !this.scope.propertyId.startsWith("fixture_") ||
      (typeof this.connector !== "function" &&
        this.connector.mode !== "synthetic")
    )
      throw new SourceError("LIVE_DISABLED");
    await this.revalidate();
    const s = this.scope;
    const row = await this.db
      .prepare(
        "SELECT s.token_hash FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE s.token_hash=? AND s.tenant_id=? AND s.property_id=? AND s.user_id=? AND s.expires_at>? AND m.active=1 AND p.active=1 AND m.role IN('editor','admin')",
      )
      .bind(s.sessionHash, ...this.bind(), s.actor, this.now())
      .first();
    if (!row) throw new SourceError("PILOT_ACCESS_DENIED");
    const c = await this.db
      .prepare(
        "SELECT document_json FROM customer_expansion_config WHERE tenant_id=? AND property_id=?",
      )
      .bind(...this.bind())
      .first<{ document_json: string }>();
    if (c && JSON.parse(c.document_json).paused)
      throw new SourceError("PROPERTY_PAUSED");
  }
  private async job(id: string) {
    const j = await this.db
      .prepare(
        "SELECT * FROM customer_pilot_jobs WHERE tenant_id=? AND property_id=? AND id=?",
      )
      .bind(...this.bind(), id)
      .first<Job>();
    if (!j) throw new SourceError("PILOT_JOB_UNAVAILABLE");
    return j;
  }
  private async guard(id: string, fence: string) {
    await this.access();
    const j = await this.job(id);
    const p = await this.db
      .prepare(
        "SELECT expires_at FROM customer_pilot_policy WHERE tenant_id=? AND property_id=? AND id=?",
      )
      .bind(...this.bind(), j.pilot_id)
      .first<{ expires_at: number }>();
    if (
      j.state !== "running" ||
      j.lease !== fence ||
      j.lease_until <= this.now() ||
      !p ||
      p.expires_at <= this.now()
    )
      throw new SourceError("PILOT_LEASE_OR_EXPIRY");
  }
  async run(pilotId: string, requestKey: string) {
    await this.access();
    // An interrupted dispatch is never retried automatically. Its unknown-cost
    // reservations remain held and it still consumes one of the pilot's jobs.
    await this.db
      .prepare(
        "UPDATE customer_pilot_jobs SET state='blocked',document_json=json_set(document_json,'$.code','PILOT_INTERRUPTED') WHERE tenant_id=? AND property_id=? AND state='running' AND lease_until<=?",
      )
      .bind(...this.bind(), this.now())
      .run();
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestKey))
      throw new SourceError("REQUEST_INVALID");
    const old = await this.db
      .prepare(
        "SELECT * FROM customer_pilot_jobs WHERE tenant_id=? AND property_id=? AND request_key=?",
      )
      .bind(...this.bind(), requestKey)
      .first<Job>();
    if (old) {
      if (old.pilot_id !== pilotId) throw new SourceError("REQUEST_CONFLICT");
      return this.status(old.id);
    }
    const policy = await this.db
      .prepare(
        "SELECT document_json FROM customer_pilot_policy WHERE tenant_id=? AND property_id=? AND id=?",
      )
      .bind(...this.bind(), pilotId)
      .first<{ document_json: string }>();
    if (!policy) throw new SourceError("PILOT_NOT_APPROVED");
    const plan = pilotPolicy.parse(JSON.parse(policy.document_json));
    if (plan.config.paused) throw new SourceError("PROPERTY_PAUSED");
    const id = crypto.randomUUID(),
      fence = crypto.randomUUID(),
      at = new Date(this.now()).toISOString();
    try {
      await this.db
        .prepare(
          "INSERT INTO customer_pilot_jobs(tenant_id,property_id,id,pilot_id,request_key,state,lease,lease_until,created_at,actor,session_hash) VALUES(?,?,?,?,?,'running',?,?,?,?,?)",
        )
        .bind(
          ...this.bind(),
          id,
          pilotId,
          requestKey,
          fence,
          this.now() + 120000,
          this.now(),
          this.scope.actor,
          this.scope.sessionHash,
        )
        .run();
    } catch {
      const concurrent = await this.db
        .prepare(
          "SELECT id,pilot_id FROM customer_pilot_jobs WHERE tenant_id=? AND property_id=? AND request_key=?",
        )
        .bind(...this.bind(), requestKey)
        .first<{ id: string; pilot_id: string }>();
      if (concurrent?.pilot_id === pilotId) return this.status(concurrent.id);
      throw new SourceError("PILOT_BUSY_OR_LIMIT");
    }
    const guard = () => this.guard(id, fence);
    const ledger = new ProviderLedger(this.db, {
      ...this.scope,
      jobId: id,
      month: at.slice(0, 7),
    });
    const items: Ingestion["items"] = [],
      outcomes: { category: string; status: string; code: string }[] = [];
    try {
      for (const category of marketCategories) {
        await guard();
        try {
          const connector =
            typeof this.connector === "function"
              ? await this.connector(category, plan.config, at)
              : this.connector;
          if (connector.mode !== "synthetic")
            throw new SourceError("LIVE_DISABLED");
          const sources = new BoundedSources(
            new PilotTransport(connector, plan.grants, guard),
            {
              reserve: async (key, max) => {
                await guard();
                return ledger.reserve(key, max);
              },
              settle: (key, actual) => ledger.settle(key, actual),
            },
            this.now,
          );
          const provider = new PreparedExpansionProvider(
            sources,
            (i) => plan.plans[i.category],
          );
          items.push(
            ...(await provider.research({
              jobId: id,
              category,
              config: plan.config,
              propertyId: this.scope.propertyId,
              scenario: "baseline",
              at,
            })),
          );
          outcomes.push({
            category,
            status: "complete",
            code: "SYNTHETIC_CHECK_COMPLETE",
          });
        } catch (error) {
          await guard(); // Revocation, pause or lost ownership stops the whole job.
          outcomes.push({
            category,
            status: "failed",
            code:
              error instanceof SourceError
                ? error.code
                : "SOURCE_INVALID_RESPONSE",
          });
        }
      }
      await guard();
      if (!outcomes.some((o) => o.status === "complete"))
        throw new SourceError("ALL_SOURCES_FAILED");
      const market = await this.db
        .prepare(
          "SELECT revision FROM customer_markets WHERE tenant_id=? AND property_id=? AND data_mode='synthetic'",
        )
        .bind(...this.bind())
        .first<{ revision: number }>();
      if (!market) throw new SourceError("PILOT_MARKET_UNAVAILABLE");
      await new ReviewedImports(this.db, this.now).execute(
        { ...this.scope, dataMode: "synthetic" },
        {
          operation: "stage",
          batch: {
            batchKey: id,
            expectedRevision: market.revision,
            observedAt: at,
            status: outcomes.every((o) => o.status === "complete")
              ? "Completed"
              : "Partial",
            categories: [...marketCategories],
            warnings: outcomes
              .filter((o) => o.status === "failed")
              .map((o) => `${o.category}: ${o.code}`),
            items,
          },
        },
      );
      await guard();
      await this.db
        .prepare(
          "UPDATE customer_pilot_jobs SET state='pending-review',document_json=? WHERE tenant_id=? AND property_id=? AND id=? AND lease=? AND state='running'",
        )
        .bind(
          JSON.stringify({ outcomes, reviewId: id }),
          ...this.bind(),
          id,
          fence,
        )
        .run();
    } catch (error) {
      const code =
        error instanceof SourceError ? error.code : "PILOT_STAGE_FAILED";
      await this.db
        .prepare(
          "UPDATE customer_pilot_jobs SET state=?,document_json=? WHERE tenant_id=? AND property_id=? AND id=? AND lease=? AND state='running'",
        )
        .bind(
          code === "ALL_SOURCES_FAILED" ? "failed" : "blocked",
          JSON.stringify({ outcomes, code }),
          ...this.bind(),
          id,
          fence,
        )
        .run();
    }
    return this.status(id);
  }
  // Consumers receive only the immutable, explicitly approved evidence snapshot.
  async approvedSnapshot(id: string) {
    await this.access();
    await this.job(id);
    const row = await this.db
      .prepare(
        "SELECT document_json,approval_hash FROM customer_import_reviews WHERE tenant_id=? AND property_id=? AND review_id=? AND status='approved'",
      )
      .bind(...this.bind(), id)
      .first<{ document_json: string; approval_hash: string }>();
    if (!row) throw new SourceError("PILOT_REVIEW_REQUIRED");
    return {
      reviewId: id,
      approvalHash: row.approval_hash,
      market: storedMarket.parse(JSON.parse(row.document_json)),
    };
  }
  async status(id: string) {
    await this.access();
    const j = await this.job(id);
    const review = await this.db
      .prepare(
        "SELECT status FROM customer_import_reviews WHERE tenant_id=? AND property_id=? AND review_id=?",
      )
      .bind(...this.bind(), id)
      .first<{ status: string }>();
    return {
      id,
      state: j.state,
      review: review?.status ?? null,
      ...JSON.parse(j.document_json),
      researchEnabled: false,
      paidCallsEnabled: false,
      schedulesEnabled: false,
      notificationsEnabled: false,
    };
  }
}
