import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { demoSchema } from "./schema";
import { ResearchStore, researchSchema } from "../research/store";
import { replaySchema } from "../research/contracts";
import {
  SubscriptionStore,
  subscriptionSchema,
} from "../research/subscription";
import { replay } from "../research/engine";
import {
  assessments,
  defaultCoverage,
  demoProfile,
  findings,
  runs,
} from "../lib/fixtures";
import {
  mutationSchema,
  type Assessment,
  type Finding,
  type Mutation,
  type ResearchRun,
  type Workspace,
} from "../lib/contracts";

export class AccessError extends Error {
  constructor(
    message = "Access unavailable.",
    public status = 403,
  ) {
    super(message);
  }
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export class DemoRepository {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout = 5000;");
    this.db.exec(demoSchema);
    this.db.exec(researchSchema);
    this.db.exec(subscriptionSchema);
    const insert = this.db.prepare(
      "INSERT INTO public_findings VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET entity_id=excluded.entity_id,record_json=excluded.record_json",
    );
    for (const f of findings) insert.run(f.id, f.entityId, JSON.stringify(f));
  }
  createSession(
    now = Date.now(),
    role: "demo_admin" | "demo_viewer" = "demo_admin",
  ) {
    // Expiration is fixed at seven days. Delete expired private properties on each new session.
    this.db
      .prepare(
        "DELETE FROM properties WHERE NOT EXISTS (SELECT 1 FROM sessions s WHERE s.tenant_id=properties.tenant_id AND s.property_id=properties.property_id AND s.expires_at>?)",
      )
      .run(now);
    const token = randomBytes(32).toString("hex");
    const tenant = `demo-${randomUUID()}`,
      property = `demo-${randomUUID()}`;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("INSERT INTO properties VALUES (?,?,?,?,0)")
        .run(
          tenant,
          property,
          JSON.stringify(demoProfile),
          JSON.stringify(defaultCoverage),
        );
      this.db
        .prepare("INSERT INTO sessions VALUES (?,?,?,?,?)")
        .run(
          tokenHash(token),
          tenant,
          property,
          now + 7 * 24 * 60 * 60 * 1000,
          role,
        );
      const assessment = this.db.prepare(
        "INSERT INTO assessments VALUES (?,?,?,?)",
      );
      for (const a of assessments)
        assessment.run(tenant, property, a.findingId, JSON.stringify(a));
      const run = this.db.prepare(
        "INSERT INTO research_runs VALUES (?,?,?,?,?)",
      );
      for (const r of runs)
        run.run(tenant, property, r.id, r.cycleKey, JSON.stringify(r));
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return token;
  }
  private context(token: string, now = Date.now()) {
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new AccessError("Open a new fictional demo to continue.", 401);
    const ctx = this.db
      .prepare(
        "SELECT tenant_id,property_id,role FROM sessions WHERE token_hash=? AND expires_at>?",
      )
      .get(tokenHash(token), now) as
      { tenant_id: string; property_id: string; role: string } | undefined;
    if (!ctx)
      throw new AccessError("Your demo session expired. Open a new demo.", 401);
    return ctx;
  }
  read(token: string): Workspace {
    const c = this.context(token);
    const research = new ResearchStore(this.db, c);
    const p = this.db
      .prepare("SELECT * FROM properties WHERE tenant_id=? AND property_id=?")
      .get(c.tenant_id, c.property_id) as {
      profile_json: string;
      coverage_json: string;
      setup_step: number;
    };
    const rows = this.db
      .prepare(
        `SELECT f.record_json,a.assessment_json,COALESCE(s.saved,0) saved,COALESCE(s.dismissed,0) dismissed
      FROM assessments a JOIN public_findings f ON f.id=a.finding_id
      LEFT JOIN private_state s ON s.tenant_id=a.tenant_id AND s.property_id=a.property_id AND s.finding_id=a.finding_id
      WHERE a.tenant_id=? AND a.property_id=? ORDER BY f.rowid`,
      )
      .all(c.tenant_id, c.property_id) as {
      record_json: string;
      assessment_json: string;
      saved: number;
      dismissed: number;
    }[];
    const runRows = this.db
      .prepare(
        "SELECT record_json FROM research_runs WHERE tenant_id=? AND property_id=? ORDER BY rowid",
      )
      .all(c.tenant_id, c.property_id) as { record_json: string }[];
    return {
      mode: "demo",
      profile: JSON.parse(p.profile_json),
      coverage: JSON.parse(p.coverage_json),
      setupStep: p.setup_step,
      findings: [
        ...research.views(),
        ...rows.map((r) => ({
          ...(JSON.parse(r.record_json) as Finding),
          ...(JSON.parse(r.assessment_json) as Assessment),
          saved: Boolean(r.saved),
          dismissed: Boolean(r.dismissed),
        })),
      ],
      runs: [
        ...research.runs(),
        ...runRows.map((r) => JSON.parse(r.record_json) as ResearchRun),
      ],
    };
  }
  mutate(token: string, input: Mutation) {
    const m = mutationSchema.parse(input),
      c = this.context(token);
    if (c.role !== "demo_admin")
      throw new AccessError("This action requires administrator access.");
    if (m.action === "state") {
      if (
        new ResearchStore(this.db, c).state(m.findingId, m.saved, m.dismissed)
      )
        return this.read(token);
      const exists = this.db
        .prepare(
          "SELECT 1 FROM assessments WHERE tenant_id=? AND property_id=? AND finding_id=?",
        )
        .get(c.tenant_id, c.property_id, m.findingId);
      if (!exists)
        throw new AccessError("Finding not found in your property.", 404);
      this.db
        .prepare(
          "INSERT INTO private_state VALUES (?,?,?,?,?) ON CONFLICT(tenant_id,property_id,finding_id) DO UPDATE SET saved=excluded.saved,dismissed=excluded.dismissed",
        )
        .run(
          c.tenant_id,
          c.property_id,
          m.findingId,
          Number(m.saved),
          Number(m.dismissed),
        );
    } else if (m.action === "profile") {
      this.db
        .prepare(
          "UPDATE properties SET profile_json=? WHERE tenant_id=? AND property_id=?",
        )
        .run(JSON.stringify(m.profile), c.tenant_id, c.property_id);
    } else if (m.action === "coverage") {
      // Transaction prevents concurrent category edits from overwriting each other.
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const coverage = this.read(token).coverage;
        coverage[m.category] = { notes: m.notes, paused: m.paused };
        this.db
          .prepare(
            "UPDATE properties SET coverage_json=? WHERE tenant_id=? AND property_id=?",
          )
          .run(JSON.stringify(coverage), c.tenant_id, c.property_id);
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    } else {
      const current = this.read(token);
      if (m.step > current.setupStep + 1)
        throw new AccessError("Complete the preceding setup step.", 400);
      if (m.step > 0 && !current.profile.confirmed)
        throw new AccessError(
          "Confirm the hotel profile before continuing.",
          400,
        );
      this.db
        .prepare(
          "UPDATE properties SET setup_step=? WHERE tenant_id=? AND property_id=?",
        )
        .run(m.step, c.tenant_id, c.property_id);
    }
    return this.read(token);
  }
  revoke(token: string) {
    const c = this.context(token);
    this.db
      .prepare("DELETE FROM properties WHERE tenant_id=? AND property_id=?")
      .run(c.tenant_id, c.property_id);
  }
  replay(token: string, input: unknown) {
    const c = this.context(token);
    if (c.role !== "demo_admin")
      throw new AccessError("Fixture replay requires administrator access.");
    const request = replaySchema.parse(input);
    const profile = this.read(token).profile;
    try {
      const store = new ResearchStore(this.db, c);
      store.transaction(() => {
        if (
          this.db
            .prepare(
              "SELECT 1 FROM fixture_jobs WHERE tenant_id=? AND property_id=? AND state IN ('queued','running')",
            )
            .get(c.tenant_id, c.property_id)
        )
          throw Error(
            "Finish queued fixture jobs before using the direct replay workbench.",
          );
        const configured = this.db
          .prepare(
            "SELECT 1 FROM fixture_subscriptions WHERE tenant_id=? AND property_id=?",
          )
          .get(c.tenant_id, c.property_id);
        if (
          configured &&
          !new SubscriptionStore(this.db, c).eligible(Date.now())
        )
          throw Error("The fictional subscription is paused or not entitled.");
        replay(store, profile, request.scenario, request.cycleKey);
      });
    } catch (error) {
      throw new AccessError(
        error instanceof Error ? error.message : "Synthetic replay failed.",
        409,
      );
    }
    return this.read(token);
  }
  subscription(token: string, input?: unknown) {
    const c = this.context(token);
    if (c.role !== "demo_admin")
      throw new AccessError(
        "Subscription controls require administrator access.",
      );
    const store = new SubscriptionStore(this.db, c);
    if (input === undefined) return store.view(this.read(token).profile);
    try {
      return store.command(input, this.read(token));
    } catch (error) {
      throw new AccessError(
        error instanceof Error ? error.message : "Fixture command failed.",
        400,
      );
    }
  }
  close() {
    this.db.close();
  }
}
