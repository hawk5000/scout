import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { DemoRepository, tokenHash } from "../src/server/repository";
import {
  SubscriptionStore,
  claimJob,
  processJob,
  dueSlot,
} from "../src/research/subscription";
import { demoProfile } from "../src/lib/fixtures";
import type { Scope } from "../src/research/contracts";
import { ResearchStore } from "../src/research/store";

function setup(file = ":memory:") {
  const repo = new DemoRepository(file),
    token = repo.createSession();
  const scope = repo.db
    .prepare("SELECT tenant_id,property_id FROM sessions WHERE token_hash=?")
    .get(tokenHash(token)) as Scope;
  repo.mutate(token, {
    action: "profile",
    profile: {
      ...demoProfile,
      recipients: ["sales@example.com", "SALES@example.com"],
    },
  });
  for (const category of demoProfile.categories)
    repo.mutate(token, {
      action: "coverage",
      category,
      notes: "Fixture coverage",
      paused: false,
    });
  const store = new SubscriptionStore(repo.db, scope);
  const command = (input: unknown) => repo.subscription(token, input);
  const activate = (runCredits = 1500, monthCredits = 10000) =>
    command({
      action: "configure",
      entitled: true,
      active: true,
      runCredits,
      monthCredits,
    });
  const work = () => {
    const job = claimJob(repo.db);
    assert.ok(job);
    assert.equal(
      processJob(repo.db, job),
      true,
      JSON.stringify(store.view(demoProfile).jobs),
    );
    return job;
  };
  return { repo, token, scope, store, command, activate, work };
}
test("subscription defaults closed, role/scope strict; baseline is durable and idempotent", () => {
  const s = setup();
  try {
    assert.throws(() => s.command({ action: "baseline" }), /paused/);
    assert.throws(() => s.activate(-1));
    s.activate();
    assert.throws(() => s.command({ action: "baseline", tenant_id: "forged" }));
    const viewer = s.repo.createSession(Date.now(), "demo_viewer");
    assert.throws(() => s.repo.subscription(viewer), /administrator/);
    s.command({ action: "baseline" });
    s.command({ action: "baseline" });
    assert.equal(s.store.view(demoProfile).jobs.length, 1);
    assert.equal(new ResearchStore(s.repo.db, s.scope).runs().length, 0);
    assert.throws(
      () =>
        s.repo.replay(s.token, {
          scenario: "update",
          cycleKey: "overlap-test",
        }),
      /queued/,
    );
    s.work();
    s.command({ action: "baseline" });
    assert.equal(claimJob(s.repo.db), null);
    assert.equal(new ResearchStore(s.repo.db, s.scope).runs().length, 1);
    assert.equal(s.store.view(demoProfile).deliveries.length, 3);
    assert.ok(
      s.store
        .view(demoProfile)
        .deliveries.every((d) => d.state === "prepared-disabled"),
    );
    const other = s.repo.createSession();
    assert.equal(s.repo.subscription(other).jobs.length, 0);
    s.repo.revoke(s.token);
    assert.equal(
      s.repo.db.prepare("SELECT count(*) n FROM fixture_jobs").get()!.n,
      0,
    );
    assert.equal(
      s.repo.db.prepare("SELECT count(*) n FROM fixture_deliveries").get()!.n,
      0,
    );
  } finally {
    s.repo.close();
  }
});
test("pause, revocation and expiration block workers; resume preserves queued work", () => {
  const s = setup();
  try {
    s.activate();
    s.command({ action: "baseline" });
    s.command({
      action: "configure",
      entitled: true,
      active: false,
      runCredits: 1500,
      monthCredits: 10000,
    });
    assert.equal(claimJob(s.repo.db), null);
    s.activate();
    const job = claimJob(s.repo.db)!;
    s.command({
      action: "configure",
      entitled: false,
      active: false,
      runCredits: 1500,
      monthCredits: 10000,
    });
    assert.equal(processJob(s.repo.db, job), false);
    assert.equal(s.store.view(demoProfile).usage.reconciledCredits, 0);
    s.activate();
    s.work();
    s.command({
      action: "configure",
      entitled: true,
      active: false,
      runCredits: 1500,
      monthCredits: 10000,
    });
    assert.ok(
      s.store
        .view(demoProfile)
        .deliveries.every((d) => d.state === "suppressed"),
    );
    s.activate();
    s.command({
      action: "enqueue",
      scenario: "update",
      key: "expired-session",
    });
    s.repo.db
      .prepare("UPDATE sessions SET expires_at=0 WHERE token_hash=?")
      .run(tokenHash(s.token));
    assert.equal(claimJob(s.repo.db), null);
  } finally {
    s.repo.close();
  }
});
test("calendar slots are twice weekly, timezone-aware and stable through DST", () => {
  assert.equal(dueSlot(demoProfile, new Date("2026-10-20T14:59:00Z")), null);
  assert.equal(
    dueSlot(demoProfile, new Date("2026-10-20T15:00:00Z")),
    "scheduled-2026-10-19-1",
  );
  assert.equal(
    dueSlot(demoProfile, new Date("2026-10-23T20:00:00Z")),
    "scheduled-2026-10-19-2",
  );
  assert.equal(dueSlot(demoProfile, new Date("2026-10-21T20:00:00Z")), null);
  const dst = {
    ...demoProfile,
    scheduleDays: ["Sunday", "Tuesday"] as typeof demoProfile.scheduleDays,
    scheduleTime: "01:00",
  };
  assert.equal(
    dueSlot(dst, new Date("2026-11-01T08:30:00Z")),
    dueSlot(dst, new Date("2026-11-01T09:30:00Z")),
  );
  const s = setup();
  try {
    s.activate();
    assert.throws(
      () =>
        s.command({
          action: "enqueue",
          scenario: "update",
          key: "missing-baseline",
        }),
      /initial blueprint/,
    );
    s.command({ action: "baseline" });
    s.work();
    const when = new Date("2026-10-23T20:00:00Z");
    s.store.command({ action: "due" }, s.repo.read(s.token), when);
    s.store.command({ action: "due" }, s.repo.read(s.token), when);
    assert.equal(s.store.view(demoProfile).jobs.length, 2);
  } finally {
    s.repo.close();
  }
});
test("quiet cycles and retries never duplicate previews; current recipients/dismissals are respected", () => {
  const s = setup();
  try {
    s.activate();
    s.command({ action: "baseline" });
    s.work();
    s.command({ action: "enqueue", scenario: "update", key: "change-update" });
    s.work();
    const before = s.store.view(demoProfile).deliveries.length;
    assert.equal(before, 6);
    s.command({ action: "enqueue", scenario: "quiet", key: "quiet-update" });
    s.work();
    assert.equal(s.store.view(demoProfile).deliveries.length, before);
    s.command({
      action: "enqueue",
      scenario: "cancellation",
      key: "cancel-update",
    });
    const job = claimJob(s.repo.db)!;
    assert.equal(
      processJob(s.repo.db, job, {
        checkpoint(stage) {
          if (stage === "research-committed")
            throw Error("delivery interrupted");
        },
      }),
      false,
    );
    const finding = new ResearchStore(s.repo.db, s.scope).views()[0];
    s.repo.mutate(s.token, {
      action: "state",
      findingId: finding.id,
      saved: false,
      dismissed: true,
    });
    s.repo.mutate(s.token, {
      action: "profile",
      profile: { ...demoProfile, recipients: ["new@example.com"] },
    });
    s.work();
    assert.equal(s.store.view(demoProfile).deliveries.length, before + 2);
    assert.equal(new ResearchStore(s.repo.db, s.scope).runs().length, 4);
  } finally {
    s.repo.close();
  }
});
test("budgets and retained holds are property-specific; category pauses apply to queued jobs", () => {
  const s = setup();
  try {
    s.activate(330, 330);
    s.command({ action: "baseline" });
    s.work();
    const view = s.store.view(demoProfile);
    assert.ok(view.usage.reconciledCredits <= 330);
    assert.equal(
      new ResearchStore(s.repo.db, s.scope).runs()[0].status,
      "Partial",
    );
    s.activate();
    s.command({
      action: "enqueue",
      scenario: "interrupted",
      key: "held-usage-job",
    });
    s.work();
    assert.equal(s.store.view(demoProfile).usage.heldCredits, 300);
    s.command({
      action: "enqueue",
      scenario: "update",
      key: "paused-category",
    });
    s.repo.mutate(s.token, {
      action: "coverage",
      category: "project",
      notes: "Paused for fixture test",
      paused: true,
    });
    s.work();
    assert.equal(
      new ResearchStore(s.repo.db, s.scope).runs()[0].coverage.project,
      "Excluded by profile",
    );
    assert.equal(s.store.view(demoProfile).usage.heldCredits, 300);
  } finally {
    s.repo.close();
  }
});
test("lease fencing rejects stale workers and stops after three interrupted claims", () => {
  const s = setup();
  try {
    s.activate();
    s.command({ action: "baseline" });
    const t = Date.now();
    const a = claimJob(s.repo.db, t)!;
    assert.equal(claimJob(s.repo.db, t), null);
    const b = claimJob(s.repo.db, t + 60001)!;
    assert.notEqual(a.owner, b.owner);
    assert.equal(processJob(s.repo.db, a, { now: () => t + 60002 }), false);
    assert.equal(s.store.view(demoProfile).jobs[0].state, "running");
    assert.ok(claimJob(s.repo.db, t + 120002));
    assert.equal(claimJob(s.repo.db, t + 180003), null);
    assert.equal(s.store.view(demoProfile).jobs[0].state, "failed");
    assert.equal(new ResearchStore(s.repo.db, s.scope).runs().length, 0);
  } finally {
    s.repo.close();
  }
});
function child(file: string, stage = "") {
  return new Promise<{ code: number | null; out: string }>(
    (resolve, reject) => {
      const c = spawn(
        process.execPath,
        ["--import", "tsx", "tests/helpers/job-worker.ts", file, stage],
        { cwd: process.cwd() },
      );
      let out = "";
      c.stdout.on("data", (d) => (out += d));
      c.on("error", reject);
      c.on("exit", (code) => resolve({ code, out }));
    },
  );
}
test("same-tenant properties keep jobs, delivery and budgets separate; direct replay cannot bypass controls", () => {
  const s = setup();
  try {
    const second = "c".repeat(64);
    s.repo.db
      .prepare("INSERT INTO properties VALUES(?,?,?,?,0)")
      .run(
        s.scope.tenant_id,
        "other-hotel",
        JSON.stringify(demoProfile),
        JSON.stringify(s.repo.read(s.token).coverage),
      );
    s.repo.db
      .prepare("INSERT INTO sessions VALUES(?,?,?,?,?)")
      .run(
        tokenHash(second),
        s.scope.tenant_id,
        "other-hotel",
        Date.now() + 100000,
        "demo_admin",
      );
    s.activate(0, 0);
    s.command({ action: "baseline" });
    s.work();
    assert.equal(s.store.view(demoProfile).usage.reconciledCredits, 0);
    const configure = {
      action: "configure",
      entitled: true,
      active: true,
      runCredits: 1500,
      monthCredits: 10000,
    };
    s.repo.subscription(second, configure);
    s.repo.subscription(second, { action: "baseline" });
    s.work();
    const other = s.repo.subscription(second);
    assert.equal(other.usage.reconciledCredits, 84);
    assert.equal(other.jobs.length, 1);
    assert.equal(s.store.view(demoProfile).usage.reconciledCredits, 0);
    s.repo.replay(s.token, {
      scenario: "update",
      cycleKey: "direct-budget-test",
    });
    assert.equal(s.store.view(demoProfile).usage.reconciledCredits, 0);
    s.command({ ...configure, active: false });
    assert.throws(
      () =>
        s.repo.replay(s.token, {
          scenario: "update",
          cycleKey: "direct-paused-test",
        }),
      /paused/,
    );
    s.repo.revoke(s.token);
    assert.equal(s.repo.subscription(second).jobs.length, 1);
  } finally {
    s.repo.close();
  }
});
test("two worker processes race safely; killed workers recover before and after research commit", async () => {
  for (const stage of [
    "race",
    "research-start",
    "research-progress",
    "research-committed",
  ]) {
    const dir = mkdtempSync(path.join(tmpdir(), "scout-jobs-")),
      file = path.join(dir, "demo.sqlite"),
      s = setup(file);
    try {
      s.activate();
      s.command({ action: "baseline" });
      if (stage === "race") {
        const outcomes = await Promise.all([child(file), child(file)]);
        assert.ok(outcomes.every((o) => o.code === 0));
        assert.equal(
          outcomes.filter((o) => o.out.includes("completed")).length,
          1,
        );
      } else {
        assert.equal((await child(file, stage)).code, 73);
        assert.equal(
          new ResearchStore(s.repo.db, s.scope).runs().length,
          stage === "research-committed" ? 1 : 0,
        );
        s.repo.db.prepare("UPDATE fixture_jobs SET lease_until=0").run();
        assert.equal((await child(file)).code, 0);
      }
      assert.equal(new ResearchStore(s.repo.db, s.scope).runs().length, 1);
      assert.equal(s.store.view(demoProfile).deliveries.length, 3);
      assert.equal(s.store.view(demoProfile).usage.reconciledCredits, 84);
      assert.equal(s.store.view(demoProfile).jobs[0].state, "done");
    } finally {
      s.repo.close();
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
