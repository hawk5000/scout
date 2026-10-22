import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  database,
  scope,
  adapter,
  provision,
  auth,
} from "./helpers/customer-market";
import { OpenAiPilotDispatcher } from "../src/research/openai-pilot";
import { CustomerStore } from "../src/customer/store";
import { customerDraftProfile } from "../src/customer/contracts";

test("OpenAI pilot migration is additive, empty, and refuses synthetic policy scopes", () => {
  const db = database();
  for (const file of [
    "0004_reviewed_imports.sql",
    "0005_scout_expansion.sql",
    "0006_provider_preparation.sql",
    "0007_pilot_dispatch.sql",
    "0008_openai_manual_pilot.sql",
    "0009_sil_research_permission.sql",
  ])
    db.exec(readFileSync(`cloudflare/migrations/${file}`, "utf8"));

  for (const table of [
    "customer_openai_pilot_policies",
    "customer_openai_pilot_jobs",
    "customer_openai_pilot_drafts",
    "customer_openai_pilot_briefings",
  ]) {
    assert.equal(
      (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number })
        .n,
      0,
    );
  }
  assert.throws(() => {
    db.prepare(
      "INSERT INTO customer_openai_pilot_policies(tenant_id,property_id,id,expires_at,total_micros,max_categories,allowed_domains_json,retention_policy,approved_by,approved_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
    ).run(
      scope.tenantId,
      scope.propertyId,
      "fixture-policy",
      Date.now() + 86400000,
      1250000,
      5,
      JSON.stringify({
        domains: Object.fromEntries(
          ["corporate", "project", "event", "competitor", "property"].map(
            (category) => [category, ["sources.example"]],
          ),
        ),
        approvalVersion: "fixture-only",
      }),
      "fixture policy",
      "fixture_operator",
      new Date().toISOString(),
    );
  }, /OPENAI_REAL_SCOPE_REQUIRED/);
  db.close();
});

test("real OpenAI pilot status refuses the isolated synthetic tenant before provider access", async () => {
  const db = database();
  for (const file of [
    "0004_reviewed_imports.sql",
    "0005_scout_expansion.sql",
    "0006_provider_preparation.sql",
    "0007_pilot_dispatch.sql",
    "0008_openai_manual_pilot.sql",
    "0009_sil_research_permission.sql",
  ])
    db.exec(readFileSync(`cloudflare/migrations/${file}`, "utf8"));
  let networkCalls = 0;
  const syntheticScope = {
    tenantId: scope.tenantId,
    propertyId: scope.propertyId,
    actor: "fixture_operator",
    sessionHash: "fixture-session-hash",
    role: "admin",
  } as const;
  const dispatcher = new OpenAiPilotDispatcher(
    adapter(db),
    syntheticScope,
    "synthetic-test-key",
    async () => syntheticScope,
    (async () => {
      networkCalls++;
      throw new Error("Provider network must remain unused in fixtures.");
    }) as typeof fetch,
  );
  await assert.rejects(dispatcher.status(), /synthetic workspaces/);
  assert.equal(networkCalls, 0);
  assert.equal(
    (
      db.prepare("SELECT count(*) AS n FROM customer_provider_calls").get() as {
        n: number;
      }
    ).n,
    0,
  );
  db.close();
});

test("ABC Hotel editor status exposes disabled gates without an OpenAI request", async () => {
  const db = database();
  for (const file of [
    "0004_reviewed_imports.sql",
    "0005_scout_expansion.sql",
    "0006_provider_preparation.sql",
    "0007_pilot_dispatch.sql",
    "0008_openai_manual_pilot.sql",
    "0009_sil_research_permission.sql",
  ])
    db.exec(readFileSync(`cloudflare/migrations/${file}`, "utf8"));
  const tenantId = "tenant_abc";
  const propertyId = "property_abc_abc_hotel";
  const userId = "user_info_abchotel_com";
  provision(db, tenantId, propertyId, userId, "editor");
  const profile = customerDraftProfile.parse({
    name: "ABC Hotel",
    address:
      "9790 Northeast Tanasbourne Dr, Hillsboro, Oregon 97124, United States",
    marketCenter: "Hillsboro",
    radiusMiles: 10,
    includedPlaces: ["Hillsboro", "Beaverton"],
  });
  db.prepare(
    "UPDATE customer_properties SET profile_json=?,last_actor=?,updated_at=? WHERE tenant_id=? AND property_id=?",
  ).run(
    JSON.stringify(profile),
    userId,
    new Date().toISOString(),
    tenantId,
    propertyId,
  );
  const identityAuth = auth(tenantId, propertyId, userId);
  const store = new CustomerStore(adapter(db), identityAuth);
  const login = await store.login("info@abchotel.com", "fixture-only", "test");
  const scoped = await store.expansionScope(login.token);
  let networkCalls = 0;
  const dispatcher = new OpenAiPilotDispatcher(
    adapter(db),
    scoped,
    "synthetic-test-key",
    () => store.expansionScope(login.token),
    (async () => {
      networkCalls++;
      throw new Error("The provider must not be called while disabled.");
    }) as typeof fetch,
  );
  const status = await dispatcher.status();
  assert.equal(status.ready, false);
  assert.equal(status.manualRunEnabled, false);
  assert.equal(status.schedulesEnabled, false);
  assert.equal(status.notificationsEnabled, false);
  assert.ok(status.blockers.includes("SOURCE_POLICY_NOT_INSTALLED"));
  assert.ok(status.blockers.includes("HOTEL_RESEARCH_AREA_REQUIRED"));
  assert.ok(status.blockers.includes("SCOUT_RESEARCH_PERMISSION_REQUIRED"));
  assert.equal(networkCalls, 0);
  assert.equal(
    (
      db.prepare("SELECT count(*) AS n FROM customer_provider_calls").get() as {
        n: number;
      }
    ).n,
    0,
  );
  assert.equal(
    (
      db
        .prepare(
          "SELECT count(*) AS n FROM customer_markets WHERE tenant_id=? AND property_id=?",
        )
        .get(tenantId, propertyId) as { n: number }
    ).n,
    0,
  );
  db.close();
});

async function pilotSetup() {
  const db = database();
  for (const file of [
    "0004_reviewed_imports.sql",
    "0005_scout_expansion.sql",
    "0006_provider_preparation.sql",
    "0007_pilot_dispatch.sql",
    "0008_openai_manual_pilot.sql",
    "0009_sil_research_permission.sql",
  ])
    db.exec(readFileSync(`cloudflare/migrations/${file}`, "utf8"));
  const tenant = "tenant_abc",
    property = "property_abc_abc_hotel",
    user = "unit_test_admin";
  provision(db, tenant, property, user, "editor");
  db.prepare(
    "UPDATE customer_properties SET last_actor='unit_test_admin',updated_at='2026-10-22T00:00:00Z',profile_json=? WHERE tenant_id=? AND property_id=?",
  ).run(
    JSON.stringify(
      customerDraftProfile.parse({
        name: "Unit test hotel",
        address: "Unit test address",
        marketCenter: "Unit test market",
        radiusMiles: 10,
      }),
    ),
    tenant,
    property,
  );
  const pilotAuth = auth(tenant, property, user);
  pilotAuth.validate = async () => ({ manualResearch: true });
  const store = new CustomerStore(adapter(db), pilotAuth);
  const login = await store.login("unit@example.com", "fixture-only", "unit");
  const scoped = await store.expansionScope(login.token);
  const identity = {
    name: "Unit test hotel",
    address: "Unit test address",
    locality: "Unit test market",
    domain: "",
    aliases: [],
    formerNames: [],
    brand: "",
  };
  const config = {
    memberships: { "comp-1": { version: 1, history: [] } },
    own: identity,
    competitors: [1, 2, 3].map((i) => ({
      ...identity,
      name: `Unit test competitor ${i}`,
      id: `comp-${i}`,
      active: true,
    })),
  };
  db.prepare(
    "INSERT INTO customer_expansion_config(tenant_id,property_id,revision,document_json,updated_at,actor,session_hash) VALUES(?,?,0,?,?,?,?)",
  ).run(
    tenant,
    property,
    JSON.stringify(config),
    new Date().toISOString(),
    user,
    scoped.sessionHash,
  );
  db.prepare("INSERT INTO customer_provider_limits VALUES(?,?,?,?,?,?)").run(
    tenant,
    property,
    new Date().toISOString().slice(0, 7),
    1250000,
    1250000,
    "2026-10-21-standard-v1",
  );
  const domains = {
    domains: Object.fromEntries(
      ["corporate", "project", "event", "competitor", "property"].map((c) => [
        c,
        ["sources.example"],
      ]),
    ),
    approvalVersion: "unit-test",
  };
  db.prepare(
    "INSERT INTO customer_openai_pilot_policies VALUES(?,?,?,?,?,?,?,?,?,?)",
  ).run(
    tenant,
    property,
    "unit-policy",
    Date.now() + 86400000,
    1250000,
    5,
    JSON.stringify(domains),
    "Unit test summaries only",
    user,
    new Date().toISOString(),
  );
  let calls = 0;
  const transport = {
    mode: "synthetic" as const,
    async exchange() {
      calls++;
      const url = "https://sources.example/activity";
      return {
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "completed",
          usage: { input_tokens: 1200, output_tokens: 180 },
          output: [
            {
              type: "web_search_call",
              action: {
                type: "search",
                sources: [
                  { type: "webpage", title: "Unit test evidence", url },
                ],
              },
            },
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "Unit test evidence summary.",
                  annotations: [
                    {
                      type: "url_citation",
                      url,
                      title: "Unit test evidence",
                      start_index: 0,
                      end_index: 26,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      };
    },
  };
  const dispatcher = new OpenAiPilotDispatcher(
    adapter(db),
    scoped,
    "unit-key",
    () => store.expansionScope(login.token),
    async () => {
      throw Error("No network permitted");
    },
    Date.now,
    () => transport,
  );
  return {
    db,
    dispatcher,
    calls: () => calls,
    tenant,
    property,
    revoke: () => {
      pilotAuth.validate = async () => ({ manualResearch: false });
    },
  };
}

test("manual pilot atomically persists five cited categories and briefing; duplicate and concurrent requests do not repeat spend", async () => {
  const { db, dispatcher, calls } = await pilotSetup();
  let state = await dispatcher.execute({
    action: "start",
    requestKey: "unit-request-1",
  });
  assert.equal(state.ready, true);
  const id = state.job!.id;
  await dispatcher.execute({ action: "start", requestKey: "unit-request-1" });
  await Promise.all([
    dispatcher.execute({ action: "advance", jobId: id }),
    dispatcher.execute({ action: "advance", jobId: id }),
  ]);
  assert.equal(calls(), 1);
  for (let i = 0; i < 4; i++)
    state = await dispatcher.execute({ action: "advance", jobId: id });
  assert.equal(state.job!.state, "complete");
  assert.equal(state.job!.drafts.length, 5);
  assert.ok(state.job!.briefing);
  assert.equal(calls(), 5);
  await dispatcher.execute({ action: "advance", jobId: id });
  assert.equal(calls(), 5);
  assert.ok(state.job!.spentUsd < 1.25);
  assert.equal(state.job!.reservedUsd, 0);
  assert.equal(
    (
      db
        .prepare(
          "SELECT count(*) n FROM customer_markets WHERE tenant_id='tenant_abc'",
        )
        .get() as { n: number }
    ).n,
    0,
  );
  db.close();
});

test("manual pilot stops on configuration drift without spend, and rejects a second policy", async () => {
  const { db, dispatcher, calls, tenant, property } = await pilotSetup();
  const state = await dispatcher.execute({
    action: "start",
    requestKey: "unit-drift-1",
  });
  db.prepare(
    "UPDATE customer_properties SET profile_json=json_set(profile_json,'$.radiusMiles',20) WHERE tenant_id=? AND property_id=?",
  ).run(tenant, property);
  const stopped = await dispatcher.execute({
    action: "advance",
    jobId: state.job!.id,
  });
  assert.equal(stopped.job!.state, "blocked");
  assert.equal(calls(), 0);
  assert.throws(
    () =>
      db.exec(
        "INSERT INTO customer_openai_pilot_policies SELECT tenant_id,property_id,'second',expires_at,total_micros,max_categories,allowed_domains_json,retention_policy,approved_by,approved_at FROM customer_openai_pilot_policies",
      ),
    /UNIQUE/,
  );
  db.close();
});

test("SIL revocation stops an existing editor pilot before spend; local role is unchanged", async () => {
  const { db, dispatcher, calls, revoke } = await pilotSetup();
  const state = await dispatcher.execute({
    action: "start",
    requestKey: "unit-revoke-1",
  });
  revoke();
  await assert.rejects(
    dispatcher.execute({ action: "advance", jobId: state.job!.id }),
    /reverified/,
  );
  assert.equal(calls(), 0);
  assert.equal(
    (
      db
        .prepare(
          "SELECT role FROM customer_memberships WHERE user_id='unit_test_admin'",
        )
        .get() as { role: string }
    ).role,
    "editor",
  );
  assert.equal(
    (
      db
        .prepare("SELECT count(*) n FROM customer_research_authorizations")
        .get() as { n: number }
    ).n,
    0,
  );
  db.close();
});
