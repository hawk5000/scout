import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { database, adapter, provision, auth } from "./helpers/customer-market";
import { CustomerStore } from "../src/customer/store";
import { customerDraftProfile } from "../src/customer/contracts";
import {
  BlueprintWorkflow,
  normalizeBlueprintItems,
} from "../src/research/blueprint-workflow";
import {
  blueprintPrompt,
  researchedItems,
} from "../src/research/blueprint-plan";
import { ReviewedImports } from "../src/customer/reviewed-imports";
import { ProviderLedger } from "../src/research/provider-ledger";

async function setup() {
  const db = database();
  for (const f of readdirSync("cloudflare/migrations")
    .filter((f) => /^00(0[4-9]|1[0-5])_/.test(f))
    .sort())
    db.exec(readFileSync("cloudflare/migrations/" + f, "utf8"));
  const tenant = "isolated_blueprint_tenant",
    property = "isolated_blueprint_property",
    user = "isolated_user";
  provision(db, tenant, property, user);
  db.prepare(
    "UPDATE customer_properties SET profile_json=?,last_actor='isolated_user',updated_at='2026-10-23T00:00:00.000Z' WHERE tenant_id=? AND property_id=?",
  ).run(
    JSON.stringify(
      customerDraftProfile.parse({
        name: "Internal hotel",
        address: "100 Test Street",
        marketCenter: "Test market",
        radiusMiles: 10,
        includedPlaces: ["Test market"],
      }),
    ),
    tenant,
    property,
  );
  const a = auth(tenant, property, user);
  a.validate = async () => ({ manualResearch: true });
  const store = new CustomerStore(adapter(db), a);
  const login = await store.login("unit@example.com", "fixture-only", "test");
  const scope = await store.expansionScope(login.token);
  const identity = {
    name: "Test hotel",
    address: "100 Test Street",
    locality: "Test market",
    domain: "",
    aliases: [],
    formerNames: [],
    brand: "",
  };
  db.prepare(
    "INSERT INTO customer_expansion_config(tenant_id,property_id,revision,document_json,updated_at,actor,session_hash) VALUES(?,?,0,?,?,?,?)",
  ).run(
    tenant,
    property,
    JSON.stringify({
      own: identity,
      competitors: [1, 2, 3].map((n) => ({
        ...identity,
        id: `comp-${n}`,
        name: `Competitor ${n}`,
        active: true,
      })),
    }),
    new Date().toISOString(),
    user,
    scope.sessionHash,
  );
  await new ReviewedImports(adapter(db)).execute(
    { ...scope, dataMode: "reviewed" },
    { operation: "enroll", confirmPropertyId: property },
  );
  db.prepare("INSERT INTO customer_provider_limits VALUES(?,?,?,?,?,?)").run(
    tenant,
    property,
    new Date().toISOString().slice(0, 7),
    1250000,
    1250000,
    "2026-10-21-standard-v1",
  );
  let calls = 0;
  const item = {
    name: "Established Test Employer",
    localAddress: "200 Test Street, Test market",
    website: "https://sources.example.org/facility",
    type: "employer",
    fact: "The organization operates a manufacturing facility at 200 Test Street.",
    inference: "Visiting technical teams could need lodging; unverified.",
    nextStep: "Qualify the local facility's travel purchasing process.",
    unknowns: ["Travel volumes unknown."],
    sourceUrls: ["https://sources.example.org/facility"],
    publishedAt: null,
    start: null,
    end: null,
    venue: null,
    organizer: null,
    contractor: null,
    stage: "Active",
  };
  const workflow = new BlueprintWorkflow(
    adapter(db),
    scope,
    "fixture-key",
    () => store.expansionScope(login.token),
    async () => {
      calls++;
      const text = JSON.stringify({
        items: [item],
        gaps: ["Only one source sampled."],
      });
      return Response.json({
        status: "completed",
        usage: { input_tokens: 1000, output_tokens: 500 },
        output: [
          {
            type: "web_search_call",
            action: {
              type: "search",
              sources: [{ url: item.sourceUrls[0], title: "Test facility" }],
            },
          },
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text,
                annotations: [
                  {
                    type: "url_citation",
                    url: item.sourceUrls[0],
                    start_index: 0,
                    end_index: text.length,
                  },
                ],
              },
            ],
          },
        ],
      });
    },
  );
  async function approve(id = "approval-one", maxCalls = 2) {
    const v = await workflow.status();
    db.prepare(
      "INSERT INTO customer_blueprint_approvals VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      tenant,
      property,
      id,
      v.planHash,
      "baseline",
      maxCalls,
      928000,
      1250000,
      Date.now() + 3600000,
      JSON.stringify(
        Object.fromEntries(
          ["corporate", "event", "project", "competitor", "property"].map(
            (c) => [c, ["sources.example.org"]],
          ),
        ),
      ),
      user,
      new Date().toISOString(),
    );
    return v;
  }
  return {
    db,
    tenant,
    property,
    scope,
    workflow,
    approve,
    calls: () => calls,
    item,
  };
}
test("blueprint mode plans baseline segments and individual competitors; identity and approval gates make no provider calls", async () => {
  const x = await setup();
  const v = await x.workflow.status();
  assert.equal(v.plan.steps.length, 9);
  assert.equal(
    v.plan.steps.filter((s) => s.category === "competitor").length,
    3,
  );
  assert.equal(v.baselineCount, 0);
  assert.equal(
    v.plan.steps.at(-1)?.blocked?.includes("not been confirmed"),
    true,
  );
  assert.match(
    blueprintPrompt(v.plan, v.plan.steps[0], "2026-10-23"),
    /not just recent news/,
  );
  await assert.rejects(
    x.workflow.execute({
      action: "start",
      mode: "update",
      approvalId: "none",
      requestKey: crypto.randomUUID(),
    }),
    /baseline/,
  );
  await assert.rejects(
    x.workflow.execute({
      action: "start",
      mode: "baseline",
      approvalId: "none",
      requestKey: crypto.randomUUID(),
    }),
    /approval/,
  );
  assert.equal(x.calls(), 0);
  x.db.close();
});
test("bounded baseline persists private evidence and partial briefing, deduplicates repeat discoveries, and never publishes automatically", async () => {
  const x = await setup();
  await x.approve();
  const requestKey = crypto.randomUUID();
  let v = await x.workflow.execute({
    action: "start",
    mode: "baseline",
    approvalId: "approval-one",
    requestKey,
  });
  await x.workflow.execute({
    action: "start",
    mode: "baseline",
    approvalId: "approval-one",
    requestKey,
  });
  assert.equal(v.jobs.length, 1);
  const id = v.jobs[0].id;
  for (let n = 0; n < 9; n++)
    v = await x.workflow.execute({ action: "advance", jobId: id });
  assert.equal(x.calls(), 2);
  assert.equal(v.jobs[0].state, "partial");
  assert.equal(v.baselineCount, 0);
  assert.equal(v.jobs[0].brief?.coverage, "incomplete");
  const review = await new ReviewedImports(adapter(x.db)).execute(
    { ...x.scope, dataMode: "reviewed" },
    { operation: "read", reviewId: v.jobs[0].reviewId },
  );
  const proposed = review.proposed as any;
  assert.equal(proposed.records.length, 1);
  assert.equal(proposed.records[0].entity.localAddress, x.item.localAddress);
  assert.equal(proposed.records[0].discovery, "market-context");
  assert.equal(proposed.records[0].evidence[0].basis, "provider-citation");
  assert.equal(proposed.records[0].versions.length, 1);
  assert.equal(
    x.db
      .prepare(
        "SELECT revision FROM customer_markets WHERE tenant_id=? AND property_id=?",
      )
      .get(x.tenant, x.property)!.revision,
    0,
  );
  await new ReviewedImports(adapter(x.db)).execute(
    { ...x.scope, dataMode: "reviewed" },
    {
      operation: "decide",
      reviewId: review.reviewId,
      approvalHash: review.approvalHash,
      decision: "approved",
      note: "Fixture-only source review and inference verification.",
      evidenceReviewed: true,
      lodgingInferenceReviewed: true,
    },
  );
  const saved = await x.workflow.status();
  assert.equal(saved.baselineCount, 1);
  assert.equal(saved.baselineStatus, "partial");
  await x.workflow.execute({ action: "advance", jobId: id });
  assert.equal(x.calls(), 2);
  await x.approve("approval-two");
  let second = await x.workflow.execute({
    action: "start",
    mode: "baseline",
    approvalId: "approval-two",
    requestKey: crypto.randomUUID(),
  });
  const secondId = second.jobs.find((j) => j.id !== id)!.id;
  for (let n = 0; n < 9; n++)
    second = await x.workflow.execute({ action: "advance", jobId: secondId });
  assert.equal(second.jobs.find((j) => j.id === secondId)!.state, "no-change");
  assert.equal(
    second.jobs.find((j) => j.id === secondId)!.brief?.existingContext.length,
    1,
  );
  x.db.close();
});
test("lease concurrency and cumulative previous spending prevent duplicate or over-cap calls", async () => {
  const x = await setup();
  await x.approve();
  let v = await x.workflow.execute({
    action: "start",
    mode: "baseline",
    approvalId: "approval-one",
    requestKey: crypto.randomUUID(),
  });
  const id = v.jobs[0].id;
  x.db
    .prepare("INSERT INTO customer_provider_limits VALUES(?,?,?,?,?,?)")
    .run(
      x.tenant,
      x.property,
      "2026-09",
      1250000,
      1250000,
      "2026-10-21-standard-v1",
    );
  x.db
    .prepare("INSERT INTO customer_provider_calls VALUES(?,?,?,?,?,?,?,?)")
    .run(
      x.tenant,
      x.property,
      "2026-09",
      "prior-job",
      "prior-call",
      900000,
      900000,
      "reserved",
    );
  x.db
    .prepare(
      "UPDATE customer_provider_calls SET state='known' WHERE tenant_id=? AND property_id=? AND job_id='prior-job'",
    )
    .run(x.tenant, x.property);
  const attempts = await Promise.allSettled([
    x.workflow.execute({ action: "advance", jobId: id }),
    x.workflow.execute({ action: "advance", jobId: id }),
  ]);
  assert.equal(attempts.filter((r) => r.status === "rejected").length, 1);
  assert.equal(x.calls(), 0);
  assert.equal((await x.workflow.status()).jobs[0].step, 1);
  const wrong = new ProviderLedger(
    adapter(x.db),
    {
      tenantId: x.tenant,
      propertyId: "other",
      jobId: id,
      month: new Date().toISOString().slice(0, 7),
    },
    true,
    { lease: "wrong", step: 1, blueprint: true },
  );
  assert.equal(await wrong.reserve("step-1", 464000), false);
  x.db.close();
});
test("source binding and stale event validation reject unsupported findings", async () => {
  const x = await setup();
  const parsed = researchedItems.parse({ items: [x.item], gaps: [] });
  const step = (await x.workflow.status()).plan.steps[0];
  await assert.rejects(
    normalizeBlueprintItems(parsed, step, [], new Date().toISOString()),
    /ITEM_SOURCE_NOT_CITED/,
  );
  const event = researchedItems.parse({
    items: [
      {
        ...x.item,
        start: "2020-01-01",
        venue: "Test venue",
        organizer: "Test organizer",
      },
    ],
    gaps: [],
  });
  await assert.rejects(
    normalizeBlueprintItems(
      event,
      { ...step, category: "event" },
      x.item.sourceUrls,
      new Date().toISOString(),
    ),
    /STALE/,
  );
  x.db.close();
});

test("identity confirmation is scoped, preserves account label, and invalidates after configuration changes", async () => {
  const x = await setup();
  const v = await x.workflow.status();
  const before = x.db
    .prepare(
      "SELECT property_name,profile_json FROM customer_properties WHERE tenant_id=? AND property_id=?",
    )
    .get(x.tenant, x.property);
  const identity = {
    name: "Public Test Hotel",
    address: "100 Test Street, Test market",
    website: "https://hotel.example.org/property",
    sourceUrl: "https://hotel.example.org/property",
  };
  await x.workflow.execute({
    action: "confirm-identity",
    subjectId: "own",
    identity,
    configurationHash: v.configurationHash,
    confirmed: true,
  });
  assert.equal((await x.workflow.status()).identities.own.name, identity.name);
  assert.deepEqual(
    x.db
      .prepare(
        "SELECT property_name,profile_json FROM customer_properties WHERE tenant_id=? AND property_id=?",
      )
      .get(x.tenant, x.property),
    before,
  );
  await assert.rejects(
    x.workflow.execute({
      action: "confirm-identity",
      subjectId: "other-hotel",
      identity,
      configurationHash: v.configurationHash,
      confirmed: true,
    }),
    /Unknown/,
  );
  x.db
    .prepare(
      "UPDATE customer_properties SET profile_json=json_set(profile_json,'$.radiusMiles',20) WHERE tenant_id=? AND property_id=?",
    )
    .run(x.tenant, x.property);
  assert.equal((await x.workflow.status()).identities.own, undefined);
  assert.equal(x.calls(), 0);
  x.db.close();
});
