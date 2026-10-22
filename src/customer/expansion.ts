import { CustomerError } from "./contracts";
import { SourceError } from "../research/source-adapters";
import { type Database, digest } from "./store";
import { MarketIngestion } from "./ingestion";
import {
  marketCategories,
  storedMarket,
  type StoredMarket,
} from "./market-contracts";
import {
  expansionCommand,
  emptyConfiguration,
  briefSchema,
  type Brief,
  type ExpansionConfiguration,
  type ExpansionCommand,
  type Outcome,
} from "./expansion-contracts";
import {
  fixtureExpansionProvider,
  type ExpansionProvider,
} from "./expansion-provider";
export type ExpansionScope = {
  tenantId: string;
  propertyId: string;
  actor: string;
  sessionHash: string;
  role: string;
};
type ConfigDocument = ExpansionConfiguration & {
  memberships: Record<
    string,
    {
      createdAt: string;
      updatedAt: string;
      version: number;
      history?: {
        at: string;
        active: boolean;
        name: string;
        address: string;
        domain: string;
      }[];
    }
  >;
};
type JobDocument = {
  config: ConfigDocument;
  configRevision: number;
  scenario: Extract<ExpansionCommand, { action: "start" }>["scenario"];
  outcomes: Outcome[];
  reason: string | null;
};
type Job = {
  id: string;
  state: string;
  request_key: string;
  compatibility: string;
  created_at: string;
  finished_at: string | null;
  reserved: number;
  spent: number;
  step: number;
  lease: string | null;
  lease_until: number;
  document_json: string;
};
export const fixtureBudget = {
  jobUnits: 6,
  monthlyUnits: 120,
  maxRuntimeMs: 120000,
  maxJobs: 200,
} as const;
export class Expansion {
  constructor(
    private db: Database,
    private scope: ExpansionScope,
    private fixtures = false,
    private now: () => number = Date.now,
    private provider: ExpansionProvider = fixtureExpansionProvider,
  ) {}
  private bind() {
    return [this.scope.tenantId, this.scope.propertyId];
  }
  private async config() {
    const row = await this.db
      .prepare(
        "SELECT revision,document_json FROM customer_expansion_config WHERE tenant_id=? AND property_id=?",
      )
      .bind(...this.bind())
      .first<{ revision: number; document_json: string }>();
    return {
      revision: row?.revision ?? 0,
      config: row
        ? (JSON.parse(row.document_json) as ConfigDocument)
        : { ...structuredClone(emptyConfiguration), memberships: {} },
    };
  }
  private fixtureScope() {
    return (
      this.fixtures &&
      this.scope.tenantId.startsWith("fixture_") &&
      this.scope.propertyId.startsWith("fixture_")
    );
  }
  private async market() {
    const row = await this.db
      .prepare(
        "SELECT revision,document_json,data_mode FROM customer_markets WHERE tenant_id=? AND property_id=?",
      )
      .bind(...this.bind())
      .first<{ revision: number; document_json: string; data_mode: string }>();
    return {
      revision: row?.revision ?? 0,
      mode: row?.data_mode ?? null,
      document: row
        ? storedMarket.parse(JSON.parse(row.document_json))
        : ({ records: [], assessments: {}, runs: [] } as StoredMarket),
    };
  }
  async execute(raw: unknown) {
    const input = expansionCommand.parse(raw);
    if (input.action === "read") return this.read(input.briefId);
    if (this.scope.role === "viewer")
      throw new CustomerError(
        "Your account can view this workspace but cannot change it.",
        403,
      );
    if (input.action === "configure") await this.configure(input);
    if (input.action === "start") await this.start(input);
    if (input.action === "advance") await this.advance(input.jobId);
    return this.read();
  }
  async read(briefId?: string) {
    const config = await this.config();
    const rows = await this.db
      .prepare(
        "SELECT json_group_array(json_object('id',id,'state',state,'createdAt',created_at,'finishedAt',finished_at,'step',step,'spent',spent,'reserved',reserved,'document',json(document_json))) AS data FROM (SELECT * FROM customer_refresh_jobs WHERE tenant_id=? AND property_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20)",
      )
      .bind(...this.bind())
      .first<{ data: string }>();
    const history = await this.db
      .prepare(
        "SELECT json_group_array(json_object('id',id,'version',version,'createdAt',created_at,'status',json_extract(document_json,'$.status'))) AS data FROM (SELECT * FROM customer_briefings WHERE tenant_id=? AND property_id=? ORDER BY version DESC LIMIT 50)",
      )
      .bind(...this.bind())
      .first<{ data: string }>();
    const brief = await this.db
      .prepare(
        `SELECT document_json FROM customer_briefings WHERE tenant_id=? AND property_id=? ${briefId ? "AND id=?" : ""} ORDER BY version DESC LIMIT 1`,
      )
      .bind(...this.bind(), ...(briefId ? [briefId] : []))
      .first<{ document_json: string }>();
    if (briefId && !brief)
      throw new CustomerError("Briefing unavailable.", 404);
    const budget = await this.db
      .prepare(
        "SELECT COALESCE(SUM(spent),0) AS used,COALESCE(SUM(reserved),0) AS held FROM customer_refresh_jobs WHERE tenant_id=? AND property_id=? AND month=?",
      )
      .bind(...this.bind(), new Date(this.now()).toISOString().slice(0, 7))
      .first<{ used: number; held: number }>();
    return {
      ...config,
      fixturesEnabled: this.fixtureScope(),
      jobs: JSON.parse(rows?.data ?? "[]") as {
        id: string;
        state: string;
        createdAt: string;
        finishedAt: string | null;
        step: number;
        spent: number;
        reserved: number;
        document: JobDocument;
      }[],
      history: JSON.parse(history?.data ?? "[]") as {
        id: string;
        version: number;
        createdAt: string;
        status: string;
      }[],
      brief: brief ? briefSchema.parse(JSON.parse(brief.document_json)) : null,
      budget: { ...budget, limit: fixtureBudget.monthlyUnits, actualUsd: 0 },
      researchEnabled: false,
      paidCallsEnabled: false,
      notificationsEnabled: false,
      scheduledResearchEnabled: false,
    };
  }
  private async configure(
    input: Extract<ExpansionCommand, { action: "configure" }>,
  ) {
    const previous = await this.config();
    if (input.revision !== previous.revision)
      throw new CustomerError(
        "Hotel research settings changed. Reload before saving.",
        409,
      );
    const at = new Date(this.now()).toISOString();
    const config: ConfigDocument = {
      ...input.config,
      memberships: { ...previous.config.memberships },
    };
    // Removing a member retires it; history and IDs survive future configuration edits.
    for (const old of previous.config.competitors)
      if (!config.competitors.some((c) => c.id === old.id))
        config.competitors.push({ ...old, active: false });
    if (config.competitors.length > 25)
      throw new CustomerError(
        "Configuration storage limit reached. Retain existing IDs or request an archive review.",
        413,
      );
    for (const c of config.competitors) {
      const old = previous.config.competitors.find((o) => o.id === c.id);
      const meta = config.memberships[c.id];
      config.memberships[c.id] = {
        createdAt: meta?.createdAt ?? at,
        updatedAt:
          JSON.stringify(old) === JSON.stringify(c)
            ? (meta?.updatedAt ?? at)
            : at,
        version:
          (meta?.version ?? 0) +
          (JSON.stringify(old) === JSON.stringify(c) ? 0 : 1),
        history: [
          ...(meta?.history ?? []),
          ...(JSON.stringify(old) !== JSON.stringify(c)
            ? [
                {
                  at,
                  active: c.active,
                  name: c.name,
                  address: c.address,
                  domain: c.domain,
                },
              ]
            : []),
        ],
      };
      if ((config.memberships[c.id].history?.length ?? 0) > 100)
        throw new CustomerError(
          "Competitor history limit reached; archive review required.",
          413,
        );
    }
    const row = await this.db
      .prepare(
        `INSERT INTO customer_expansion_config(tenant_id,property_id,revision,document_json,actor,session_hash,updated_at) VALUES(?,?,1,?,?,?,?) ON CONFLICT(tenant_id,property_id) DO UPDATE SET revision=revision+1,document_json=excluded.document_json,actor=excluded.actor,session_hash=excluded.session_hash,updated_at=excluded.updated_at WHERE revision=? RETURNING revision`,
      )
      .bind(
        ...this.bind(),
        JSON.stringify(config),
        this.scope.actor,
        this.scope.sessionHash,
        at,
        input.revision,
      )
      .first();
    if (!row)
      throw new CustomerError(
        "Hotel research settings changed. Reload before saving.",
        409,
      );
  }
  private async start(input: Extract<ExpansionCommand, { action: "start" }>) {
    const conf = await this.config();
    const compatibility = await digest(
      JSON.stringify([conf.revision, input.scenario, marketCategories]),
    );
    const replay = await this.db
      .prepare(
        "SELECT job_id,compatibility FROM customer_refresh_requests WHERE tenant_id=? AND property_id=? AND request_key=?",
      )
      .bind(...this.bind(), input.requestKey)
      .first<{ job_id: string; compatibility: string }>();
    if (replay) {
      if (replay.compatibility !== compatibility)
        throw new CustomerError(
          "Request key was already used for different settings.",
          409,
        );
      return;
    }
    const original = await this.db
      .prepare(
        "SELECT id,compatibility FROM customer_refresh_jobs WHERE tenant_id=? AND property_id=? AND request_key=?",
      )
      .bind(...this.bind(), input.requestKey)
      .first<{ id: string; compatibility: string }>();
    if (original) {
      if (original.compatibility !== compatibility)
        throw new CustomerError(
          "Request key was already used for different settings.",
          409,
        );
      return;
    }
    const active = await this.active();
    if (active) {
      await this.join(input.requestKey, compatibility, active);
      return;
    }
    const count = await this.db
      .prepare(
        "SELECT count(*) AS n FROM customer_refresh_jobs WHERE tenant_id=? AND property_id=?",
      )
      .bind(...this.bind())
      .first<{ n: number }>();
    if ((count?.n ?? 0) >= fixtureBudget.maxJobs)
      throw new CustomerError(
        "Refresh history storage limit reached; archive review required.",
        413,
      );
    const market = await this.market();
    let reason: string | null = null;
    if (!this.fixtureScope() || market.mode !== "synthetic")
      reason =
        "LIVE_DISABLED: Research access and approved live-source budgets are not enabled. Stored findings remain available.";
    else if (conf.config.paused)
      reason = "PROPERTY_PAUSED: Research is paused for this hotel.";
    else if (
      ![
        conf.config.own.name,
        conf.config.own.address,
        conf.config.own.locality,
        conf.config.own.domain,
      ].every(Boolean)
    )
      reason =
        "IDENTITY_REQUIRED: Add your hotel's name, address, locality and official domain before a fixture refresh.";
    else if (
      !conf.config.competitors.some((c) => c.active) ||
      conf.config.competitors.some(
        (c) =>
          c.active && ![c.name, c.address, c.locality, c.domain].every(Boolean),
      )
    )
      reason =
        "COMP_SET_REQUIRED: Select at least one competitor with its name, address, locality and official domain.";
    const at = new Date(this.now()).toISOString(),
      id = crypto.randomUUID();
    const doc: JobDocument = {
      config: conf.config,
      configRevision: conf.revision,
      scenario: input.scenario,
      outcomes: [],
      reason,
    };
    const insert = async () =>
      this.db
        .prepare(
          "INSERT INTO customer_refresh_jobs(tenant_id,property_id,id,request_key,compatibility,actor,session_hash,state,created_at,finished_at,month,reserved,monthly_limit,document_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          ...this.bind(),
          id,
          input.requestKey,
          compatibility,
          this.scope.actor,
          this.scope.sessionHash,
          doc.reason ? "blocked" : "queued",
          at,
          doc.reason ? at : null,
          at.slice(0, 7),
          doc.reason ? 0 : fixtureBudget.jobUnits,
          fixtureBudget.monthlyUnits,
          JSON.stringify(doc),
        )
        .run();
    try {
      await insert();
    } catch (e) {
      if (String(e).includes("expansion_budget_exceeded")) {
        doc.reason =
          "BUDGET_EXHAUSTED: The fixture allowance is exhausted. No provider work was dispatched.";
        await insert();
      } else {
        const raced = await this.active();
        if (raced) {
          await this.join(input.requestKey, compatibility, raced);
          return;
        }
        throw e;
      }
    }
    await this.join(input.requestKey, compatibility, { id, compatibility });
  }
  private async active() {
    return this.db
      .prepare(
        "SELECT id,compatibility FROM customer_refresh_jobs WHERE tenant_id=? AND property_id=? AND state IN('queued','running')",
      )
      .bind(...this.bind())
      .first<{ id: string; compatibility: string }>();
  }
  private async join(
    key: string,
    compatibility: string,
    job: { id: string; compatibility: string },
  ) {
    if (job.compatibility !== compatibility)
      throw new CustomerError(
        "Another refresh is in progress with different settings. Finish it before starting this request.",
        409,
      );
    await this.db
      .prepare(
        "INSERT INTO customer_refresh_requests(tenant_id,property_id,request_key,job_id,compatibility) VALUES(?,?,?,?,?) ON CONFLICT(tenant_id,property_id,request_key) DO NOTHING",
      )
      .bind(...this.bind(), key, job.id, compatibility)
      .run();
    const resolved = await this.db
      .prepare(
        "SELECT compatibility FROM customer_refresh_requests WHERE tenant_id=? AND property_id=? AND request_key=?",
      )
      .bind(...this.bind(), key)
      .first<{ compatibility: string }>();
    if (resolved?.compatibility !== compatibility)
      throw new CustomerError("Request key conflict.", 409);
  }
  private async advance(id: string) {
    if (!this.fixtureScope())
      throw new CustomerError(
        "Fixture refresh is disabled for this account.",
        403,
      );
    const current = await this.config();
    if (current.config.paused) {
      await this.db
        .prepare(
          "UPDATE customer_refresh_jobs SET state='blocked',reserved=0,finished_at=?,actor=?,session_hash=?,document_json=json_set(document_json,'$.reason','PROPERTY_PAUSED: No further dispatches are allowed.') WHERE tenant_id=? AND property_id=? AND id=? AND state IN('queued','running')",
        )
        .bind(
          new Date(this.now()).toISOString(),
          this.scope.actor,
          this.scope.sessionHash,
          ...this.bind(),
          id,
        )
        .run();
      return;
    }
    const fence = crypto.randomUUID(),
      now = this.now();
    await this.db
      .prepare(
        "UPDATE customer_refresh_jobs SET state='failed',reserved=0,finished_at=?,actor=?,session_hash=?,document_json=json_set(document_json,'$.reason','RETRY_LIMIT: Refresh could not finish within three bounded attempts. Previously saved findings remain available.') WHERE tenant_id=? AND property_id=? AND id=? AND state IN('queued','running') AND lease_until<=? AND attempts>=3",
      )
      .bind(
        new Date(now).toISOString(),
        this.scope.actor,
        this.scope.sessionHash,
        ...this.bind(),
        id,
        now,
      )
      .run();
    const job = await this.db
      .prepare(
        "UPDATE customer_refresh_jobs SET state='running',attempts=attempts+1,lease=?,lease_until=?,actor=?,session_hash=? WHERE tenant_id=? AND property_id=? AND id=? AND state IN('queued','running') AND lease_until<=? AND attempts<3 RETURNING *",
      )
      .bind(
        fence,
        now + fixtureBudget.maxRuntimeMs,
        this.scope.actor,
        this.scope.sessionHash,
        ...this.bind(),
        id,
        now,
      )
      .first<Job>();
    if (!job) {
      const existing = await this.db
        .prepare(
          "SELECT id FROM customer_refresh_jobs WHERE tenant_id=? AND property_id=? AND id=?",
        )
        .bind(...this.bind(), id)
        .first();
      if (!existing) throw new CustomerError("Refresh unavailable.", 404);
      return;
    }
    const doc = JSON.parse(job.document_json) as JobDocument;
    if (job.step === 5) {
      await this.finish(job, doc, fence);
      return;
    }
    const category = marketCategories[job.step],
      at = new Date(this.now()).toISOString();
    let market = await this.market();
    const lastSuccessAt =
      market.document.runs
        .filter(
          (r) => r.categories.includes(category) && r.status === "Completed",
        )
        .at(-1)?.at ?? null;
    const outcome: Outcome = {
      category,
      status: "complete",
      code: "FIXTURE_OK",
      message:
        "Bounded fictional source coverage only; no live search was performed.",
      checkedAt: at,
      lastSuccessAt,
      newIds: [],
      changedIds: [],
    };
    if (
      this.provider === fixtureExpansionProvider &&
      (doc.scenario === "failed" ||
        (doc.scenario === "partial" && category === "competitor"))
    ) {
      outcome.status = "failed";
      outcome.code = "SOURCE_UNAVAILABLE";
      outcome.message =
        "Simulated source unavailable. Coverage is incomplete; this does not mean there were no changes.";
    } else {
      try {
        const batchKey = `expansion_${id}_${category}`;
        // A committed batch is the durable checkpoint if a worker stopped before writing its job outcome.
        const completed = market.document.runs.find(
          (r) => r.batchKey === batchKey,
        );
        if (!completed) {
          if (this.provider.mode !== "synthetic")
            throw new CustomerError("Live research remains disabled.", 403);
          const items = await this.provider.research({
            jobId: id,
            category,
            config: doc.config,
            propertyId: this.scope.propertyId,
            scenario: doc.scenario,
            at,
          });
          await new MarketIngestion(this.db, this.now).ingest(
            {
              ...this.scope,
              dataMode: "synthetic",
              jobGuard: { id, lease: fence },
            },
            {
              batchKey,
              expectedRevision: market.revision,
              observedAt: at,
              status: "Completed",
              categories: [category],
              warnings: [],
              items,
            },
          );
          market = await this.market();
        }
        const run = market.document.runs.find((r) => r.batchKey === batchKey)!;
        outcome.newIds = run.newIds;
        outcome.changedIds = run.changedIds;
        outcome.checkedAt = run.at;
        outcome.lastSuccessAt = run.at;
        if (run.status !== "Completed") {
          outcome.status = "partial";
          outcome.code = "EVIDENCE_CONFLICT";
          outcome.message = run.warnings.join(" ");
        } else if (
          (category === "property" && doc.scenario === "ambiguous") ||
          market.document.records.some(
            (f) =>
              f.categories.includes(category) &&
              f.lastCheckedAt === run.at &&
              f.context &&
              f.context.match !== "confirmed",
          )
        ) {
          outcome.status = "partial";
          outcome.code = "IDENTITY_AMBIGUOUS";
          outcome.message =
            "A similar-name mention was held for identity review and excluded from confident briefing claims.";
        } else if (!run.newIds.length && !run.changedIds.length) {
          outcome.status = "no-change";
          outcome.code = "NO_MATERIAL_CHANGE";
          outcome.message =
            "No material changes found in the checked fixture sources. Existing findings remain ongoing context.";
        }
      } catch (error) {
        if (!(error instanceof SourceError)) throw error;
        outcome.status = "failed";
        outcome.code = error.code;
        outcome.message =
          "Source check could not complete. Prior findings remain available; this is not a zero-findings result.";
      }
    }
    doc.outcomes.push(outcome);
    await this.db
      .prepare(
        "UPDATE customer_refresh_jobs SET step=step+1,attempts=0,spent=spent+1,reserved=reserved-1,document_json=?,lease=NULL,lease_until=0 WHERE tenant_id=? AND property_id=? AND id=? AND lease=? AND step=? AND reserved>1",
      )
      .bind(JSON.stringify(doc), ...this.bind(), id, fence, job.step)
      .run();
  }
  private async finish(job: Job, doc: JobDocument, fence: string) {
    const usable = doc.outcomes.filter(
      (o) =>
        o.status === "complete" ||
        o.status === "no-change" ||
        o.status === "partial",
    );
    const at = new Date(this.now()).toISOString();
    if (!usable.length) {
      await this.db
        .prepare(
          "UPDATE customer_refresh_jobs SET state='failed',finished_at=?,reserved=0,lease=NULL,lease_until=0 WHERE tenant_id=? AND property_id=? AND id=? AND lease=?",
        )
        .bind(at, ...this.bind(), job.id, fence)
        .run();
      return;
    }
    const market = await this.market();
    const latest = await this.db
      .prepare(
        "SELECT COALESCE(MAX(version),0) AS version FROM customer_briefings WHERE tenant_id=? AND property_id=?",
      )
      .bind(...this.bind())
      .first<{ version: number }>();
    const brief = makeBrief(
      market.document,
      doc,
      job,
      at,
      fence,
      (latest?.version ?? 0) + 1,
    );
    // Insert and terminal job transition are one SQLite transaction via the migration trigger.
    await this.db
      .prepare(
        "INSERT INTO customer_briefings(tenant_id,property_id,id,job_id,version,created_at,document_json) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        ...this.bind(),
        brief.id,
        job.id,
        brief.version,
        at,
        JSON.stringify(brief),
      )
      .run();
  }
}
export type ExpansionState = Awaited<ReturnType<Expansion["read"]>>;
export function makeBrief(
  market: StoredMarket,
  doc: JobDocument,
  job: Pick<Job, "id" | "spent">,
  at: string,
  fence: string,
  version: number,
): Brief {
  const changed = new Set(
    doc.outcomes.flatMap((o) => [...o.newIds, ...o.changedIds]),
  );
  const active = new Set(
    doc.config.competitors.filter((c) => c.active).map((c) => c.id),
  );
  const records = market.records
    .filter(
      (f) =>
        f.quality !== "Conflicting evidence" &&
        (!f.context ||
          (f.context.match === "confirmed" &&
            (f.categories.includes("property") ||
              active.has(f.context.subjectId)))),
    )
    .map((f) => ({
      ...structuredClone(f),
      assessment: market.assessments[f.id],
    }));
  const headings = [
    "Prospecting developments",
    "Competitor activity",
    "Your hotel's public mentions",
  ];
  const sections = headings.map((heading, index) => ({
    heading,
    items: records
      .filter((f) =>
        index === 0
          ? !f.context
          : index === 1
            ? f.categories.includes("competitor")
            : f.categories.includes("property"),
      )
      .map((f) => {
        const v = f.versions.at(-1)!;
        return {
          findingId: f.id,
          version: f.versions.length,
          evidenceIds: v.evidenceIds,
          statement: f.summary,
          implication: f.assessment.inference,
          unknowns: f.assessment.unknowns,
          ongoing: !changed.has(f.id),
        };
      }),
  }));
  const connections: Brief["connections"] = [];
  for (const f of records) {
    if (!f.context?.relatedIdentity) continue;
    const related = records.find(
      (r) => !r.context && JSON.parse(r.key)[1] === f.context!.relatedIdentity,
    );
    if (related)
      connections.push({
        findingIds: [f.id, related.id],
        explanation:
          "These observations refer to the same underlying event. Treat them as one event, not two independent opportunities.",
      });
  }
  const status = doc.outcomes.some((o) =>
    ["failed", "blocked", "partial"].includes(o.status),
  )
    ? "partial"
    : changed.size
      ? "complete"
      : "no-change";
  const brief = briefSchema.parse({
    id: crypto.randomUUID(),
    jobId: job.id,
    version,
    generatedAt: at,
    status,
    mode: "synthetic",
    fence,
    configRevision: doc.configRevision,
    coverage: doc.outcomes,
    records,
    sections,
    connections,
    unknowns: [
      "Synthetic evidence demonstrates the workflow only. Live coverage and actual research costs remain unverified.",
      ...doc.outcomes
        .filter((o) => !["complete", "no-change"].includes(o.status))
        .map((o) => `${o.category}: ${o.message}`),
    ],
    cost: {
      provider: "fixture",
      actualUsd: 0,
      usedFixtureUnits: job.spent + 1,
      reservedFixtureUnits: 0,
    },
  });
  for (const section of brief.sections)
    for (const item of section.items) {
      const record = brief.records.find((r) => r.id === item.findingId);
      if (
        !record ||
        item.version !== record.versions.length ||
        item.statement !== record.summary ||
        item.evidenceIds.some((id) => !record.evidence.some((e) => e.id === id))
      )
        throw new CustomerError("Briefing evidence validation failed.", 409);
    }
  return brief;
}
