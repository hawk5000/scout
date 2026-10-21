import type { DatabaseSync } from "node:sqlite";
import type { FindingView } from "../lib/contracts";
import {
  type EngineRecord,
  type Scope,
  type SyntheticRun,
  type Usage,
  policy,
  usageCredits,
} from "./contracts";
export const researchSchema = `
CREATE TABLE IF NOT EXISTS synthetic_records (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, canonical_key TEXT NOT NULL, finding_id TEXT NOT NULL,
 record_json TEXT NOT NULL, saved INTEGER NOT NULL DEFAULT 0, dismissed INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant_id,property_id,canonical_key), UNIQUE(tenant_id,property_id,finding_id),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,property_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS synthetic_runs (
 tenant_id TEXT NOT NULL,property_id TEXT NOT NULL,cycle_key TEXT NOT NULL,scenario TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('researching','finished')),record_json TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,cycle_key),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,property_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS synthetic_one_active ON synthetic_runs(tenant_id,property_id) WHERE state='researching';
CREATE TABLE IF NOT EXISTS synthetic_usage (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, cycle_key TEXT NOT NULL, operation_key TEXT NOT NULL,
 month TEXT NOT NULL, scout TEXT NOT NULL, reserved INTEGER NOT NULL CHECK(reserved>=0),
 cost INTEGER CHECK(cost>=0), usage_json TEXT, rate_card TEXT NOT NULL DEFAULT 'synthetic-credits-v1',
 PRIMARY KEY(tenant_id,property_id,cycle_key,operation_key),
 FOREIGN KEY(tenant_id,property_id,cycle_key) REFERENCES synthetic_runs(tenant_id,property_id,cycle_key) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS synthetic_changes (
 tenant_id TEXT NOT NULL,property_id TEXT NOT NULL,change_key TEXT NOT NULL,finding_id TEXT NOT NULL,version_id TEXT NOT NULL,cycle_key TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,change_key), UNIQUE(tenant_id,property_id,finding_id,version_id),
 FOREIGN KEY(tenant_id,property_id,cycle_key) REFERENCES synthetic_runs(tenant_id,property_id,cycle_key) ON DELETE CASCADE
);`;
export class ResearchStore {
  constructor(
    readonly db: DatabaseSync,
    readonly scope: Scope,
  ) {
    db.exec(researchSchema);
  }
  private args() {
    return [this.scope.tenant_id, this.scope.property_id] as const;
  }
  transaction<T>(fn: () => T) {
    const nested = this.db.isTransaction;
    this.db.exec(nested ? "SAVEPOINT research_step" : "BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec(nested ? "RELEASE research_step" : "COMMIT");
      return result;
    } catch (e) {
      this.db.exec(nested ? "ROLLBACK TO research_step" : "ROLLBACK");
      if (nested) this.db.exec("RELEASE research_step");
      throw e;
    }
  }
  records(): EngineRecord[] {
    return (
      this.db
        .prepare(
          "SELECT record_json FROM synthetic_records WHERE tenant_id=? AND property_id=? ORDER BY rowid",
        )
        .all(...this.args()) as { record_json: string }[]
    ).map((r) => JSON.parse(r.record_json));
  }
  views(): FindingView[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM synthetic_records WHERE tenant_id=? AND property_id=? ORDER BY rowid",
        )
        .all(...this.args()) as {
        record_json: string;
        saved: number;
        dismissed: number;
      }[]
    ).map((row) => {
      const r: EngineRecord = JSON.parse(row.record_json);
      return {
        ...r.finding,
        ...r.assessment,
        saved: !!row.saved,
        dismissed: !!row.dismissed,
      };
    });
  }
  runs(): SyntheticRun[] {
    return (
      this.db
        .prepare(
          "SELECT record_json FROM synthetic_runs WHERE tenant_id=? AND property_id=? ORDER BY rowid DESC",
        )
        .all(...this.args()) as { record_json: string }[]
    ).map((r) => JSON.parse(r.record_json));
  }
  begin(run: SyntheticRun): SyntheticRun | null {
    return this.transaction(() => {
      const existing = this.db
        .prepare(
          "SELECT scenario,state,record_json FROM synthetic_runs WHERE tenant_id=? AND property_id=? AND cycle_key=?",
        )
        .get(...this.args(), run.cycleKey) as
        { scenario: string; state: string; record_json: string } | undefined;
      if (existing) {
        if (existing.scenario !== run.scenario)
          throw Error("Cycle key already belongs to another scenario.");
        if (existing.state === "researching")
          throw Error(
            "Run remains interrupted or active; review its held reservations before recovery.",
          );
        return JSON.parse(existing.record_json);
      }
      const active = this.db
        .prepare(
          "SELECT 1 FROM synthetic_runs WHERE tenant_id=? AND property_id=? AND state='researching'",
        )
        .get(...this.args());
      if (active) throw Error("Another run is active for this property.");
      this.db
        .prepare("INSERT INTO synthetic_runs VALUES(?,?,?,?,'researching',?)")
        .run(...this.args(), run.cycleKey, run.scenario, JSON.stringify(run));
      return null;
    });
  }
  reserve(
    cycle: string,
    operation: string,
    scout: string,
    month: string,
    amount: number = policy.perAttemptCredits,
    limits: { run: number; month: number } = {
      run: policy.perRunCredits,
      month: policy.monthlyCredits,
    },
  ) {
    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      !Number.isSafeInteger(limits.run) ||
      limits.run < 0 ||
      !Number.isSafeInteger(limits.month) ||
      limits.month < 0
    )
      throw Error("Invalid synthetic budget.");
    return this.transaction(() => {
      if (
        this.db
          .prepare(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='fixture_subscriptions'",
          )
          .get()
      ) {
        const controls = this.db
          .prepare(
            "SELECT run_credits,month_credits FROM fixture_subscriptions WHERE tenant_id=? AND property_id=?",
          )
          .get(...this.args()) as
          { run_credits: number; month_credits: number } | undefined;
        if (controls)
          limits = {
            run: Math.min(limits.run, controls.run_credits),
            month: Math.min(limits.month, controls.month_credits),
          };
      }
      const active = this.db
        .prepare(
          "SELECT 1 FROM synthetic_runs WHERE tenant_id=? AND property_id=? AND cycle_key=? AND state='researching'",
        )
        .get(...this.args(), cycle);
      if (!active) throw Error("Run is not active.");
      if (
        this.db
          .prepare(
            "SELECT 1 FROM synthetic_usage WHERE tenant_id=? AND property_id=? AND cycle_key=? AND operation_key=?",
          )
          .get(...this.args(), cycle, operation)
      )
        throw Error(
          "Operation already reserved; do not repeat a provider call.",
        );
      const total = (clause: string, value: string) =>
        Number(
          this.db
            .prepare(
              `SELECT COALESCE(SUM(COALESCE(cost,reserved)),0) n FROM synthetic_usage WHERE tenant_id=? AND property_id=? AND ${clause}=?`,
            )
            .get(...this.args(), value)!.n,
        );
      if (
        total("cycle_key", cycle) + amount > limits.run ||
        total("month", month) + amount > limits.month
      )
        throw Error("Synthetic budget limit reached.");
      this.db
        .prepare(
          "INSERT INTO synthetic_usage(tenant_id,property_id,cycle_key,operation_key,month,scout,reserved) VALUES(?,?,?,?,?,?,?)",
        )
        .run(...this.args(), cycle, operation, month, scout, amount);
    });
  }
  reconcile(cycle: string, operation: string, usage: Usage) {
    const cost = usageCredits(usage);
    this.transaction(() => {
      const old = this.db
        .prepare(
          "SELECT reserved,cost,usage_json FROM synthetic_usage WHERE tenant_id=? AND property_id=? AND cycle_key=? AND operation_key=?",
        )
        .get(...this.args(), cycle, operation) as
        | { reserved: number; cost: number | null; usage_json: string | null }
        | undefined;
      if (!old) throw Error("No reservation.");
      if (old.cost !== null) {
        if (old.usage_json !== JSON.stringify(usage))
          throw Error("Reconciliation differs from the recorded usage.");
        return;
      }
      if (cost > old.reserved)
        throw Error(
          "Usage exceeds reservation; retain hold for administrator review.",
        );
      this.db
        .prepare(
          "UPDATE synthetic_usage SET cost=?,usage_json=? WHERE tenant_id=? AND property_id=? AND cycle_key=? AND operation_key=?",
        )
        .run(cost, JSON.stringify(usage), ...this.args(), cycle, operation);
    });
  }
  usage(cycle: string): SyntheticRun["usage"] {
    const result: SyntheticRun["usage"] = {
      rateCard: "synthetic-credits-v1",
      provider: "fixture",
      model: "recorded-structured-output-v1",
      actualChargedUsd: 0,
      estimatedCredits: 0,
      reconciledCredits: 0,
      heldCredits: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      searchCalls: 0,
      toolCalls: 0,
    };
    const rows = this.db
      .prepare(
        "SELECT reserved,cost,usage_json FROM synthetic_usage WHERE tenant_id=? AND property_id=? AND cycle_key=?",
      )
      .all(...this.args(), cycle) as {
      reserved: number;
      cost: number | null;
      usage_json: string | null;
    }[];
    for (const row of rows) {
      result.estimatedCredits += row.reserved;
      if (row.cost === null) result.heldCredits += row.reserved;
      else result.reconciledCredits += row.cost;
      if (row.usage_json) {
        const usage: Usage = JSON.parse(row.usage_json);
        for (const key of Object.keys(usage) as (keyof Usage)[])
          result[key] += usage[key];
      }
    }
    return result;
  }
  checkpoint(run: SyntheticRun) {
    run.usage = this.usage(run.cycleKey);
    this.db
      .prepare(
        "UPDATE synthetic_runs SET record_json=? WHERE tenant_id=? AND property_id=? AND cycle_key=?",
      )
      .run(JSON.stringify(run), ...this.args(), run.cycleKey);
  }
  finish(run: SyntheticRun, records: EngineRecord[]) {
    run.usage = this.usage(run.cycleKey);
    this.transaction(() => {
      for (const r of records) {
        this.db
          .prepare(
            "INSERT INTO synthetic_records(tenant_id,property_id,canonical_key,finding_id,record_json) VALUES(?,?,?,?,?) ON CONFLICT(tenant_id,property_id,canonical_key) DO UPDATE SET record_json=excluded.record_json",
          )
          .run(...this.args(), r.key, r.finding.id, JSON.stringify(r));
        if ([...run.newIds, ...run.changedIds].includes(r.finding.id)) {
          const version = r.finding.versions.at(-1)!;
          this.db
            .prepare(
              "INSERT OR IGNORE INTO synthetic_changes VALUES(?,?,?,?,?,?)",
            )
            .run(
              ...this.args(),
              `${r.finding.id}:${version.id}`,
              r.finding.id,
              version.id,
              run.cycleKey,
            );
        }
      }
      this.db
        .prepare(
          "UPDATE synthetic_runs SET state='finished',record_json=? WHERE tenant_id=? AND property_id=? AND cycle_key=?",
        )
        .run(JSON.stringify(run), ...this.args(), run.cycleKey);
    });
  }
  state(id: string, saved: boolean, dismissed: boolean) {
    return (
      this.db
        .prepare(
          "UPDATE synthetic_records SET saved=?,dismissed=? WHERE tenant_id=? AND property_id=? AND finding_id=?",
        )
        .run(Number(saved), Number(dismissed), ...this.args(), id).changes > 0
    );
  }
}
