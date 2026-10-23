import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  database,
  adapter,
  auth,
  provision,
  scope,
} from "./helpers/customer-market";
import { CustomerStore } from "../src/customer/store";
import { Expansion, fixtureBudget } from "../src/customer/expansion";
import {
  fixtureItems,
  matchProperty,
} from "../src/customer/expansion-fixtures";
import { MarketIngestion } from "../src/customer/ingestion";
import { storedMarket } from "../src/customer/market-contracts";
import {
  briefingCsv,
  briefingHtml,
  briefingText,
} from "../src/customer/brief-export";
import type { ExpansionConfiguration } from "../src/customer/expansion-contracts";
const config: ExpansionConfiguration = {
  own: {
    name: "Fictional Harbor Hotel",
    address: "10 Fictional Lane",
    locality: "Fictional Bay",
    domain: "harbor.example",
    aliases: ["Harbor Fictional Hotel"],
    formerNames: [],
    brand: "Fixture Collection",
  },
  competitors: [
    {
      id: "comp-harbor",
      name: "Fictional Ridge Hotel",
      address: "20 Fictional Lane",
      locality: "Fictional Bay",
      domain: "ridge.example",
      aliases: [],
      formerNames: [],
      brand: "",
      active: true,
    },
    {
      id: "comp-retired",
      name: "Not selected",
      address: "30 Lane",
      locality: "Fictional Bay",
      domain: "retired.example",
      aliases: [],
      formerNames: [],
      brand: "",
      active: false,
    },
  ],
};
async function setup(filename?: string) {
  const db = database(filename);
  db.exec(
    readFileSync("cloudflare/migrations/0005_scout_expansion.sql", "utf8") +
      readFileSync(
        "cloudflare/migrations/0014_reviewed_brief_publication.sql",
        "utf8",
      ),
  );
  const store = new CustomerStore(adapter(db), auth());
  const login = await store.login(
    "owner@fixture.example",
    "fixture-password",
    "fixture-network",
  );
  const identity = await store.expansionScope(login.token);
  const expansion = new Expansion(adapter(db), identity, true);
  await expansion.execute({ action: "configure", revision: 0, config });
  return { db, store, login, identity, expansion };
}
async function cycle(
  e: Expansion,
  scenario = "baseline",
  requestKey = crypto.randomUUID(),
) {
  let state = await e.execute({ action: "start", scenario, requestKey });
  for (let i = 0; i < 7; i++) {
    const job = state.jobs.find((j) => ["queued", "running"].includes(j.state));
    if (!job) break;
    state = await e.execute({ action: "advance", jobId: job.id });
  }
  return state;
}
function doc(db: ReturnType<typeof database>) {
  return storedMarket.parse(
    JSON.parse(
      (
        db
          .prepare(
            "SELECT document_json FROM customer_markets WHERE tenant_id=? AND property_id=?",
          )
          .get(scope.tenantId, scope.propertyId) as { document_json: string }
      ).document_json,
    ),
  );
}
test("expansion: five categories persist before exact-version brief, linked event, dates and exports", async () => {
  const { db, expansion } = await setup();
  const state = await cycle(expansion);
  assert.equal(state.jobs[0].state, "complete");
  assert.equal(state.brief?.coverage.length, 5);
  assert.equal(state.brief?.records.length, 5);
  assert.equal(state.brief?.connections.length, 1);
  assert.equal(state.budget.held, 0);
  assert.equal(state.budget.used, 6);
  const mention = state.brief!.records.find((r) =>
    r.categories.includes("property"),
  )!;
  assert.equal(mention.context?.sentiment, "mixed");
  assert.equal(mention.evidence.length, 2);
  assert.equal(mention.factPublishedAt, "2026-10-01");
  assert.notEqual(mention.firstSeenAt.slice(0, 10), mention.factPublishedAt);
  assert.equal(mention.evidence[0].retrievalStatus, "retrieved");
  assert.ok(briefingText(state.brief!).includes("sources.example"));
  assert.ok(briefingCsv(state.brief!).includes("FICTIONAL SYNTHETIC FIXTURE"));
  const html = briefingHtml(state.brief!);
  assert.match(html, /Market briefing/);
  assert.match(html, /Research coverage/);
  assert.match(html, /Why it may matter/);
  assert.match(html, /What remains unknown/);
  assert.match(html, /@media print/);
  assert.match(html, /https:\/\/sources\.example/);
  assert.match(html, /Fictional synthetic sample/);
  const hostileBrief = structuredClone(state.brief!);
  hostileBrief.sections[0].items[0].statement = "<script>alert('x')</script>";
  const safeHtml = briefingHtml(hostileBrief);
  assert.ok(
    safeHtml.includes("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"),
  );
  assert.ok(!safeHtml.includes("<script>alert"));
  for (const section of state.brief!.sections)
    for (const item of section.items) {
      const f: NonNullable<typeof state.brief>["records"][number] =
        state.brief!.records.find((r) => r.id === item.findingId)!;
      assert.equal(item.version, f.versions.length);
      assert.ok(
        item.evidenceIds.every((id) => f.evidence.some((e) => e.id === id)),
      );
    }
  assert.throws(
    () => db.prepare("UPDATE customer_briefings SET version=99").run(),
    /immutable_brief/,
  );
  db.close();
});
test("expansion: quiet run deduplicates syndicated evidence and preserves saved states", async () => {
  const { db, expansion, store, login } = await setup();
  const first = await cycle(expansion);
  const finding = first.brief!.records[0];
  await store.findingState(login.token, {
    findingId: finding.id,
    revision: 0,
    saved: true,
    dismissed: false,
  });
  const before = doc(db);
  const next = await cycle(expansion, "quiet");
  assert.equal(next.brief?.status, "no-change");
  assert.equal(doc(db).records.length, 5);
  assert.deepEqual(
    doc(db).records.map((f) => [f.id, f.versions.length, f.evidence.length]),
    before.records.map((f) => [f.id, f.versions.length, f.evidence.length]),
  );
  assert.ok(next.brief!.sections.every((s) => s.items.every((i) => i.ongoing)));
  assert.equal(
    (await store.workspace(login.token)).findings.find(
      (f) => f.id === finding.id,
    )?.saved,
    true,
  );
  assert.equal((await expansion.read(first.brief!.id)).brief?.version, 1);
  db.close();
});
test("expansion: material change and cancellation preserve history and old briefing", async () => {
  const { db, expansion } = await setup();
  const first = (await cycle(expansion)).brief!;
  await cycle(expansion, "change");
  const changed = doc(db).records.find((f) =>
    f.categories.includes("competitor"),
  )!;
  assert.equal(changed.versions.length, 2);
  assert.equal(changed.facts.start, "2026-12-05");
  const canceled = await cycle(expansion, "cancellation");
  assert.equal(
    canceled.brief!.records.find((f) => f.categories.includes("competitor"))!
      .facts.status,
    "Canceled",
  );
  assert.equal(
    doc(db).records.find((f) => f.id === changed.id)!.versions.length,
    3,
  );
  assert.deepEqual((await expansion.read(first.id)).brief, first);
  db.close();
});
test("expansion: selected membership, alias matches and brand-wide ambiguity", async () => {
  const own = config.own;
  assert.equal(
    matchProperty(own, { name: own.aliases[0], address: own.address }).match,
    "confirmed",
  );
  assert.equal(matchProperty(own, { name: own.name }).match, "ambiguous");
  assert.equal(
    matchProperty(own, {
      name: own.name,
      address: own.address,
      brandWide: true,
    }).match,
    "unmatched",
  );
  const items = await fixtureItems(
    "competitor",
    config,
    scope.propertyId,
    "baseline",
    new Date().toISOString(),
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].context?.subjectId, "comp-harbor");
  const { db, expansion } = await setup();
  const state = await cycle(expansion, "ambiguous");
  assert.equal(state.brief?.status, "partial");
  assert.equal(
    doc(db).records.find((f) => f.categories.includes("property"))?.context
      ?.match,
    "ambiguous",
  );
  assert.equal(state.brief!.sections[2].items.length, 0);
  db.close();
});
test("expansion: failures are not no-change and retain explicit last successful coverage", async () => {
  const { db, expansion } = await setup();
  await cycle(expansion);
  const partial = await cycle(expansion, "partial");
  assert.equal(partial.brief?.status, "partial");
  const failed = partial.brief!.coverage.find(
    (c) => c.category === "competitor",
  )!;
  assert.equal(failed.status, "failed");
  assert.ok(failed.lastSuccessAt);
  const previous = partial.brief!.id;
  const allFailed = await cycle(expansion, "failed");
  assert.equal(allFailed.jobs[0].state, "failed");
  assert.equal(allFailed.brief!.id, previous);
  assert.equal(allFailed.budget.held, 0);
  db.close();
});
test("expansion: concurrent requests join once and optimistic edits reject stale revision", async () => {
  const { db, expansion } = await setup();
  await Promise.all([
    expansion.execute({
      action: "start",
      scenario: "baseline",
      requestKey: "concurrent_first",
    }),
    expansion.execute({
      action: "start",
      scenario: "baseline",
      requestKey: "concurrent_second",
    }),
  ]);
  let state = await expansion.read();
  assert.equal(state.jobs.length, 1);
  assert.equal(state.budget.held, 6);
  await assert.rejects(
    expansion.execute({
      action: "start",
      scenario: "change",
      requestKey: "incompatible_request",
    }),
    /different settings/,
  );
  await Promise.all([
    expansion.execute({ action: "advance", jobId: state.jobs[0].id }),
    expansion.execute({ action: "advance", jobId: state.jobs[0].id }),
  ]);
  state = await expansion.read();
  assert.equal(state.jobs[0].step, 1);
  assert.equal(state.budget.used, 1);
  assert.equal(doc(db).runs.length, 1);
  await assert.rejects(
    expansion.execute({ action: "configure", revision: 0, config }),
    /changed/,
  );
  await assert.rejects(
    expansion.execute({
      action: "start",
      scenario: "quiet",
      requestKey: "concurrent_first",
    }),
    /already used/,
  );
  db.close();
});
test("expansion: committed ingestion recovers after interrupted outcome without duplicate cost", async () => {
  const { db, expansion, identity } = await setup();
  const state = await expansion.execute({
    action: "start",
    scenario: "baseline",
    requestKey: "interrupted_request",
  });
  const id = state.jobs[0].id,
    lease = crypto.randomUUID();
  db.prepare(
    "UPDATE customer_refresh_jobs SET lease=?,lease_until=?,state='running' WHERE id=?",
  ).run(lease, Date.now() + 120000, id);
  const at = new Date().toISOString();
  await new MarketIngestion(adapter(db)).ingest(
    { ...identity, dataMode: "synthetic", jobGuard: { id, lease } },
    {
      batchKey: `expansion_${id}_corporate`,
      expectedRevision: 0,
      observedAt: at,
      status: "Completed",
      categories: ["corporate"],
      warnings: [],
      items: await fixtureItems(
        "corporate",
        config,
        scope.propertyId,
        "baseline",
        at,
      ),
    },
  );
  db.prepare("UPDATE customer_refresh_jobs SET lease_until=0 WHERE id=?").run(
    id,
  );
  const recovered = await expansion.execute({ action: "advance", jobId: id });
  assert.equal(recovered.jobs[0].step, 1);
  assert.equal(recovered.budget.used, 1);
  assert.equal(doc(db).runs.length, 1);
  await assert.rejects(
    new MarketIngestion(adapter(db)).ingest(
      { ...identity, dataMode: "synthetic", jobGuard: { id, lease } },
      {
        batchKey: "stale_worker_batch",
        expectedRevision: 1,
        observedAt: new Date().toISOString(),
        status: "Completed",
        categories: ["corporate"],
        warnings: [],
        items: [],
      },
    ),
    /ownership changed/,
  );
  db.close();
});
test("expansion: budget enforced atomically before dispatch and reservation released", async () => {
  const { db, expansion } = await setup();
  await cycle(expansion);
  const sample = db
    .prepare("SELECT * FROM customer_refresh_jobs LIMIT 1")
    .get() as Record<string, string | number>;
  for (let i = 1; i < 20; i++) {
    db.prepare(
      "INSERT INTO customer_refresh_jobs(tenant_id,property_id,id,request_key,compatibility,actor,session_hash,state,created_at,finished_at,month,reserved,spent,monthly_limit,document_json) VALUES(?,?,?,?,?,?,?,'complete',?,?,?,0,6,120,?)",
    ).run(
      scope.tenantId,
      scope.propertyId,
      crypto.randomUUID(),
      `budget_seed_${i}`,
      sample.compatibility,
      sample.actor,
      sample.session_hash,
      sample.created_at,
      sample.finished_at,
      sample.month,
      sample.document_json,
    );
  }
  const before = doc(db).runs.length;
  const blocked = await cycle(expansion);
  assert.equal(blocked.jobs[0].state, "blocked");
  assert.match(blocked.jobs[0].document.reason!, /BUDGET_EXHAUSTED/);
  assert.equal(blocked.budget.used, fixtureBudget.monthlyUnits);
  assert.equal(blocked.budget.held, 0);
  assert.equal(doc(db).runs.length, before);
  db.close();
});
test("expansion: production and missing setup block without provider work", async () => {
  const { db, identity } = await setup();
  const prod = new Expansion(adapter(db), identity, false);
  const state = await cycle(prod);
  assert.equal(state.jobs[0].state, "blocked");
  assert.match(state.jobs[0].document.reason!, /LIVE_DISABLED/);
  assert.equal(doc(db).runs.length, 0);
  assert.equal(state.budget.used, 0);
  db.close();
});
test("expansion: tenant/property isolation, role denial and revoked session SQL guards", async () => {
  const { db, expansion, identity, store, login } = await setup();
  const first = await cycle(expansion);
  provision(db, "fixture_other", "fixture_other_hotel", "other_user");
  const otherStore = new CustomerStore(
    adapter(db),
    auth("fixture_other", "fixture_other_hotel", "other_user"),
  );
  const otherLogin = await otherStore.login(
    "other@fixture.example",
    "fixture-pass",
    "network2",
  );
  const other = new Expansion(
    adapter(db),
    await otherStore.expansionScope(otherLogin.token),
    true,
  );
  assert.equal((await other.read()).jobs.length, 0);
  await assert.rejects(other.read(first.brief!.id), /unavailable/);
  await assert.rejects(
    other.execute({ action: "advance", jobId: first.jobs[0].id }),
    /unavailable/,
  );
  await assert.rejects(
    new Expansion(adapter(db), { ...identity, role: "viewer" }, true).execute({
      action: "configure",
      revision: 1,
      config,
    }),
    /cannot change/,
  );
  db.prepare(
    "UPDATE customer_memberships SET active=0 WHERE user_id='fixture_user'",
  ).run();
  await assert.rejects(store.expansionScope(login.token), /sign in/i);
  await assert.rejects(
    expansion.execute({ action: "configure", revision: 1, config }),
    /access_denied/,
  );
  db.close();
});
test("expansion: config retirement preserves identity history and revision", async () => {
  const { db, expansion } = await setup();
  const first = await expansion.read();
  await expansion.execute({
    action: "configure",
    revision: 1,
    config: { ...config, competitors: [] },
  });
  const state = await expansion.read();
  assert.equal(state.config.competitors.length, 2);
  assert.ok(state.config.competitors.every((c) => !c.active));
  assert.equal(
    state.config.memberships["comp-harbor"].createdAt,
    first.config.memberships["comp-harbor"].createdAt,
  );
  assert.equal(state.config.memberships["comp-harbor"].version, 2);
  const blocked = await cycle(expansion);
  assert.match(blocked.jobs[0].document.reason!, /COMP_SET_REQUIRED/);
  db.close();
});
test("expansion: durable snapshots survive reopening and original customer records stay untouched", async () => {
  const dir = mkdtempSync(join(tmpdir(), "scout-expansion-"));
  try {
    const file = join(dir, "test.sqlite");
    const { db, expansion, identity } = await setup(file);
    provision(
      db,
      "tenant_abc",
      "property_abc_abc_hotel",
      "user_info_abchotel_com",
    );
    const before = JSON.stringify(
      db
        .prepare(
          "SELECT * FROM customer_properties WHERE tenant_id='tenant_abc'",
        )
        .get(),
    );
    const state = await cycle(expansion);
    assert.equal(
      JSON.stringify(
        db
          .prepare(
            "SELECT * FROM customer_properties WHERE tenant_id='tenant_abc'",
          )
          .get(),
      ),
      before,
    );
    db.close();
    const { DatabaseSync } = await import("node:sqlite");
    const reopened = new DatabaseSync(file);
    assert.deepEqual(
      (await new Expansion(adapter(reopened), identity, true).read()).brief,
      state.brief,
    );
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("expansion: pause prevents dispatch and bounded recovery releases held budget", async () => {
  const { db, expansion } = await setup();
  let state = await expansion.execute({
    action: "start",
    scenario: "baseline",
    requestKey: "paused_refresh_request",
  });
  await expansion.execute({
    action: "configure",
    revision: 1,
    config: { ...config, paused: true },
  });
  state = await expansion.execute({
    action: "advance",
    jobId: state.jobs[0].id,
  });
  assert.equal(state.jobs[0].state, "blocked");
  assert.equal(state.budget.held, 0);
  assert.equal(doc(db).runs.length, 0);
  await expansion.execute({
    action: "configure",
    revision: 2,
    config: { ...config, paused: false },
  });
  state = await expansion.execute({
    action: "start",
    scenario: "baseline",
    requestKey: "retry_limit_request",
  });
  db.prepare(
    "UPDATE customer_refresh_jobs SET attempts=3,lease_until=0 WHERE id=?",
  ).run(state.jobs[0].id);
  state = await expansion.execute({
    action: "advance",
    jobId: state.jobs[0].id,
  });
  assert.equal(state.jobs[0].state, "failed");
  assert.match(state.jobs[0].document.reason!, /RETRY_LIMIT/);
  assert.equal(state.budget.held, 0);
  db.close();
});
test("expansion: receipts are mandatory and URL variants preserve one underlying mention", async () => {
  const { db, identity } = await setup();
  const at = new Date().toISOString();
  const items = await fixtureItems(
    "property",
    config,
    scope.propertyId,
    "baseline",
    at,
  );
  const input = {
    batchKey: "mention_receipt_test",
    expectedRevision: 0,
    observedAt: at,
    status: "Completed",
    categories: ["property"],
    warnings: [],
    items,
  };
  await assert.rejects(
    new MarketIngestion(adapter(db)).ingest(
      { ...identity, dataMode: "synthetic" },
      { ...input, items: [{ ...items[0], receipts: [] }] },
    ),
  );
  await new MarketIngestion(adapter(db)).ingest(
    { ...identity, dataMode: "synthetic" },
    input,
  );
  const changed = structuredClone(items);
  changed[0].candidate.sources[0].url += "?utm_campaign=duplicate#fragment";
  changed[0].receipts[0].url = changed[0].candidate.sources[0].url;
  await new MarketIngestion(adapter(db)).ingest(
    { ...identity, dataMode: "synthetic" },
    {
      ...input,
      batchKey: "mention_url_variant",
      expectedRevision: 1,
      items: changed,
    },
  );
  assert.equal(doc(db).records.length, 1);
  assert.equal(doc(db).records[0].evidence.length, 2);
  assert.equal(doc(db).records[0].versions.length, 1);
  db.close();
});
