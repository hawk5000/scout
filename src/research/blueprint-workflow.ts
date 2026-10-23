import { identityProposalFor } from "./identity-proposals";
import { z } from "zod";
import { CustomerError, customerDraftProfile } from "../customer/contracts";
import { expansionConfiguration } from "../customer/expansion-contracts";
import type { ExpansionScope } from "../customer/expansion";
import { digest, type Database } from "../customer/store";
import {
  storedMarket,
  ingestionSchema,
  type Ingestion,
} from "../customer/market-contracts";
import { ReviewedImports } from "../customer/reviewed-imports";
import { BoundedSources, SourceError, sourceUrl } from "./source-adapters";
import { ProviderLedger } from "./provider-ledger";
import {
  OpenAIWebSearchTransport,
  searchWithOpenAI,
  openAiSearchMaximumMicros,
} from "./openai-web-search";
import {
  blueprintPlan,
  blueprintPrompt,
  publicIdentity,
  researchedItems,
  type BlueprintPlan,
  type PublicIdentity,
  type ResearchStep,
} from "./blueprint-plan";

export const blueprintActions = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }).strict(),
  z
    .object({
      action: z.literal("confirm-identity"),
      subjectId: z.string().min(1).max(100),
      identity: publicIdentity,
      configurationHash: z.string().length(64),
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("start"),
      mode: z.enum(["baseline", "update"]),
      approvalId: z.string().min(1).max(100),
      requestKey: z.string().uuid(),
    })
    .strict(),
  z.object({ action: z.literal("advance"), jobId: z.string().uuid() }).strict(),
]);
type Job = {
  id: string;
  state: string;
  mode: "baseline" | "update";
  step: number;
  lease: string | null;
  lease_until: number;
  plan_json: string;
  plan_hash: string;
  approval_id: string;
  review_id: string | null;
  brief_json: string | null;
};
type StepResult = {
  outcome: "complete" | "partial" | "blocked" | "failed";
  code: string;
  gaps: string[];
  sources: { url: string; title: string }[];
  items: Ingestion["items"];
  checkedAt: string;
};
type Approval = {
  plan_hash: string;
  domains_json: string;
  max_calls: number;
  expires_at: number;
};
export class BlueprintWorkflow {
  constructor(
    private db: Database,
    private scope: ExpansionScope,
    private key: string | undefined,
    private revalidate: () => Promise<ExpansionScope>,
    private fetcher: typeof fetch = fetch,
    private now: () => number = Date.now,
  ) {}
  private query(sql: string, ...args: unknown[]) {
    return this.db
      .prepare(sql)
      .bind(this.scope.tenantId, this.scope.propertyId, ...args);
  }
  private async rows<T>(sql: string, ...args: unknown[]) {
    const result = await this.query(sql, ...args).all!();
    return result.results as T[];
  }
  private async context() {
    const row = await this.query(
      "SELECT profile_json FROM customer_properties WHERE tenant_id=? AND property_id=? AND active=1",
    ).first<{ profile_json: string }>();
    const configRow = await this.query(
      "SELECT document_json FROM customer_expansion_config WHERE tenant_id=? AND property_id=?",
    ).first<{ document_json: string }>();
    if (!row?.profile_json || !configRow)
      throw new CustomerError("Save the hotel and research area first.", 409);
    const profile = customerDraftProfile.parse(JSON.parse(row.profile_json));
    const { own, competitors, paused } = JSON.parse(configRow.document_json);
    const config = expansionConfiguration.parse({ own, competitors, paused });
    const configurationHash = await digest(JSON.stringify({ profile, config }));
    const identities: Record<string, PublicIdentity> = {};
    for (const i of await this.rows<{
      subject_id: string;
      document_json: string;
    }>(
      "SELECT subject_id,document_json FROM customer_public_identities WHERE tenant_id=? AND property_id=? AND configuration_hash=?",
      configurationHash,
    ))
      identities[i.subject_id] = publicIdentity.parse(
        JSON.parse(i.document_json),
      );
    const m = await this.query(
      "SELECT document_json,revision,data_mode FROM customer_markets WHERE tenant_id=? AND property_id=?",
    ).first<{ document_json: string; revision: number; data_mode: string }>();
    if (!m || m.data_mode !== "reviewed")
      throw new CustomerError("Reviewed market enrollment is required.", 409);
    const market = storedMarket.parse(JSON.parse(m.document_json));
    const area = `${profile.marketCenter}; ${profile.radiusMiles ?? "unconfirmed"} mile radius; included: ${profile.includedPlaces.join(", ")}; excluded: ${profile.excludedPlaces.join(", ")}`;
    return {
      profile,
      config,
      configurationHash,
      identities,
      market,
      revision: m.revision,
      area,
    };
  }
  async execute(raw: unknown) {
    const action = blueprintActions.parse(raw);
    const fresh = await this.revalidate();
    if (
      fresh.tenantId !== this.scope.tenantId ||
      fresh.propertyId !== this.scope.propertyId ||
      fresh.actor !== this.scope.actor
    )
      throw new CustomerError("Account scope changed.", 403);
    this.scope = fresh;
    if (action.action === "status") return this.status();
    if (action.action === "confirm-identity") {
      if (!["editor", "admin"].includes(fresh.role))
        throw new CustomerError("Profile editing permission required.", 403);
      const c = await this.context();
      if (c.configurationHash !== action.configurationHash)
        throw new CustomerError(
          "Hotel settings changed. Review the identity again.",
          409,
        );
      if (
        action.subjectId !== "own" &&
        !c.config.competitors.some((h) => h.id === action.subjectId && h.active)
      )
        throw new CustomerError("Unknown selected hotel.", 400);
      for (const url of [action.identity.website, action.identity.sourceUrl])
        sourceUrl(url, [new URL(url).hostname]);
      await this.db
        .prepare(
          "INSERT INTO customer_public_identities(tenant_id,property_id,subject_id,document_json,configuration_hash,actor,session_hash,confirmed_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,property_id,subject_id) DO UPDATE SET document_json=excluded.document_json,configuration_hash=excluded.configuration_hash,actor=excluded.actor,session_hash=excluded.session_hash,confirmed_at=excluded.confirmed_at",
        )
        .bind(
          fresh.tenantId,
          fresh.propertyId,
          action.subjectId,
          JSON.stringify(action.identity),
          c.configurationHash,
          fresh.actor,
          fresh.sessionHash,
          new Date(this.now()).toISOString(),
        )
        .run();
      return this.status();
    }
    if (!fresh.manualResearchAllowed)
      throw new CustomerError(
        "SIL permission for SCOUT manual research is required.",
        403,
      );
    if (action.action === "start")
      return this.start(action.mode, action.approvalId, action.requestKey);
    await this.advance(action.jobId);
    return this.status();
  }
  async status() {
    const c = await this.context();
    const plan = blueprintPlan(
      "baseline",
      c.configurationHash,
      c.area,
      c.config,
      c.identities,
      c.market,
    );
    const jobs = await this.rows<Job>(
      "SELECT * FROM customer_blueprint_jobs WHERE tenant_id=? AND property_id=? ORDER BY created_at DESC LIMIT 10",
    );
    const coverage = await this.rows<{
      area: string;
      category: string;
      subject_id: string;
      outcome: string;
      checked_at: string;
      document_json: string;
    }>(
      "SELECT area,category,subject_id,outcome,checked_at,document_json FROM customer_blueprint_steps WHERE tenant_id=? AND property_id=? ORDER BY checked_at DESC LIMIT 300",
    );
    const spent = await this.query(
      "SELECT COALESCE(SUM(accounted_micros),0) AS micros FROM customer_provider_effective_calls WHERE tenant_id=? AND property_id=?",
    ).first<{ micros: number }>();
    const planHash = await digest(JSON.stringify(plan));
    const updatePlanHash = await digest(
      JSON.stringify(
        blueprintPlan(
          "update",
          c.configurationHash,
          c.area,
          c.config,
          c.identities,
          c.market,
        ),
      ),
    );
    const approvedPlans = this.scope.manualResearchAllowed
      ? await this.rows<{
          id: string;
          mode: string;
          max_calls: number;
          run_cap_micros: number;
        }>(
          "SELECT a.id,a.mode,a.max_calls,a.run_cap_micros FROM customer_blueprint_approvals a WHERE a.tenant_id=? AND a.property_id=? AND a.plan_hash IN(?,?) AND a.expires_at>? AND NOT EXISTS(SELECT 1 FROM customer_blueprint_jobs j WHERE j.tenant_id=a.tenant_id AND j.property_id=a.property_id AND j.approval_id=a.id)",
          planHash,
          updatePlanHash,
          this.now(),
        )
      : [];
    const baselineCount = c.market.records.filter((r) => r.entity).length;
    return {
      configurationHash: c.configurationHash,
      accountName: c.profile.name,
      identities: c.identities,
      identityProposal: identityProposalFor(c.profile.address),
      competitors: c.config.competitors
        .filter((h) => h.active)
        .map((h) => ({
          id: h.id,
          name: h.name,
          address: [h.address, h.locality].join(", "),
          domain: h.domain,
          proposal: identityProposalFor([h.address, h.locality].join(", ")),
        })),
      manualResearchAllowed: this.scope.manualResearchAllowed === true,
      updatePlanHash,
      approvedPlans,
      baselineCount,
      baselineStatus: baselineCount ? "partial" : "not-started",
      plan,
      planHash,
      maximumPerRequestMicros: openAiSearchMaximumMicros,
      fullPlanMaximumMicros: plan.steps.length * openAiSearchMaximumMicros,
      accountedMicros: spent?.micros ?? 0,
      coverage: plan.steps.map((s) => {
        const history = coverage.filter(
          (r) =>
            r.category === s.category &&
            r.subject_id === s.subjectId &&
            r.area === s.area,
        );
        const latest = history[0];
        const prior = c.market.records.filter(
          (r) =>
            r.categories.includes(s.category) &&
            (!["competitor", "property"].includes(s.category) ||
              r.context?.subjectId === s.subjectId),
        );
        const priorAt =
          prior
            .map((r) => r.lastCheckedAt)
            .sort()
            .at(-1) ?? null;
        return {
          ...s,
          label:
            s.category === "competitor"
              ? (c.config.competitors.find((h) => h.id === s.subjectId)?.name ??
                "Selected competitor")
              : s.category === "property"
                ? "Your hotel's public mentions"
                : s.category === "event"
                  ? "Upcoming and recurring events"
                  : s.category === "project"
                    ? "Active and announced projects"
                    : s.focus,
          outcome: latest?.outcome ?? (prior.length ? "partial" : "blocked"),
          lastCheckedAt: latest?.checked_at ?? priorAt,
          lastSuccessAt:
            history.find(
              (r) =>
                r.outcome === "complete" ||
                (r.outcome === "partial" &&
                  JSON.parse(r.document_json).items?.length),
            )?.checked_at ?? priorAt,
          gaps: latest
            ? JSON.parse(latest.document_json).gaps
            : [
                s.blocked ??
                  (prior.length
                    ? "Previously reviewed findings are available. This broader baseline task has not run; market coverage remains incomplete."
                    : "Baseline research has not covered this area."),
              ],
          sources: latest
            ? JSON.parse(latest.document_json).sources
            : prior
                .flatMap((r) =>
                  r.evidence.map((e) => ({ url: e.url, title: e.publisher })),
                )
                .filter(
                  (e, i, all) => all.findIndex((x) => x.url === e.url) === i,
                ),
        };
      }),
      jobs: jobs.map((j) => ({
        id: j.id,
        state: j.state,
        mode: j.mode,
        step: j.step,
        reviewId: j.review_id,
        brief: j.brief_json ? JSON.parse(j.brief_json) : null,
      })),
      schedulesEnabled: false,
      notificationsEnabled: false,
      message:
        "A new plan-specific source and spending approval is required. Existing pilot approvals cannot start this workflow.",
    };
  }
  private async start(
    mode: BlueprintPlan["mode"],
    approvalId: string,
    requestKey: string,
  ) {
    const existing = await this.query(
      "SELECT id FROM customer_blueprint_jobs WHERE tenant_id=? AND property_id=? AND request_key=?",
      requestKey,
    ).first();
    if (existing) return this.status();
    const c = await this.context();
    if (c.config.paused) throw new CustomerError("Research is paused.", 409);
    if (!c.profile.marketCenter || !c.profile.radiusMiles)
      throw new CustomerError(
        "Confirm the research area and radius first.",
        409,
      );
    if (mode === "update" && !c.market.records.some((r) => r.entity))
      throw new CustomerError(
        "Establish and approve market baseline entities before requesting updates.",
        409,
      );
    const plan = blueprintPlan(
      mode,
      c.configurationHash,
      c.area,
      c.config,
      c.identities,
      c.market,
    );
    const hash = await digest(JSON.stringify(plan));
    const approval = await this.query(
      "SELECT * FROM customer_blueprint_approvals WHERE tenant_id=? AND property_id=? AND id=?",
      approvalId,
    ).first<Approval>();
    if (
      !approval ||
      approval.plan_hash !== hash ||
      approval.expires_at <= this.now()
    )
      throw new CustomerError(
        "This exact research plan requires a new source and spending approval.",
        409,
      );
    await this.db
      .prepare(
        "INSERT INTO customer_blueprint_jobs(tenant_id,property_id,id,approval_id,request_key,actor,session_hash,mode,state,created_at,plan_json,plan_hash) VALUES(?,?,?,?,?,?,?,?,'running',?,?,?)",
      )
      .bind(
        this.scope.tenantId,
        this.scope.propertyId,
        crypto.randomUUID(),
        approvalId,
        requestKey,
        this.scope.actor,
        this.scope.sessionHash,
        mode,
        new Date(this.now()).toISOString(),
        JSON.stringify(plan),
        hash,
      )
      .run();
    return this.status();
  }
  private async advance(id: string) {
    const job = await this.query(
      "SELECT * FROM customer_blueprint_jobs WHERE tenant_id=? AND property_id=? AND id=?",
      id,
    ).first<Job>();
    if (!job) throw new CustomerError("Research job not found.", 404);
    if (job.state !== "running") return;
    const plan = JSON.parse(job.plan_json) as BlueprintPlan;
    if (job.step >= plan.steps.length) return this.finish(job, plan);
    const lease = crypto.randomUUID();
    const acquired = await this.db
      .prepare(
        "UPDATE customer_blueprint_jobs SET lease=?,lease_until=? WHERE tenant_id=? AND property_id=? AND id=? AND state='running' AND step=? AND lease_until<=? RETURNING id",
      )
      .bind(
        lease,
        this.now() + 120000,
        this.scope.tenantId,
        this.scope.propertyId,
        id,
        job.step,
        this.now(),
      )
      .first();
    if (!acquired)
      throw new CustomerError("A research step is already in progress.", 409);
    const step = plan.steps[job.step];
    const at = new Date(this.now()).toISOString();
    let result: StepResult = {
      outcome: "blocked",
      code: "NOT_RUN",
      gaps: [],
      sources: [],
      items: [],
      checkedAt: at,
    };
    try {
      const c = await this.context();
      if (c.config.paused || c.configurationHash !== plan.configurationHash)
        throw new SourceError("CONFIGURATION_CHANGED_OR_PAUSED");
      if (step.blocked) throw new SourceError("IDENTITY_CONFIRMATION_REQUIRED");
      const approval = await this.query(
        "SELECT * FROM customer_blueprint_approvals WHERE tenant_id=? AND property_id=? AND id=?",
        job.approval_id,
      ).first<Approval>();
      if (!approval || approval.expires_at <= this.now())
        throw new SourceError("APPROVAL_EXPIRED");
      const count = await this.query(
        "SELECT COUNT(*) AS n FROM customer_provider_calls WHERE tenant_id=? AND property_id=? AND job_id=?",
        id,
      ).first<{ n: number }>();
      if ((count?.n ?? 0) >= approval.max_calls)
        throw new SourceError("APPROVED_REQUEST_LIMIT");
      const domains = z
        .array(z.string())
        .min(1)
        .max(30)
        .parse(JSON.parse(approval.domains_json)[step.category]);
      if (!this.key) throw new SourceError("OPENAI_NOT_CONFIGURED");
      const ledger = new ProviderLedger(
        this.db,
        {
          tenantId: this.scope.tenantId,
          propertyId: this.scope.propertyId,
          jobId: id,
          month: at.slice(0, 7),
        },
        true,
        { lease, step: job.step, blueprint: true },
      );
      const sources = new BoundedSources(
        new OpenAIWebSearchTransport(this.key, this.fetcher),
        ledger,
        this.now,
        true,
      );
      const response = await searchWithOpenAI({
        sources,
        callKey: `step-${job.step}`,
        prompt: blueprintPrompt(plan, step, at.slice(0, 10)),
        allowedDomains: domains,
      });
      result.sources = response.sources;
      if (response.status !== "review-required")
        throw new SourceError("NO_VERIFIABLE_SOURCES");
      const start = response.text.indexOf("{");
      const end = response.text.lastIndexOf("}");
      const parsed = researchedItems.parse(
        JSON.parse(response.text.slice(start, end + 1)),
      );
      result.items = await normalizeBlueprintItems(
        parsed,
        step,
        response.citations.map((c) => c.url),
        at,
      );
      result.gaps = [
        ...parsed.gaps,
        "Search coverage is bounded and not an exhaustive market assessment. Source content and locality require review before publication.",
      ];
      result.outcome = "partial";
      result.code = result.items.length
        ? "PRIVATE_REVIEW_REQUIRED"
        : "NO_USABLE_FINDINGS";
    } catch (error) {
      result.outcome =
        error instanceof SourceError &&
        /REQUIRED|LIMIT|BUDGET|APPROVAL|PAUSED|CONFIGURED|SOURCE_NOT_APPROVED/.test(
          error.code,
        )
          ? "blocked"
          : "failed";
      result.code =
        error instanceof SourceError ? error.code : "RESEARCH_OUTPUT_INVALID";
      result.gaps = [
        step.blocked ?? result.code,
        ...(error instanceof SourceError &&
        typeof error.diagnostics?.rejectedHost === "string"
          ? [
              `Rejected source host: ${error.diagnostics.rejectedHost}. No access restriction was bypassed.`,
            ]
          : []),
        "This gap does not establish that no opportunities exist.",
      ];
    }
    await this.db
      .prepare(
        "INSERT INTO customer_blueprint_steps(tenant_id,property_id,job_id,step,area,category,subject_id,outcome,checked_at,document_json,lease) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        this.scope.tenantId,
        this.scope.propertyId,
        id,
        job.step,
        step.area,
        step.category,
        step.subjectId,
        result.outcome,
        at,
        JSON.stringify(result),
        lease,
      )
      .run();
    if (job.step + 1 === plan.steps.length)
      await this.finish({ ...job, step: job.step + 1 }, plan);
  }
  private async finish(job: Job, plan: BlueprintPlan) {
    const rows = await this.rows<{ document_json: string; category: string }>(
      "SELECT document_json,category FROM customer_blueprint_steps WHERE tenant_id=? AND property_id=? AND job_id=? ORDER BY step",
      job.id,
    );
    const results = rows.map((r) => JSON.parse(r.document_json) as StepResult);
    const items = results.flatMap((r) => r.items);
    const c = await this.context();
    const reviewId = `blueprint-${job.id}`;
    let noChange = false;
    if (items.length) {
      const batch = ingestionSchema.parse({
        batchKey: reviewId,
        researchMode: plan.mode,
        expectedRevision: c.revision,
        observedAt: results.at(-1)!.checkedAt,
        status: "Partial",
        categories: [...new Set(rows.map((r) => r.category))],
        warnings: [
          "Partial market coverage. Findings require source review; no automatic customer publication.",
        ],
        items,
      });
      const staged = await new ReviewedImports(this.db, this.now).execute(
        { ...this.scope, dataMode: "reviewed" },
        { operation: "stage", batch },
      );
      const run = staged.run as { newIds: string[]; changedIds: string[] };
      noChange = run.newIds.length === 0 && run.changedIds.length === 0;
    }
    const brief = {
      title: "Partial market briefing — private review",
      mode: plan.mode,
      coverage: "incomplete",
      existingContext: c.market.records.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        sources: r.evidence.map((e) => e.url),
      })),
      proposed: items.map((i) => ({
        category: i.candidate.kind,
        title: i.candidate.name,
        fact: i.summary,
        inference: i.assessment.inference,
        nextStep: i.assessment.rationale,
        unknowns: i.assessment.unknowns,
        sources: i.candidate.sources.map((s) => s.url),
        discovery:
          plan.mode === "baseline"
            ? "Established context; first checked by SCOUT"
            : "Discovered during update; not necessarily new activity",
      })),
      gaps: results.flatMap((r) => r.gaps),
    };
    await this.db
      .prepare(
        "UPDATE customer_blueprint_jobs SET state=?,review_id=?,brief_json=? WHERE tenant_id=? AND property_id=? AND id=? AND state='running' AND step=?",
      )
      .bind(
        noChange
          ? "no-change"
          : items.length
            ? "partial"
            : results.every((r) => r.outcome === "blocked")
              ? "blocked"
              : "failed",
        items.length ? reviewId : null,
        JSON.stringify(brief),
        this.scope.tenantId,
        this.scope.propertyId,
        job.id,
        plan.steps.length,
      )
      .run();
  }
}

export async function normalizeBlueprintItems(
  parsed: z.infer<typeof researchedItems>,
  step: ResearchStep,
  citedUrls: string[],
  at: string,
): Promise<Ingestion["items"]> {
  const items: Ingestion["items"] = [];
  for (const r of parsed.items) {
    if (r.sourceUrls.some((u) => !citedUrls.includes(u)))
      throw new SourceError("ITEM_SOURCE_NOT_CITED");
    if (
      step.category === "event" &&
      (!r.start ||
        !r.venue ||
        !r.organizer ||
        (r.end ?? r.start) < at.slice(0, 10))
    )
      throw new SourceError("EVENT_OCCURRENCE_UNVERIFIED_OR_STALE");
    if (["competitor", "property"].includes(step.category)) {
      const street = step.identity?.address.match(/^\d+/)?.[0];
      if (!step.identity || !street || !r.localAddress.includes(street))
        throw new SourceError("PROPERTY_ADDRESS_MATCH_UNVERIFIED");
    }
    if (
      step.category === "corporate" &&
      !r.sourceUrls.some(
        (url) => new URL(url).hostname === new URL(r.website).hostname,
      )
    )
      throw new SourceError("ENTITY_WEBSITE_NOT_SOURCED");
    const facts = {
      activity:
        step.category === "event"
          ? ("event" as const)
          : step.category === "project"
            ? ("construction" as const)
            : ("facility" as const),
      status: r.stage,
      start: r.start,
      end: r.end,
      venue: r.venue,
      contractor: r.contractor,
      organizations: [r.organizer ?? r.name],
    };
    const sources = r.sourceUrls.map((url) => ({
      url,
      publisher: new URL(url).hostname,
      publishedAt: r.publishedAt,
      claims: Object.entries(facts)
        .filter(([, value]) => value !== null)
        .map(([field]) => ({
          field: field as keyof typeof facts,
          quote: "AI summary for source review (not a quotation): " + r.fact,
        })),
    }));
    const context = ["property", "competitor"].includes(step.category)
      ? {
          subjectId: step.subjectId,
          sourceClass: "official" as const,
          originId: r.sourceUrls[0],
          match: "confirmed" as const,
          matchReason: `Research was scoped to the owner-confirmed identity at ${step.identity?.address}; source matching still requires publication review.`,
          sentiment: "unclear" as const,
          sentimentReason: "No sentiment inferred automatically.",
          relatedIdentity: step.identity?.name ?? null,
          excerpt: r.fact.slice(0, 500),
        }
      : undefined;
    items.push({
      candidate: {
        kind: step.category,
        categories: [step.category],
        name: r.name,
        location: r.localAddress,
        identity: r.name,
        edition: step.category === "event" ? r.start : null,
        facts,
        sources,
        ...(step.category === "corporate"
          ? {
              entity: {
                type: r.type,
                website: r.website,
                localAddress: r.localAddress,
                localOperation: r.fact,
                locationSourceUrls: r.sourceUrls,
                knownDates: [
                  ...(r.start
                    ? [
                        {
                          label: "Start",
                          value: r.start,
                          sourceUrl: r.sourceUrls[0],
                        },
                      ]
                    : []),
                  ...(r.end
                    ? [
                        {
                          label: "End",
                          value: r.end,
                          sourceUrl: r.sourceUrls[0],
                        },
                      ]
                    : []),
                ],
              },
            }
          : {}),
      },
      ...(context ? { context } : {}),
      summary: r.fact,
      assessment: {
        inference: r.inference,
        rationale: r.nextStep,
        unknowns: r.unknowns,
      },
      receipts: await Promise.all(
        sources.map(async (s) => ({
          url: s.url,
          retrievedAt: at,
          contentHash: await digest(
            JSON.stringify({ url: s.url, summary: r.fact }),
          ),
          basis: "provider-citation" as const,
        })),
      ),
    });
  }
  return items;
}
