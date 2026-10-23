import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { database, adapter, auth, scope } from "./helpers/customer-market";
import { CustomerStore } from "../src/customer/store";
import { ReviewedImports } from "../src/customer/reviewed-imports";
import { PilotDispatcher } from "../src/research/pilot-dispatcher";
import {
  PilotTransport,
  publicV4,
  type PinnedFixtureConnector,
} from "../src/research/pilot-transport";
import { fixtureItems } from "../src/customer/expansion-fixtures";
import {
  marketCategories,
  type Ingestion,
} from "../src/customer/market-contracts";
import { rateCard } from "../src/research/source-adapters";
const own = {
  name: "Fictional Hotel",
  address: "1 Fictional Way",
  domain: "hotel.example",
  locality: "Fictional Bay",
  aliases: [],
  formerNames: [],
  brand: "",
};
const config = {
  own,
  competitors: [
    { ...own, name: "Fictional Rival", id: "fixture_comp", active: true },
  ],
};
async function setup(totalMicros = 200000) {
  const db = database();
  for (const f of [
    "0004_reviewed_imports.sql",
    "0005_scout_expansion.sql",
    "0014_reviewed_brief_publication.sql",
    "0006_provider_preparation.sql",
    "0007_pilot_dispatch.sql",
  ])
    db.exec(readFileSync(`cloudflare/migrations/${f}`, "utf8"));
  const store = new CustomerStore(adapter(db), auth());
  const login = await store.login(
    "fixture@fixture.example",
    "fixture-password",
    "pilot-test",
  );
  const identity = await store.expansionScope(login.token);
  const plan = {
    config,
    plans: Object.fromEntries(
      marketCategories.map((c) => [
        c,
        { query: c, hosts: ["sources.example"], requiredUrls: [] },
      ]),
    ),
    grants: [{ host: "sources.example", paths: ["/"] }],
  };
  db.prepare("INSERT INTO customer_pilot_policy VALUES(?,?,?,?,?,?,?)").run(
    scope.tenantId,
    scope.propertyId,
    "fixture_pilot",
    Date.now() + 86400000,
    2,
    totalMicros,
    JSON.stringify(plan),
  );
  db.prepare("INSERT INTO customer_provider_limits VALUES(?,?,?,?,?,?)").run(
    scope.tenantId,
    scope.propertyId,
    new Date().toISOString().slice(0, 7),
    100000,
    200000,
    rateCard.version,
  );
  const all: Record<string, Ingestion["items"]> = Object.fromEntries(
    await Promise.all(
      marketCategories.map(async (c) => [
        c,
        await fixtureItems(
          c,
          config,
          scope.propertyId,
          "baseline",
          new Date().toISOString(),
        ),
      ]),
    ),
  );
  let calls = 0;
  let hook = async () => {};
  const connector: PinnedFixtureConnector = {
    mode: "synthetic",
    async resolve() {
      return ["8.8.8.8"];
    },
    async open(request) {
      calls++;
      await hook();
      let value: unknown,
        contentType = "application/json";
      if (request.credential === "brave")
        value = {
          web: {
            results: all[new URL(request.url).searchParams.get("q")!].flatMap(
              (i) =>
                i.candidate.sources.map((s) => ({
                  title: i.candidate.name,
                  url: s.url,
                })),
            ),
          },
        };
      else if (request.credential === "openai") {
        const category = JSON.parse(
          JSON.parse(request.body!).input[1].content,
        ).category;
        value = {
          status: "completed",
          usage: { input_tokens: 100, output_tokens: 100 },
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    items: all[category].map(
                      ({ receipts: _, context, ...i }) => ({
                        ...i,
                        context: context ?? null,
                      }),
                    ),
                  }),
                },
              ],
            },
          ],
        };
      } else {
        contentType = "text/plain";
        value = Object.values(all)
          .flat()
          .flatMap((i) => [
            ...i.candidate.sources.flatMap((s) => s.claims.map((c) => c.quote)),
            i.context?.excerpt ?? "",
            own.name,
            own.address,
            "Fictional Rival",
          ])
          .join("\n");
      }
      const text =
        contentType === "text/plain" ? String(value) : JSON.stringify(value);
      return {
        status: 200,
        contentType,
        chunks: (async function* () {
          yield new TextEncoder().encode(text);
        })(),
      };
    },
  };
  const dispatcher = new PilotDispatcher(
    adapter(db),
    identity,
    connector,
    async () => {
      await store.expansionScope(login.token);
    },
  );
  const reviews = new ReviewedImports(adapter(db));
  const decide = async (
    id: string,
    decision: "approved" | "rejected" = "approved",
  ) => {
    const r = await reviews.execute(scope, { operation: "read", reviewId: id });
    return reviews.execute(
      { ...scope, actor: "fixture_human_reviewer" },
      {
        operation: "decide",
        reviewId: id,
        approvalHash: r.approvalHash,
        decision,
        note: "Human checked synthetic evidence and implications.",
        evidenceReviewed: true,
        lodgingInferenceReviewed: true,
      },
    );
  };
  return {
    db,
    store,
    identity,
    connector,
    dispatcher,
    reviews,
    decide,
    calls: () => calls,
    setHook: (h: () => Promise<void>) => {
      hook = h;
    },
  };
}
test("pilot: prepared five-category pipeline stages only; exact review publishes once; duplicate requests never redispatch", async () => {
  const s = await setup();
  const before = s.db
    .prepare("SELECT document_json FROM customer_markets")
    .get();
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw Error("Network forbidden");
  };
  try {
    const r = await s.dispatcher.run("fixture_pilot", "baseline_request");
    assert.equal(r.state, "pending-review");
    assert.equal(r.review, "pending");
    assert.equal(r.outcomes.length, 5);
    assert.deepEqual(
      s.db.prepare("SELECT document_json FROM customer_markets").get(),
      before,
    );
    assert.equal(s.calls(), 16);
    await s.dispatcher.run("fixture_pilot", "baseline_request");
    assert.equal(s.calls(), 16);
    await assert.rejects(
      s.dispatcher.run("fixture_pilot", "premature_update"),
      /PILOT_BUSY_OR_LIMIT/,
    );
    await s.decide(r.id);
    await s.decide(r.id);
    assert.equal(
      (s.db.prepare("SELECT revision FROM customer_markets").get() as any)
        .revision,
      1,
    );
    const next = await s.dispatcher.run("fixture_pilot", "followup_request");
    assert.equal(next.state, "pending-review");
    await s.decide(next.id);
    assert.equal(
      (await s.reviews.execute(scope, { operation: "read", reviewId: next.id }))
        .status,
      "approved",
    );
    await assert.rejects(
      s.dispatcher.run("fixture_pilot", "third_request"),
      /PILOT_BUSY_OR_LIMIT/,
    );
    assert.equal(s.calls(), 32);
  } finally {
    globalThis.fetch = original;
    s.db.close();
  }
});
test("pilot: rejected evidence remains unpublished and cross-property dispatch is denied", async () => {
  const s = await setup();
  const r = await s.dispatcher.run("fixture_pilot", "reject_request");
  await s.decide(r.id, "rejected");
  assert.equal(
    (s.db.prepare("SELECT revision FROM customer_markets").get() as any)
      .revision,
    0,
  );
  const foreign = new PilotDispatcher(
    adapter(s.db),
    { ...s.identity, propertyId: "fixture_foreign" },
    s.connector,
    async () => {},
  );
  await assert.rejects(foreign.status(r.id), /PILOT_ACCESS_DENIED/);
  const real = new PilotDispatcher(
    adapter(s.db),
    { ...s.identity, tenantId: "tenant_abc" },
    s.connector,
    async () => {},
  );
  await assert.rejects(
    real.run("fixture_pilot", "real_request"),
    /LIVE_DISABLED/,
  );
  s.db.close();
});
test("pilot: revocation between calls blocks further dispatch, publication and evidence staging", async () => {
  const s = await setup();
  s.setHook(async () => {
    s.db.exec("UPDATE customer_memberships SET active=0");
  });
  await assert.rejects(s.dispatcher.run("fixture_pilot", "revoked_request"));
  assert.equal(s.calls(), 1);
  assert.equal(
    (
      s.db
        .prepare("SELECT count(*) n FROM customer_import_reviews")
        .get() as any
    ).n,
    0,
  );
  assert.equal(
    (s.db.prepare("SELECT state FROM customer_pilot_jobs").get() as any).state,
    "blocked",
  );
  s.db.close();
});
test("pilot: simultaneous duplicate jobs share one durable execution", async () => {
  const s = await setup();
  const results = await Promise.all([
    s.dispatcher.run("fixture_pilot", "concurrent_request"),
    s.dispatcher.run("fixture_pilot", "concurrent_request"),
  ]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(s.calls(), 16);
  s.db.close();
});
test("pilot transport: rejects private/mixed DNS, redirect and oversized streams; pins the approved address list", async () => {
  for (const ip of [
    "127.0.0.1",
    "169.254.169.254",
    "10.0.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(publicV4(ip), false);
  let opens = 0;
  let addresses = ["8.8.8.8", "127.0.0.1"];
  let status = 200;
  let size = 2;
  const c: PinnedFixtureConnector = {
    mode: "synthetic",
    async resolve() {
      return addresses;
    },
    async open(_r, pinned) {
      opens++;
      assert.deepEqual(pinned, ["8.8.8.8"]);
      return {
        status,
        contentType: "text/plain",
        chunks: (async function* () {
          yield new Uint8Array(size);
        })(),
      };
    },
  };
  const t = new PilotTransport(
    c,
    [{ host: "sources.example", paths: ["/approved"] }],
    async () => {},
  );
  const req = {
    url: "https://sources.example/approved/page",
    method: "GET" as const,
    credential: null,
  };
  await assert.rejects(t.exchange(req), /SOURCE_ADDRESS_DENIED/);
  assert.equal(opens, 0);
  addresses = ["8.8.8.8"];
  await assert.rejects(
    t.exchange({ ...req, url: "https://sources.example/approved-evil" }),
    /SOURCE_NOT_GRANTED/,
  );
  status = 302;
  await assert.rejects(t.exchange(req), /SOURCE_REDIRECT_DENIED/);
  status = 200;
  size = 200001;
  await assert.rejects(t.exchange(req), /SOURCE_TOO_LARGE/);
});

test("pilot: aggregate cap spans calendar months and unknown usage is not released", async () => {
  const s = await setup(110000);
  const first = await s.dispatcher.run("fixture_pilot", "cross_month_base");
  await s.decide(first.id);
  // Simulate an interrupted earlier-month provider call in the same pilot.
  s.db
    .prepare("UPDATE customer_pilot_jobs SET state='running' WHERE id=?")
    .run(first.id);
  const month = "2026-09";
  s.db
    .prepare("INSERT INTO customer_provider_limits VALUES(?,?,?,?,?,?)")
    .run(
      scope.tenantId,
      scope.propertyId,
      month,
      100000,
      200000,
      rateCard.version,
    );
  s.db
    .prepare(
      "INSERT INTO customer_provider_calls VALUES(?,?,?,?,?,?,?,'reserved')",
    )
    .run(
      scope.tenantId,
      scope.propertyId,
      month,
      first.id,
      "interrupted_prior_month",
      70000,
      70000,
    );
  s.db
    .prepare(
      "UPDATE customer_provider_calls SET state='unknown' WHERE call_key='interrupted_prior_month'",
    )
    .run();
  s.db
    .prepare("UPDATE customer_pilot_jobs SET state='pending-review' WHERE id=?")
    .run(first.id);
  const next = await s.dispatcher.run("fixture_pilot", "cross_month_next");
  assert.equal(next.state, "pending-review");
  // Add to the second job up to the combined cap; a further call is blocked even in another month.
  s.db
    .prepare("UPDATE customer_pilot_jobs SET state='running' WHERE id=?")
    .run(next.id);
  const sum = Number(
    (
      s.db
        .prepare("SELECT sum(accounted_micros) n FROM customer_provider_calls")
        .get() as any
    ).n,
  );
  const remaining = Math.min(
    100000 -
      Number(
        (
          s.db
            .prepare(
              "SELECT sum(accounted_micros) n FROM customer_provider_calls WHERE job_id=?",
            )
            .get(next.id) as any
        ).n,
      ),
    110000 - sum,
  );
  s.db
    .prepare(
      "INSERT INTO customer_provider_calls VALUES(?,?,?,?,?,?,?,'reserved')",
    )
    .run(
      scope.tenantId,
      scope.propertyId,
      month,
      next.id,
      "reserve_remaining",
      remaining,
      remaining,
    );
  assert.throws(
    () =>
      s.db
        .prepare(
          "INSERT INTO customer_provider_calls VALUES(?,?,?,?,?,?,?,'reserved')",
        )
        .run(
          scope.tenantId,
          scope.propertyId,
          month,
          next.id,
          "over_cap",
          1,
          1,
        ),
    /BUDGET/,
  );
  assert.equal(
    (
      s.db
        .prepare(
          "SELECT accounted_micros FROM customer_provider_calls WHERE call_key='interrupted_prior_month'",
        )
        .get() as any
    ).accounted_micros,
    70000,
  );
  s.db.close();
});
test("pilot: expiry and lost leases prevent dispatch; expired jobs cannot automatically restart", async () => {
  const s = await setup();
  s.db
    .prepare("INSERT INTO customer_pilot_policy VALUES(?,?,?,?,?,?,?)")
    .run(
      scope.tenantId,
      scope.propertyId,
      "expired_policy",
      Date.now() - 1,
      2,
      200000,
      "{}",
    );
  await assert.rejects(s.dispatcher.run("expired_policy", "expired_request"));
  assert.equal(s.calls(), 0);
  s.setHook(async () => {
    s.db.exec(
      "UPDATE customer_pilot_jobs SET lease_until=0 WHERE state='running'",
    );
  });
  const first = await s.dispatcher.run("fixture_pilot", "lost_lease_request");
  assert.equal(first.state, "blocked");
  assert.equal(s.calls(), 1);
  await s.dispatcher.run("fixture_pilot", "lost_lease_request");
  assert.equal(s.calls(), 1);
  assert.equal(
    (
      s.db
        .prepare("SELECT count(*) n FROM customer_import_reviews")
        .get() as any
    ).n,
    0,
  );
  s.db.close();
});
test("pilot: stale review approval cannot overwrite newer published findings", async () => {
  const s = await setup();
  const r = await s.dispatcher.run("fixture_pilot", "stale_review_request");
  const staged = await s.reviews.execute(scope, {
    operation: "read",
    reviewId: r.id,
  });
  const other = structuredClone(staged.batch) as Ingestion;
  other.batchKey = "independent_review";
  await s.reviews.execute(scope, { operation: "stage", batch: other });
  await s.decide(other.batchKey);
  await assert.rejects(s.decide(r.id), /Market changed/);
  assert.equal(
    (await s.reviews.execute(scope, { operation: "read", reviewId: r.id }))
      .status,
    "pending",
  );
  s.db.close();
});

test("pilot transport: cancellation during DNS prevents a late exchange", async () => {
  let release!: (value: string[]) => void;
  let opens = 0;
  const connector: PinnedFixtureConnector = {
    mode: "synthetic",
    resolve: () =>
      new Promise((r) => {
        release = r;
      }),
    async open() {
      opens++;
      throw Error("Must not open");
    },
  };
  const abort = new AbortController();
  const transport = new PilotTransport(
    connector,
    [{ host: "sources.example", paths: ["/"] }],
    async () => {},
  );
  const promise = transport.exchange(
    { url: "https://sources.example/page", method: "GET", credential: null },
    abort.signal,
  );
  await new Promise((r) => setImmediate(r));
  abort.abort();
  await assert.rejects(promise, /SOURCE_TIMEOUT/);
  release(["8.8.8.8"]);
  await new Promise((r) => setImmediate(r));
  assert.equal(opens, 0);
});

test("pilot: snapshot consumer sees only exact approved evidence; rejection and blocked jobs cannot publish", async () => {
  const s = await setup();
  const r = await s.dispatcher.run("fixture_pilot", "snapshot_request");
  await assert.rejects(
    s.dispatcher.approvedSnapshot(r.id),
    /PILOT_REVIEW_REQUIRED/,
  );
  s.db
    .prepare("UPDATE customer_pilot_jobs SET state='blocked' WHERE id=?")
    .run(r.id);
  await assert.rejects(s.decide(r.id), /PILOT_NOT_REVIEWABLE/);
  assert.equal(
    (s.db.prepare("SELECT revision FROM customer_markets").get() as any)
      .revision,
    0,
  );
  s.db
    .prepare("UPDATE customer_pilot_jobs SET state='pending-review' WHERE id=?")
    .run(r.id);
  await s.decide(r.id);
  const snapshot = await s.dispatcher.approvedSnapshot(r.id);
  assert.equal(snapshot.market.records.length, 5);
  const second = await s.dispatcher.run("fixture_pilot", "snapshot_followup");
  await s.decide(second.id);
  assert.deepEqual(await s.dispatcher.approvedSnapshot(r.id), snapshot);
  assert.equal(s.calls(), 32);
  s.db.close();
});
