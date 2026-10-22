import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { Profile, Workspace } from "../lib/contracts";
import type { Scope, Scenario, SyntheticRun } from "./contracts";
import { policy } from "./contracts";
import {
  subscriptionCommand,
  type SubscriptionView,
} from "./subscription-contracts";
import { ResearchStore } from "./store";
import type { SyntheticProvider } from "./provider";
import { replay } from "./engine";
import { monthInTimezone } from "./merge";

export const subscriptionSchema = `
CREATE TABLE IF NOT EXISTS fixture_subscriptions (
 tenant_id TEXT NOT NULL,property_id TEXT NOT NULL,entitled INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 0,
 activated_at INTEGER NOT NULL DEFAULT 0,run_credits INTEGER NOT NULL DEFAULT 1500,month_credits INTEGER NOT NULL DEFAULT 10000,
 PRIMARY KEY(tenant_id,property_id),FOREIGN KEY(tenant_id,property_id) REFERENCES properties ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS fixture_jobs (
 tenant_id TEXT NOT NULL,property_id TEXT NOT NULL,cycle_key TEXT NOT NULL,scenario TEXT NOT NULL,kind TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'queued',checkpoint TEXT NOT NULL DEFAULT 'queued',attempts INTEGER NOT NULL DEFAULT 0,
 owner TEXT,lease_until INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,started_at INTEGER,profile_json TEXT NOT NULL,error TEXT,
 PRIMARY KEY(tenant_id,property_id,cycle_key),FOREIGN KEY(tenant_id,property_id) REFERENCES properties ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS fixture_one_running ON fixture_jobs(tenant_id,property_id) WHERE state='running';
CREATE TABLE IF NOT EXISTS fixture_deliveries (
 tenant_id TEXT NOT NULL,property_id TEXT NOT NULL,recipient TEXT NOT NULL,change_key TEXT NOT NULL,cycle_key TEXT NOT NULL,
 finding_id TEXT NOT NULL,version_id TEXT NOT NULL,preview TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'prepared-disabled',
 PRIMARY KEY(tenant_id,property_id,recipient,change_key),
 FOREIGN KEY(tenant_id,property_id,cycle_key) REFERENCES fixture_jobs(tenant_id,property_id,cycle_key) ON DELETE CASCADE
);`;
type Job = Scope & {
  cycle_key: string;
  scenario: Scenario;
  kind: string;
  state: string;
  checkpoint: string;
  attempts: number;
  owner: string;
  lease_until: number;
  profile_json: string;
  created_at: number;
  started_at: number | null;
};
type Controls = {
  entitled: number;
  active: number;
  activated_at: number;
  run_credits: number;
  month_credits: number;
};
const args = (s: Scope) => [s.tenant_id, s.property_id] as const;
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Local calendar keys survive DST repeated hours. No timer, catch-up loop or cron is installed.
export function dueSlot(profile: Profile, now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: profile.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const weekday = part("weekday");
  const ordered = [...profile.scheduleDays].sort(
    (a, b) => days.indexOf(a) - days.indexOf(b),
  );
  if (
    !ordered.includes(weekday as (typeof ordered)[number]) ||
    `${part("hour")}:${part("minute")}` < profile.scheduleTime
  )
    return null;
  const date = new Date(
    `${part("year")}-${part("month")}-${part("day")}T00:00:00Z`,
  );
  date.setUTCDate(date.getUTCDate() - days.indexOf(weekday));
  return `scheduled-${date.toISOString().slice(0, 10)}-${ordered.indexOf(weekday as (typeof ordered)[number]) + 1}`;
}

export class SubscriptionStore {
  constructor(
    readonly db: DatabaseSync,
    readonly scope: Scope,
  ) {
    db.exec(subscriptionSchema);
  }
  transaction<T>(fn: () => T): T {
    return new ResearchStore(this.db, this.scope).transaction(fn);
  }
  controls(): Controls {
    return (
      (this.db
        .prepare(
          "SELECT * FROM fixture_subscriptions WHERE tenant_id=? AND property_id=?",
        )
        .get(...args(this.scope)) as Controls | undefined) ?? {
        entitled: 0,
        active: 0,
        activated_at: 0,
        run_credits: 1500,
        month_credits: 10000,
      }
    );
  }
  eligible(now: number) {
    const c = this.controls();
    const session = this.db
      .prepare(
        "SELECT 1 FROM sessions WHERE tenant_id=? AND property_id=? AND expires_at>?",
      )
      .get(...args(this.scope), now);
    const p = this.db
      .prepare(
        "SELECT profile_json FROM properties WHERE tenant_id=? AND property_id=?",
      )
      .get(...args(this.scope)) as { profile_json: string } | undefined;
    return !!(
      c.active &&
      c.entitled &&
      session &&
      p &&
      (JSON.parse(p.profile_json) as Profile).confirmed
    );
  }
  command(input: unknown, workspace: Workspace, now = new Date()) {
    const cmd = subscriptionCommand.parse(input);
    return this.transaction(() => {
      if (cmd.action === "configure") {
        if (cmd.active && (!cmd.entitled || !workspace.profile.confirmed))
          throw Error(
            "Confirm the profile and enable fictional entitlement before activation.",
          );
        if (
          cmd.active &&
          !workspace.profile.categories.some(
            (c) => !workspace.coverage[c].paused,
          )
        )
          throw Error(
            "Unpause at least one scout on its agent page before fixture activation.",
          );
        const old = this.controls();
        this.db
          .prepare(
            `INSERT INTO fixture_subscriptions VALUES(?,?,?,?,?,?,?) ON CONFLICT(tenant_id,property_id) DO UPDATE SET entitled=excluded.entitled,active=excluded.active,activated_at=excluded.activated_at,run_credits=excluded.run_credits,month_credits=excluded.month_credits`,
          )
          .run(
            ...args(this.scope),
            Number(cmd.entitled),
            Number(cmd.active),
            cmd.active && !old.active ? now.getTime() : old.activated_at,
            cmd.runCredits,
            cmd.monthCredits,
          );
        if (!cmd.active || !cmd.entitled)
          this.db
            .prepare(
              "UPDATE fixture_deliveries SET state='suppressed' WHERE tenant_id=? AND property_id=?",
            )
            .run(...args(this.scope));
      } else {
        if (!this.eligible(now.getTime()))
          throw Error(
            "Fictional subscription is paused, unconfirmed, expired or not entitled.",
          );
        let key: string | null, scenario: Scenario, kind: string;
        if (cmd.action === "baseline") {
          key = "subscription-baseline-v1";
          scenario = "baseline";
          kind = "baseline";
        } else if (cmd.action === "due") {
          key = dueSlot(workspace.profile, now);
          scenario = "update";
          kind = "scheduled";
          if (!key)
            throw Error(
              "No fixture slot is due today in the hotel timezone. No missed cycles are backfilled.",
            );
        } else {
          key = `manual-${cmd.key}`;
          scenario = cmd.scenario;
          kind = "manual";
        }
        if (
          kind !== "baseline" &&
          !this.db
            .prepare(
              "SELECT 1 FROM fixture_jobs WHERE tenant_id=? AND property_id=? AND kind='baseline' AND state='done'",
            )
            .get(...args(this.scope))
        )
          throw Error("Complete the queued initial blueprint first.");
        const existing = this.db
          .prepare(
            "SELECT scenario FROM fixture_jobs WHERE tenant_id=? AND property_id=? AND cycle_key=?",
          )
          .get(...args(this.scope), key);
        if (existing && existing.scenario !== scenario)
          throw Error("Cycle key already belongs to another scenario.");
        this.db
          .prepare(
            "INSERT OR IGNORE INTO fixture_jobs(tenant_id,property_id,cycle_key,scenario,kind,created_at,profile_json) VALUES(?,?,?,?,?,?,?)",
          )
          .run(
            ...args(this.scope),
            key,
            scenario,
            kind,
            now.getTime(),
            JSON.stringify(workspace.profile),
          );
      }
      return this.view(workspace.profile, now);
    });
  }
  view(profile: Profile, now = new Date()): SubscriptionView {
    const c = this.controls(),
      month = monthInTimezone(now, profile);
    const usage = this.db
      .prepare(
        "SELECT COALESCE(SUM(cost),0) reconciledCredits, COALESCE(SUM(CASE WHEN cost IS NULL THEN reserved ELSE 0 END),0) heldCredits FROM synthetic_usage WHERE tenant_id=? AND property_id=? AND month=?",
      )
      .get(...args(this.scope), month) as SubscriptionView["usage"];
    return {
      controls: {
        entitled: !!c.entitled,
        active: !!c.active,
        runCredits: c.run_credits,
        monthCredits: c.month_credits,
      },
      month,
      usage: { ...usage, actualChargedUsd: 0 },
      jobs: this.db
        .prepare(
          "SELECT j.cycle_key,j.scenario,j.state,j.checkpoint,j.attempts,j.error,json_extract(r.record_json,'$.status') result,json_extract(r.record_json,'$.summary') summary FROM fixture_jobs j LEFT JOIN synthetic_runs r ON r.tenant_id=j.tenant_id AND r.property_id=j.property_id AND r.cycle_key=j.cycle_key WHERE j.tenant_id=? AND j.property_id=? ORDER BY j.created_at DESC,j.rowid DESC LIMIT 50",
        )
        .all(...args(this.scope)) as SubscriptionView["jobs"],
      deliveries: this.db
        .prepare(
          "SELECT recipient,cycle_key,state,finding_id,version_id,preview FROM fixture_deliveries WHERE tenant_id=? AND property_id=? ORDER BY rowid DESC LIMIT 50",
        )
        .all(...args(this.scope)) as SubscriptionView["deliveries"],
    };
  }
}

// Only the fixture worker calls these operations. No production entitlement fallback exists.
export function claimJob(db: DatabaseSync, now = Date.now()): Job | null {
  db.exec(subscriptionSchema);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE fixture_jobs SET state='failed',error='Worker retry ceiling reached; inspect checkpoint and retained usage.' WHERE state='running' AND lease_until<=? AND attempts>=3",
    ).run(now);
    const rows = db
      .prepare(
        "SELECT j.* FROM fixture_jobs j JOIN fixture_subscriptions s ON s.tenant_id=j.tenant_id AND s.property_id=j.property_id WHERE s.active=1 AND s.entitled=1 AND (j.state='queued' OR (j.state='running' AND j.lease_until<=?)) AND j.attempts<3 ORDER BY (j.state='running') DESC,j.created_at,j.rowid LIMIT 200",
      )
      .all(now) as Job[];
    let claimed: Job | null = null;
    for (const job of rows) {
      const store = new SubscriptionStore(db, job);
      if (!store.eligible(now)) continue;
      if (
        db
          .prepare(
            "SELECT 1 FROM fixture_jobs WHERE tenant_id=? AND property_id=? AND state='running' AND lease_until>?",
          )
          .get(...args(job), now)
      )
        continue;
      if (
        db
          .prepare(
            "SELECT 1 FROM synthetic_runs WHERE tenant_id=? AND property_id=? AND state='researching'",
          )
          .get(...args(job))
      )
        continue;
      const owner = randomUUID();
      db.prepare(
        "UPDATE fixture_jobs SET state='running',owner=?,lease_until=?,started_at=COALESCE(started_at,?),attempts=attempts+1,error=NULL WHERE tenant_id=? AND property_id=? AND cycle_key=?",
      ).run(owner, now + 60000, now, ...args(job), job.cycle_key);
      claimed = {
        ...job,
        state: "running",
        owner,
        lease_until: now + 60000,
        started_at: job.started_at ?? now,
        attempts: job.attempts + 1,
      };
      break;
    }
    db.exec("COMMIT");
    return claimed;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function processJob(
  db: DatabaseSync,
  job: Job,
  options: {
    now?: () => number;
    provider?: SyntheticProvider;
    checkpoint?: (
      stage: "research-start" | "research-progress" | "research-committed",
    ) => void;
  } = {},
) {
  const now = options.now ?? Date.now;
  const subscription = new SubscriptionStore(db, job);
  const fence = () => {
    if (!subscription.eligible(now()))
      throw Error("Fictional entitlement or activation is unavailable.");
    const row = db
      .prepare(
        "SELECT checkpoint FROM fixture_jobs WHERE tenant_id=? AND property_id=? AND cycle_key=? AND state='running' AND owner=? AND lease_until>?",
      )
      .get(...args(job), job.cycle_key, job.owner, now());
    if (!row) throw Error("Worker lease is stale.");
    return String(row.checkpoint);
  };
  try {
    // Safe ONLY because every provider/retrieval operation is pure, in-memory fixture computation.
    // A killed process rolls back this complete transaction. Never use this for external API calls.
    subscription.transaction(() => {
      const checkpoint = fence();
      if (checkpoint === "research-committed") return;
      const controls = subscription.controls();
      class BudgetedStore extends ResearchStore {
        override checkpoint(run: SyntheticRun) {
          super.checkpoint(run);
          if (run.checkpoint === "reserved:corporate:0")
            options.checkpoint?.("research-start");
          if (run.checkpoint === "checked:corporate:0")
            options.checkpoint?.("research-progress");
        }
        override reserve(
          cycle: string,
          operation: string,
          scout: string,
          month: string,
          amount: number = policy.perAttemptCredits,
          limits = {
            run: policy.perRunCredits as number,
            month: policy.monthlyCredits as number,
          },
        ) {
          fence();
          return super.reserve(cycle, operation, scout, month, amount, {
            run: Math.min(limits.run, controls.run_credits),
            month: Math.min(limits.month, controls.month_credits),
          });
        }
      }
      const profile: Profile = JSON.parse(job.profile_json);
      const coverage = JSON.parse(
        String(
          db
            .prepare(
              "SELECT coverage_json FROM properties WHERE tenant_id=? AND property_id=?",
            )
            .get(...args(job))!.coverage_json,
        ),
      ) as Workspace["coverage"];
      profile.categories = profile.categories.filter(
        (c) => !coverage[c].paused,
      );
      if (!profile.categories.length)
        throw Error(
          "All prospecting categories selected for this demo are paused.",
        );
      replay(new BudgetedStore(db, job), profile, job.scenario, job.cycle_key, {
        now: new Date(job.started_at ?? now()),
        provider: options.provider,
      });
      fence();
      db.prepare(
        "UPDATE fixture_jobs SET checkpoint='research-committed' WHERE tenant_id=? AND property_id=? AND cycle_key=?",
      ).run(...args(job), job.cycle_key);
    });
    options.checkpoint?.("research-committed");
    subscription.transaction(() => {
      fence();
      const profile: Profile = JSON.parse(
        String(
          db
            .prepare(
              "SELECT profile_json FROM properties WHERE tenant_id=? AND property_id=?",
            )
            .get(...args(job))!.profile_json,
        ),
      );
      const records = new ResearchStore(db, job).views();
      const changes = db
        .prepare(
          "SELECT * FROM synthetic_changes WHERE tenant_id=? AND property_id=? AND cycle_key=?",
        )
        .all(...args(job), job.cycle_key);
      for (const change of changes) {
        const finding = records.find((r) => r.id === change.finding_id);
        if (
          !finding ||
          finding.dismissed ||
          finding.quality !== "Sample evidence"
        )
          continue;
        for (const recipient of new Set(
          profile.recipients.map((r) => r.toLowerCase()),
        )) {
          db.prepare(
            "INSERT OR IGNORE INTO fixture_deliveries(tenant_id,property_id,recipient,change_key,cycle_key,finding_id,version_id,preview) VALUES(?,?,?,?,?,?,?,?)",
          ).run(
            ...args(job),
            recipient,
            String(change.change_key),
            job.cycle_key,
            finding.id,
            String(change.version_id),
            `FICTIONAL DEMO — ${finding.title}. ${finding.versions.at(-1)!.summary} No message sent.`,
          );
        }
      }
      db.prepare(
        "UPDATE fixture_jobs SET state='done',checkpoint='delivery-prepared',owner=NULL,lease_until=0,error=NULL WHERE tenant_id=? AND property_id=? AND cycle_key=?",
      ).run(...args(job), job.cycle_key);
    });
    return true;
  } catch (error) {
    // A stale worker cannot alter the newer owner's job or release unknown usage.
    db.prepare(
      "UPDATE fixture_jobs SET state=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,owner=NULL,lease_until=0,error=? WHERE tenant_id=? AND property_id=? AND cycle_key=? AND owner=?",
    ).run(
      error instanceof Error ? error.message : "Fixture worker failed.",
      ...args(job),
      job.cycle_key,
      job.owner,
    );
    return false;
  }
}
