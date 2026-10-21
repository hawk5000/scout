import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { DemoRepository, tokenHash } from "../src/server/repository";
import { ResearchStore } from "../src/research/store";
import { initialRun, replay } from "../src/research/engine";
import {
  attachSource,
  FixtureProvider,
  fixtureCandidate,
  createProvider,
  type SyntheticProvider,
} from "../src/research/provider";
import {
  candidateSchema,
  usageCredits,
  type Scope,
  type Usage,
} from "../src/research/contracts";
import { canonicalUrl, FixtureRetriever } from "../src/research/retrieval";
import {
  identity,
  validateEvidence,
  monthInTimezone,
} from "../src/research/merge";
import { demoProfile } from "../src/lib/fixtures";
import { toCsv } from "../src/lib/export";
const now = new Date("2026-10-21T18:00:00Z");
const usage: Usage = {
  inputTokens: 100,
  cachedInputTokens: 0,
  outputTokens: 50,
  reasoningTokens: 0,
  searchCalls: 1,
  toolCalls: 1,
};
function setup(file = ":memory:") {
  const repo = new DemoRepository(file);
  const token = repo.createSession();
  const scope = repo.db
    .prepare("SELECT tenant_id,property_id FROM sessions WHERE token_hash=?")
    .get(tokenHash(token)) as Scope;
  const store = new ResearchStore(repo.db, scope);
  const run = (
    scenario: ConstructorParameters<typeof FixtureProvider>[0],
    key = `cycle-${scenario}`,
  ) => replay(store, demoProfile, scenario, key, { now });
  return { repo, token, scope, store, run };
}
test("all three playbooks create one record per activity; five sources yield one version/change", () => {
  const s = setup();
  try {
    const run = s.run("baseline");
    assert.equal(run.status, "Completed");
    assert.equal(run.newIds.length, 3);
    const project = s.store
      .records()
      .find((r) => r.finding.category === "project")!;
    assert.equal(project.finding.evidence.length, 5);
    assert.equal(project.finding.versions.length, 1);
    assert.equal(
      s.repo.db.prepare("SELECT count(*) n FROM synthetic_changes").get()!.n,
      3,
    );
    assert.equal(s.repo.read(s.token).findings.length, 12);
    const before = JSON.stringify(s.store.usage(run.cycleKey));
    assert.deepEqual(s.run("baseline"), run);
    assert.equal(JSON.stringify(s.store.usage(run.cycleKey)), before);
    const again = s.run("baseline", "another-baseline");
    assert.deepEqual(again.newIds, []);
    assert.deepEqual(again.changedIds, []);
    assert.equal(
      s.repo.db.prepare("SELECT count(*) n FROM synthetic_changes").get()!.n,
      3,
    );
  } finally {
    s.repo.close();
  }
});
test("material facts update once; fresh crawls, case changes, repeat sources and old facts stay quiet", () => {
  const s = setup();
  try {
    s.run("baseline");
    const update = s.run("update");
    assert.equal(update.changedIds.length, 3);
    assert.equal(update.newIds.length, 0);
    const project = s.store
      .records()
      .find((r) => r.finding.category === "project")!;
    assert.equal(project.facts.contractor, "Juniper Works");
    assert.match(project.finding.versions.at(-1)!.summary, /contractor/);
    assert.equal(s.run("quiet").summary, "No meaningful changes found.");
    assert.equal(s.run("baseline", "old-report-cycle").changedIds.length, 0);
    const current = s.store.records().find((r) => r.key === project.key)!;
    assert.equal(current.facts.contractor, "Juniper Works");
    assert.equal(current.finding.versions.length, 2);
    assert.equal(current.finding.lastVerifiedAt, null);
    assert.equal(current.finding.publicContact, null);
    assert.match(current.assessment.inference, /unconfirmed/);
  } finally {
    s.repo.close();
  }
});
test("recurring event editions remain distinct and linked by family; locations do not collide", () => {
  const s = setup();
  try {
    s.run("baseline");
    const next = s.run("next-edition");
    assert.equal(next.newIds.length, 1);
    const events = s.store
      .records()
      .filter((r) => r.finding.category === "event");
    assert.equal(events.length, 2);
    assert.equal(events[0].familyKey, events[1].familyKey);
    assert.notEqual(events[0].key, events[1].key);
    assert.equal(events[0].facts.start, "2027-03-10");
    assert.equal(events[1].facts.start, "2028-03-15");
    const a = fixtureCandidate("project"),
      b = structuredClone(a);
    b.location = "Other market";
    assert.notEqual(identity(a).key, identity(b).key);
    assert.equal(
      candidateSchema.safeParse({ ...fixtureCandidate("event"), edition: null })
        .success,
      false,
    );
  } finally {
    s.repo.close();
  }
});
test("cancellation/completion are material and no longer described as current demand", () => {
  const s = setup();
  try {
    s.run("baseline");
    s.run("update");
    const r = s.run("cancellation");
    assert.equal(r.changedIds.length, 3);
    for (const record of s.store.records()) {
      assert.ok(["Canceled", "Completed"].includes(record.facts.status));
      assert.match(record.assessment.inference, /do not treat it as current/);
    }
  } finally {
    s.repo.close();
  }
});
test("conflicting same-date sources retain accepted facts and evidence, without an alert", () => {
  const s = setup();
  try {
    s.run("baseline");
    s.run("update");
    const r = s.run("conflict");
    assert.equal(r.status, "Partial");
    assert.equal(r.changedIds.length, 0);
    const project = s.store
      .records()
      .find((r) => r.finding.category === "project")!;
    assert.equal(project.facts.contractor, "Juniper Works");
    assert.equal(project.finding.quality, "Conflicting evidence");
    assert.ok(
      project.finding.evidence.some((e) =>
        e.claim.includes("Conflicting Contractor"),
      ),
    );
    assert.ok(
      project.assessment.unknowns.some((u) => u.includes("Sources disagree")),
    );
  } finally {
    s.repo.close();
  }
});
test("source outages keep existing facts with explicit uncertainty and partial coverage", () => {
  const s = setup();
  try {
    s.run("baseline");
    s.run("update");
    const r = s.run("outage");
    assert.equal(r.status, "Partial");
    assert.match(r.coverage.project, /Partial/);
    const project = s.store
      .records()
      .find((r) => r.finding.category === "project")!;
    assert.equal(project.facts.contractor, "Juniper Works");
    assert.equal(project.finding.quality, "Needs verification");
    assert.ok(
      project.assessment.unknowns.some((u) => u.includes("check failed")),
    );
    assert.equal(project.finding.lastVerifiedAt, null);
  } finally {
    s.repo.close();
  }
});
test("offline URL registry rejects local/metadata/IP/credentials/protocol tricks and checks every redirect", () => {
  for (const url of [
    "http://sources.example/a",
    "https://127.0.0.1",
    "https://2130706433",
    "https://[::1]",
    "https://169.254.169.254/latest/meta-data",
    "file:///etc/passwd",
    "https://sources.example@evil.example",
    "https://sources.example:8443",
    "https://sources.example.evil.test",
    "https://localhost",
    "https://[::ffff:127.0.0.1]",
  ])
    assert.throws(() => canonicalUrl(url));
  assert.equal(
    canonicalUrl("https://sources.example/a?utm_source=x&ref=x#section"),
    "https://sources.example/a",
  );
  const url = "https://sources.example/a";
  assert.throws(() =>
    new FixtureRetriever({
      [url]: { body: "", redirect: "http://169.254.169.254" },
    }).retrieve(url),
  );
  assert.throws(
    () =>
      new FixtureRetriever({ [url]: { body: "", redirect: "/a" } }).retrieve(
        url,
      ),
    /loop/,
  );
});
test("retrieval enforces byte/source/time/redirect limits without issuing a network request", () => {
  const url = "https://sources.example/a";
  assert.throws(
    () =>
      new FixtureRetriever({ [url]: { body: "x".repeat(16001) } }).retrieve(
        url,
      ),
    /size/,
  );
  assert.throws(
    () =>
      new FixtureRetriever({ [url]: { body: "x", latencyMs: 3001 } }).retrieve(
        url,
      ),
    /runtime/,
  );
  const r = new FixtureRetriever(
    { [url]: { body: "x" } },
    { maxSources: 1, maxBytes: 10, maxRedirects: 0, maxRuntimeMs: 10 },
  );
  r.retrieve(url);
  assert.throws(() => r.retrieve(url), /Source limit/);
  assert.throws(
    () =>
      new FixtureRetriever(
        {
          [url]: { body: "", redirect: "/b" },
          "https://sources.example/b": { body: "ok" },
        },
        { maxSources: 3, maxBytes: 10, maxRedirects: 0, maxRuntimeMs: 10 },
      ).retrieve(url),
    /redirect limit/,
  );
});
test("unsupported claims and forged fields are rejected; retrieved instructions have no authority", () => {
  const registry = {};
  const c = fixtureCandidate("corporate");
  attachSource(c, registry, "claims");
  c.facts.status = "Completed";
  assert.throws(
    () =>
      validateEvidence(c, new FixtureRetriever(registry), now.toISOString()),
    /support/,
  );
  assert.equal(
    candidateSchema.safeParse({ ...c, tenant_id: "other", tool: "send" })
      .success,
    false,
  );
  const s = setup();
  const original = globalThis.fetch;
  globalThis.fetch = (() => {
    throw Error("Network must never be used");
  }) as typeof fetch;
  try {
    const r = s.run("injection");
    assert.equal(r.status, "Completed");
    assert.equal(r.usage.actualChargedUsd, 0);
    assert.equal(
      JSON.stringify(s.repo.read(s.token)).includes("tenant secrets"),
      false,
    );
    assert.equal(
      s.repo.db.prepare("SELECT count(*) n FROM synthetic_changes").get()!.n,
      3,
    );
    assert.throws(() => createProvider("live", "baseline"), /disabled/);
  } finally {
    globalThis.fetch = original;
    s.repo.close();
  }
});
test("malformed outputs fail partially, unknown usage retains reservation, and all-invalid run needs attention", () => {
  const s = setup();
  try {
    assert.equal(s.run("malformed").status, "Partial");
    const invalid: SyntheticProvider = {
      mode: "synthetic",
      registry: {},
      research: () => ({ candidates: [{ tenant_id: "forged" }], usage }),
    };
    const r = replay(s.store, demoProfile, "malformed", "invalid-all", {
      provider: invalid,
      now,
    });
    assert.equal(r.status, "Needs attention");
    assert.equal(r.newIds.length, 0);
    assert.equal(r.usage.heldCredits, 0);
    const missing: SyntheticProvider = {
      mode: "synthetic",
      registry: {},
      research: () => ({ candidates: [] }),
    };
    const m = replay(s.store, demoProfile, "malformed", "missing-usage", {
      provider: missing,
      now,
    });
    assert.equal(m.status, "Needs attention");
    assert.equal(m.usage.heldCredits, 900);
  } finally {
    s.repo.close();
  }
});
test("bounded retries account for every attempt; cutoff preserves prior records; interruptions retain holds", () => {
  const s = setup();
  try {
    s.run("baseline");
    const retried = s.run("retry");
    assert.equal(retried.status, "Completed");
    assert.equal(retried.counts.attempts, 4);
    assert.equal(retried.usage.searchCalls, 4);
    assert.equal(retried.newIds.length, 0);
    const cutoff = s.run("budget-cutoff");
    assert.equal(cutoff.status, "Partial");
    assert.equal(cutoff.counts.attempts, 2);
    assert.equal(s.store.records().length, 3);
    const interrupted = s.run("interrupted");
    assert.equal(interrupted.status, "Needs attention");
    assert.equal(interrupted.usage.heldCredits, 300);
    assert.equal(interrupted.usage.reconciledCredits, 0);
    assert.equal(s.store.records().length, 3);
    assert.deepEqual(s.run("interrupted"), interrupted);
  } finally {
    s.repo.close();
  }
});
test("confirmed geography, exclusions and categories constrain fixtures; stale findings remain visible", () => {
  const s = setup();
  try {
    s.run("baseline");
    const r = replay(
      s.store,
      { ...demoProfile, includedPlaces: ["Elsewhere"] },
      "baseline",
      "excluded-fixtures",
      { now: new Date("2026-12-21T18:00:00Z") },
    );
    assert.equal(r.newIds.length, 0);
    assert.equal(r.summary, "No meaningful changes found.");
    assert.ok(s.store.records().every((x) => x.finding.quality === "Stale"));
    assert.throws(
      () =>
        replay(
          s.store,
          { ...demoProfile, confirmed: false },
          "baseline",
          "not-confirmed",
          { now },
        ),
      /Confirm/,
    );
    const eventOnly = replay(
      s.store,
      { ...demoProfile, categories: ["event"] },
      "next-edition",
      "event-only-fixtures",
      { now },
    );
    assert.equal(eventOnly.coverage.corporate, "Excluded by profile");
    assert.equal(eventOnly.newIds.length, 1);
    assert.equal(
      monthInTimezone(new Date("2026-11-01T01:00:00Z"), demoProfile),
      "2026-10",
    );
  } finally {
    s.repo.close();
  }
});
test("synthetic outputs, run/usage history and save/dismiss stay scoped and persist after restart", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "scout-research-"));
  const file = path.join(dir, "scout.sqlite");
  const s = setup(file);
  try {
    const other = s.repo.createSession();
    s.run("baseline");
    const id = s.store.records()[0].finding.id;
    s.repo.mutate(s.token, {
      action: "state",
      findingId: id,
      saved: true,
      dismissed: true,
    });
    assert.equal(s.repo.read(other).findings.length, 9);
    assert.throws(
      () =>
        s.repo.mutate(other, {
          action: "state",
          findingId: id,
          saved: true,
          dismissed: false,
        }),
      /not found/,
    );
    const viewer = s.repo.createSession(Date.now(), "demo_viewer");
    assert.throws(
      () =>
        s.repo.replay(viewer, {
          scenario: "baseline",
          cycleKey: "viewer-replay",
        }),
      /administrator/,
    );
    assert.ok(toCsv(s.repo.read(s.token).findings).includes("synthetic-"));
    assert.ok(!toCsv(s.repo.read(other).findings).includes("synthetic-"));
    s.repo.close();
    const reopened = new DemoRepository(file);
    try {
      assert.equal(
        reopened.read(s.token).findings.find((f) => f.id === id)!.saved,
        true,
      );
      assert.equal(reopened.read(s.token).runs[0].engine, "synthetic-v1");
      reopened.revoke(s.token);
      assert.equal(
        reopened.db.prepare("SELECT count(*) n FROM synthetic_usage").get()!.n,
        0,
      );
      assert.equal(
        reopened.db.prepare("SELECT count(*) n FROM synthetic_records").get()!
          .n,
        0,
      );
    } finally {
      reopened.close();
    }
  } finally {
    if (s.repo.db.isOpen) s.repo.close();
    assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep));
    rmSync(dir, { recursive: true, force: true });
  }
});
test("ledger reconciliation is idempotent and holds survive interrupted runs; budgets include both", () => {
  const s = setup();
  try {
    const run = initialRun("baseline", "ledger-operation", now.toISOString());
    s.store.begin(run);
    s.store.reserve(run.cycleKey, "op", "corporate", "2026-10", 300, {
      run: 300,
      month: 300,
    });
    assert.throws(
      () =>
        s.store.reserve(run.cycleKey, "other", "project", "2026-10", 300, {
          run: 300,
          month: 300,
        }),
      /budget/,
    );
    assert.throws(
      () => s.store.reserve(run.cycleKey, "op", "corporate", "2026-10"),
      /already reserved/,
    );
    s.store.reconcile(run.cycleKey, "op", usage);
    s.store.reconcile(run.cycleKey, "op", usage);
    assert.equal(
      s.store.usage(run.cycleKey).reconciledCredits,
      usageCredits(usage),
    );
    assert.throws(
      () =>
        s.store.reconcile(run.cycleKey, "op", { ...usage, outputTokens: 100 }),
      /differs/,
    );
    assert.throws(
      () =>
        s.store.begin(initialRun("update", "overlap-cycle", now.toISOString())),
      /active/,
    );
    s.store.finish(run, []);
    assert.throws(
      () => s.store.reserve(run.cycleKey, "late", "corporate", "2026-10"),
      /not active/,
    );
    s.store.begin(initialRun("update", "next-ledger-run", now.toISOString()));
    assert.throws(
      () =>
        s.store.reserve("next-ledger-run", "op", "project", "2026-10", 300, {
          run: 300,
          month: 300,
        }),
      /budget/,
    );
  } finally {
    s.repo.close();
  }
});
test("two processes cannot spend the same remaining property budget", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "scout-concurrency-"));
  const file = path.join(dir, "scout.sqlite");
  const s = setup(file);
  try {
    s.store.begin(initialRun("baseline", "parallel-budget", now.toISOString()));
    const worker = (operation: string) =>
      new Promise<string>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            "--import",
            "tsx",
            "tests/helpers/budget-worker.ts",
            file,
            s.scope.tenant_id,
            s.scope.property_id,
            operation,
          ],
          { windowsHide: true },
        );
        let output = "";
        child.stdout.on("data", (d) => (output += d));
        child.on("error", reject);
        child.on("close", (code) =>
          code === 0 ? resolve(output) : reject(Error(`worker exited ${code}`)),
        );
      });
    const results = await Promise.all([worker("first"), worker("second")]);
    assert.deepEqual(results.sort(), ["blocked", "reserved"]);
    assert.equal(s.store.usage("parallel-budget").heldCredits, 300);
  } finally {
    s.repo.close();
    assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep));
    rmSync(dir, { recursive: true, force: true });
  }
});
test("conflict persists through old reports; initial conflicts keep source references for review", () => {
  const s = setup();
  try {
    s.run("baseline");
    s.run("update");
    s.run("conflict");
    s.run("baseline", "old-after-conflict");
    const project = s.store
      .records()
      .find((r) => r.finding.category === "project")!;
    assert.equal(project.finding.quality, "Conflicting evidence");
    s.run("cancellation");
    assert.equal(
      s.store.records().find((r) => r.key === project.key)!.finding.quality,
      "Sample evidence",
    );
  } finally {
    s.repo.close();
  }
  const s2 = setup();
  try {
    const r = s2.run("conflict");
    assert.equal(r.status, "Partial");
    assert.equal(r.reviewItems?.length, 1);
    assert.equal(r.reviewItems![0].sourceUrls.length, 6);
    assert.equal(s2.store.records().length, 2);
  } finally {
    s2.repo.close();
  }
});
test("five separately discovered candidates merge once and cross-category relationships are retained", () => {
  const s = setup();
  try {
    const registry = {};
    const candidates = Array.from({ length: 5 }, (_, i) => {
      const c = fixtureCandidate("project");
      c.categories = ["project", "corporate"];
      attachSource(c, registry, `separate-${i}`);
      return c;
    });
    const provider: SyntheticProvider = {
      mode: "synthetic",
      registry,
      research: (scout) => ({
        candidates: scout === "project" ? candidates : [],
        usage,
      }),
    };
    const r = replay(
      s.store,
      demoProfile,
      "baseline",
      "five-candidate-sources",
      { now, provider },
    );
    assert.equal(r.newIds.length, 1);
    assert.equal(s.store.records()[0].finding.evidence.length, 5);
    assert.equal(s.store.records()[0].finding.versions.length, 1);
    assert.deepEqual(s.store.records()[0].finding.categories, [
      "project",
      "corporate",
    ]);
  } finally {
    s.repo.close();
  }
});
test("publication metadata and field claims cannot be fabricated by candidate output", () => {
  const registry = {};
  const c = fixtureCandidate("event");
  attachSource(c, registry, "publication");
  c.sources[0].publishedAt = "2026-10-02";
  assert.throws(
    () =>
      validateEvidence(c, new FixtureRetriever(registry), now.toISOString()),
    /metadata/,
  );
  c.sources[0].publishedAt = "2026-10-01";
  c.sources[0].claims = c.sources[0].claims.filter((x) => x.field !== "start");
  assert.throws(
    () =>
      validateEvidence(c, new FixtureRetriever(registry), now.toISOString()),
    /Missing evidence/,
  );
});
