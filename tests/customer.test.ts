import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CustomerStore,
  type Database,
  type Statement,
} from "../src/customer/store";
import {
  CustomerError,
  customerMutation,
  emptyCoverage,
  readJson,
} from "../src/customer/contracts";
import { SilAuth, type AuthProvider, type Identity } from "../src/customer/sil";
import worker from "../cloudflare/customer/worker";
const migration = readFileSync(
  "cloudflare/migrations/0002_customer_accounts.sql",
  "utf8",
);
function adapter(db: DatabaseSync): Database {
  return {
    prepare(sql) {
      let values: unknown[] = [];
      const statement: Statement = {
        bind(...v) {
          values = v;
          return statement;
        },
        async first<T>() {
          return (db.prepare(sql).get(...(values as never[])) ??
            null) as T | null;
        },
        async run() {
          // D1 reports trigger writes in meta.changes, unlike SQLite's run().changes.
          const total = () =>
            Number(db.prepare("SELECT total_changes() AS n").get()!.n);
          const before = total();
          db.prepare(sql).run(...(values as never[]));
          return { meta: { changes: total() - before } };
        },
      };
      return statement;
    },
  };
}
const who = (
  tenant = "a",
  property = "p",
  user = "u",
): Identity & { propertyName: string } => ({
  tenantId: tenant,
  propertyId: property,
  userId: user,
  appKey: "scout",
  credentialVersion: 1,
  sessionIssuedAt: new Date().toISOString(),
  propertyName: "Test hotel",
});
function provision(
  db: DatabaseSync,
  tenant = "a",
  property = "p",
  user = "u",
  role = "editor",
) {
  db.prepare(
    "INSERT OR IGNORE INTO customer_properties(tenant_id,property_id,property_name) VALUES(?,?,?)",
  ).run(tenant, property, "Test hotel");
  db.prepare(
    "INSERT INTO customer_memberships(tenant_id,property_id,user_id,role) VALUES(?,?,?,?)",
  ).run(tenant, property, user, role);
}
function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON;" + migration);
  provision(db);
  return db;
}
const profile = {
  name: "Private hotel",
  website: "https://hotel.example",
  address: "Test address",
  timezone: "America/Los_Angeles",
  confirmed: true,
  marketCenter: "Test city",
  radiusMiles: 10,
  includedPlaces: ["Test city"],
  excludedPlaces: [],
  categories: ["corporate", "project", "event"],
  priorities: [],
  exclusions: [],
  recipients: [],
  scheduleDays: ["Tuesday", "Friday"],
  scheduleTime: "09:00",
};
const update = () =>
  customerMutation.parse({ revision: 0, profile, coverage: emptyCoverage });
function auth(identity = who()): AuthProvider {
  return {
    async login() {
      return identity;
    },
    async validate() {},
  };
}
test("customer data survives restart, has no fixtures, and audits successful writes atomically", async () => {
  const dir = mkdtempSync(join(tmpdir(), "scout-account-"));
  let db = new DatabaseSync(join(dir, "db.sqlite"));
  try {
    db.exec("PRAGMA foreign_keys=ON;" + migration);
    provision(db);
    let store = new CustomerStore(adapter(db), auth());
    const { token } = await store.login("a@example.com", "not-real", "test");
    assert.equal((await store.workspace(token)).profile, null);
    await store.update(token, update());
    assert.equal(
      db
        .prepare(
          "SELECT count(*) AS n FROM customer_audit WHERE action='workspace_updated'",
        )
        .get()!.n,
      1,
    );
    assert.notEqual(
      db.prepare("SELECT token_hash FROM customer_sessions").get()!.token_hash,
      token,
    );
    db.close();
    db = new DatabaseSync(join(dir, "db.sqlite"));
    store = new CustomerStore(adapter(db), auth());
    const state = await store.workspace(token);
    assert.equal(state.profile!.name, "Private hotel");
    assert.deepEqual(state.findings, []);
    assert.equal(state.researchEnabled, false);
    assert.equal(state.notificationsEnabled, false);
    assert.equal(state.paidCallsEnabled, false);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("separate tenants and same-tenant properties cannot see or overwrite private profiles", async () => {
  const db = setup();
  try {
    provision(db, "b");
    provision(db, "a", "other");
    const a = new CustomerStore(adapter(db), auth()),
      b = new CustomerStore(adapter(db), auth(who("b"))),
      c = new CustomerStore(adapter(db), auth(who("a", "other")));
    const sa = await a.login("a@example.com", "x", "test"),
      sb = await b.login("b@example.com", "x", "test"),
      sc = await c.login("c@example.com", "x", "test");
    await a.update(sa.token, update());
    assert.equal((await b.workspace(sb.token)).profile, null);
    assert.equal((await c.workspace(sc.token)).profile, null);
    assert.throws(() => customerMutation.parse({ ...update(), tenantId: "a" }));
    await assert.rejects(() => a.workspace("forged"), { status: 401 });
  } finally {
    db.close();
  }
});
test("viewer restrictions, stale revisions, and concurrent saves preserve the winning write", async () => {
  const db = setup();
  try {
    provision(db, "a", "p", "viewer", "viewer");
    const store = new CustomerStore(adapter(db), auth()),
      viewer = new CustomerStore(adapter(db), auth(who("a", "p", "viewer")));
    const s = await store.login("a@example.com", "x", "test"),
      v = await viewer.login("v@example.com", "x", "test");
    await assert.rejects(() => viewer.update(v.token, update()), {
      status: 403,
    });
    const result = await Promise.allSettled([
      store.update(s.token, update()),
      store.update(s.token, {
        ...update(),
        profile: { ...update().profile, name: "Concurrent" },
      }),
    ]);
    assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await store.workspace(s.token)).revision, 1);
    assert.equal(
      db
        .prepare(
          "SELECT count(*) AS n FROM customer_audit WHERE action='workspace_updated'",
        )
        .get()!.n,
      1,
    );
  } finally {
    db.close();
  }
});
test("revocation, role changes, local expiry and logout invalidate stored sessions", async () => {
  const db = setup();
  try {
    let now = Date.now();
    const store = new CustomerStore(adapter(db), auth(), () => now);
    let s = await store.login("a@example.com", "x", "test");
    await store.logout(s.token);
    await assert.rejects(() => store.workspace(s.token), { status: 401 });
    s = await store.login("a@example.com", "x", "test");
    now += 8 * 3600000;
    await assert.rejects(() => store.workspace(s.token), { status: 401 });
    s = await store.login("a@example.com", "x", "test");
    db.exec("UPDATE customer_memberships SET role='viewer'");
    await assert.rejects(() => store.workspace(s.token), { status: 401 });
    s = await store.login("a@example.com", "x", "test");
    db.exec("UPDATE customer_properties SET active=0");
    await assert.rejects(() => store.workspace(s.token), { status: 401 });
    await assert.rejects(() => store.login("a@example.com", "x", "test"), {
      status: 401,
    });
  } finally {
    db.close();
  }
});
test("SIL revocation deletes local session; SIL outage fails closed without losing data", async () => {
  const db = setup();
  try {
    let denial = false,
      outage = false;
    const provider = auth();
    provider.validate = async () => {
      if (denial) throw new CustomerError("revoked", 401);
      if (outage) throw new CustomerError("outage", 503);
    };
    const store = new CustomerStore(adapter(db), provider);
    const s = await store.login("a@example.com", "x", "test");
    await store.update(s.token, update());
    outage = true;
    await assert.rejects(() => store.workspace(s.token), { status: 503 });
    outage = false;
    assert.equal((await store.workspace(s.token)).revision, 1);
    denial = true;
    await assert.rejects(() => store.workspace(s.token), { status: 401 });
    assert.equal(
      db.prepare("SELECT count(*) AS n FROM customer_sessions").get()!.n,
      0,
    );
  } finally {
    db.close();
  }
});
test("durable login throttle bounds credential checks and missing local membership denies", async () => {
  const db = setup();
  try {
    let count = 0;
    const provider = auth(who("missing"));
    provider.login = async () => {
      count++;
      throw new CustomerError("denied", 401);
    };
    const store = new CustomerStore(adapter(db), provider);
    for (let i = 0; i < 10; i++)
      await assert.rejects(() => store.login("a@example.com", "x", "test"), {
        status: 401,
      });
    await assert.rejects(
      () =>
        new CustomerStore(adapter(db), provider).login(
          "a@example.com",
          "x",
          "test",
        ),
      { status: 429 },
    );
    assert.equal(count, 10);
    await assert.rejects(
      () =>
        new CustomerStore(adapter(db), auth(who("missing"))).login(
          "other@example.com",
          "x",
          "test",
        ),
      { status: 401 },
    );
  } finally {
    db.close();
  }
});
test("profile write rolls back if its audit cannot persist", async () => {
  const db = setup();
  try {
    const store = new CustomerStore(adapter(db), auth());
    const s = await store.login("a@example.com", "x", "test");
    db.exec(
      "CREATE TRIGGER fail_audit BEFORE INSERT ON customer_audit BEGIN SELECT RAISE(ABORT,'test failure'); END;",
    );
    await assert.rejects(() => store.update(s.token, update()));
    assert.equal((await store.workspace(s.token)).revision, 0);
  } finally {
    db.close();
  }
});
test("SIL transport uses verified routes and exact trusted context; rejects resets, scope and app mismatches", async () => {
  const calls: { url: string; body: unknown }[] = [];
  let response: unknown = {
    ...who(),
    loginAllowed: true,
    accessAllowed: true,
    mustChangePassword: false,
  };
  const transport = (async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    assert.equal(init?.redirect, "manual");
    assert.equal(init?.cache, "no-store");
    return Response.json(response);
  }) as typeof fetch;
  const client = new SilAuth(
    {
      origin: "https://sil.example",
      token: "test-only",
      appKey: "scout",
    },
    transport,
  );
  const session = await client.login("user@example.com", "test-password");
  assert.equal(
    calls[0].url,
    "https://sil.example/api/apps/customer-auth/login",
  );
  assert.deepEqual(calls[0].body, {
    email: "user@example.com",
    password: "test-password",
    appKey: "scout",
  });
  response = { ...who(), sessionValid: true, mustChangePassword: false };
  await client.validate({
    tenantId: session.tenantId,
    propertyId: session.propertyId,
    userId: session.userId,
    appKey: session.appKey,
    credentialVersion: session.credentialVersion,
    sessionIssuedAt: session.sessionIssuedAt,
  });
  assert.match(calls[1].url, /session-status$/);
  for (const change of [
    { tenantId: "other" },
    { appKey: "wrong" },
    { credentialVersion: 2 },
    { mustChangePassword: true },
    { sessionValid: false },
  ]) {
    response = {
      ...who(),
      sessionValid: true,
      mustChangePassword: false,
      ...change,
    };
    await assert.rejects(() => client.validate(session), { status: 401 });
  }
  response = {
    ...who(),
    loginAllowed: true,
    accessAllowed: true,
    mustChangePassword: true,
  };
  await assert.rejects(() => client.login("a@example.com", "x"), {
    status: 401,
  });
});
test("worker and input boundaries fail closed without credentials or for browser scope/provider commands", async () => {
  const db = setup();
  try {
    const env = {
      DB: adapter(db),
      CUSTOMER_ENABLED: "true",
      SERVICE_TOKEN: "x".repeat(40),
      SIL_ORIGIN: "https://sil.example",
      SIL_SERVICE_TOKEN: "test",
      SIL_APP_KEY: "scout",
    };
    const request = (body: unknown, authorized = true) =>
      new Request("https://worker.example/customer", {
        method: "POST",
        headers: authorized
          ? { Authorization: `Bearer ${env.SERVICE_TOKEN}` }
          : {},
        body: JSON.stringify(body),
      });
    assert.equal(
      (await worker.fetch(request({}), { ...env, SIL_APP_KEY: "another-app" }))
        .status,
      503,
    );
    assert.equal(
      (await worker.fetch(request({}), { ...env, CUSTOMER_ENABLED: "false" }))
        .status,
      503,
    );
    assert.equal((await worker.fetch(request({}, false), env)).status, 403);
    for (const input of [
      { operation: "workspace", token: "x", tenantId: "a" },
      { operation: "research", token: "x" },
      { operation: "notify", token: "x" },
      { operation: "query", sql: "SELECT 1" },
    ])
      assert.equal((await worker.fetch(request(input), env)).status, 400);
    assert.equal(
      (
        await worker.fetch(
          request({ operation: "workspace", token: "invalid" }),
          env,
        )
      ).status,
      401,
    );
    await assert.rejects(
      () =>
        readJson(
          new Request("https://x.example", {
            method: "POST",
            body: "x".repeat(25000),
          }),
        ),
      { status: 413 },
    );
  } finally {
    db.close();
  }
});

test("Worker account flow persists edits with only SIL auth transport; rejects revoked export/read", async () => {
  const { handleCustomer } = await import("../cloudflare/customer/worker");
  const db = setup();
  let calls = 0,
    revoked = false;
  try {
    const env = {
      DB: adapter(db),
      CUSTOMER_ENABLED: "true",
      SERVICE_TOKEN: "x".repeat(40),
      SIL_ORIGIN: "https://sil.example",
      SIL_SERVICE_TOKEN: "test",
      SIL_APP_KEY: "scout",
    };
    const transport = (async (url, init) => {
      calls++;
      assert.match(
        String(url),
        /^https:\/\/sil.example\/api\/apps\/customer-auth\/(login|session-status)$/,
      );
      const input = JSON.parse(String(init?.body));
      assert.equal(input.appKey, "scout");
      return Response.json(
        String(url).endsWith("/login")
          ? {
              ...who(),
              loginAllowed: true,
              accessAllowed: true,
              mustChangePassword: false,
            }
          : revoked
            ? { sessionValid: false }
            : { ...who(), sessionValid: true, mustChangePassword: false },
      );
    }) as typeof fetch;
    const send = (input: unknown) =>
      handleCustomer(
        new Request("https://worker.example/customer", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.SERVICE_TOKEN}` },
          body: JSON.stringify(input),
        }),
        env,
        transport,
      );
    const login = await send({
      operation: "login",
      input: { email: "a@example.com", password: "fake-test-only" },
      networkKey: "test",
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    let response = await send({ operation: "workspace", token });
    assert.equal(response.status, 200);
    const state = await response.json();
    assert.equal(state.profile, null);
    assert.equal(JSON.stringify(state).includes("tenantId"), false);
    response = await send({ operation: "update", token, input: update() });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).revision, 1);
    revoked = true;
    assert.equal((await send({ operation: "workspace", token })).status, 401);
    assert.equal(calls, 4);
  } finally {
    db.close();
  }
});

test("offline access preparation scopes assignment, revocation and erasure; never revives a conflicting grant", async () => {
  const { prepareAccess } = await import("../src/customer/provision");
  const db = setup();
  try {
    const input = {
      operation: "assign",
      tenantId: "quoted' tenant",
      propertyId: "p",
      userId: "new",
      propertyName: "Approved hotel",
      role: "viewer",
    };
    db.exec(prepareAccess(input));
    assert.equal(
      db
        .prepare("SELECT role FROM customer_memberships WHERE tenant_id=?")
        .get("quoted' tenant")!.role,
      "viewer",
    );
    assert.throws(() => db.exec(prepareAccess({ ...input, role: "admin" })));
    db.exec(
      prepareAccess({
        operation: "revoke",
        tenantId: "quoted' tenant",
        propertyId: "p",
        userId: "new",
      }),
    );
    assert.equal(
      db
        .prepare("SELECT active FROM customer_memberships WHERE tenant_id=?")
        .get("quoted' tenant")!.active,
      0,
    );
    assert.throws(() =>
      prepareAccess({
        operation: "delete-property",
        tenantId: "a",
        propertyId: "p",
        confirmation: "wrong",
      }),
    );
    db.exec(
      prepareAccess({
        operation: "delete-property",
        tenantId: "quoted' tenant",
        propertyId: "p",
        confirmation: "DELETE PRIVATE SCOUT DATA",
      }),
    );
    assert.equal(
      db
        .prepare(
          "SELECT count(*) AS n FROM customer_memberships WHERE tenant_id=?",
        )
        .get("quoted' tenant")!.n,
      0,
    );
    assert.equal(
      db
        .prepare(
          "SELECT count(*) AS n FROM customer_properties WHERE tenant_id='a'",
        )
        .get()!.n,
      1,
    );
  } finally {
    db.close();
  }
});

test("SIL redirects fail closed without following credentials to another origin", async () => {
  const auth = new SilAuth(
    { origin: "https://sil.example", token: "test-only", appKey: "scout" },
    async (_url, init) => {
      assert.equal(init?.redirect, "manual");
      return new Response(null, {
        status: 302,
        headers: { Location: "https://untrusted.example" },
      });
    },
  );
  await assert.rejects(() => auth.login("user@example.com", "test"), {
    status: 503,
  });
});

test("name-only customer draft persists after logout/login without research defaults", async () => {
  const db = setup();
  try {
    const store = new CustomerStore(adapter(db), auth());
    const first = await store.login("draft@example.com", "test", "test");
    const input = customerMutation.parse({
      revision: 0,
      profile: { name: "ABC Hotel" },
      coverage: emptyCoverage,
    });
    await store.update(first.token, input);
    await store.logout(first.token);
    const second = await store.login("draft@example.com", "test", "test");
    const state = await store.workspace(second.token);
    assert.equal(state.profile!.name, "ABC Hotel");
    assert.equal(state.profile!.website, "");
    assert.equal(state.profile!.radiusMiles, null);
    assert.deepEqual(state.profile!.scheduleDays, []);
    assert.equal(state.profile!.confirmed, false);
    assert.equal(
      state.researchEnabled ||
        state.paidCallsEnabled ||
        state.notificationsEnabled,
      false,
    );
    for (const patch of [
      { name: "" },
      { name: "   " },
      { website: "javascript:alert(1)" },
      { timezone: "Invalid/Zone" },
      { radiusMiles: 0 },
      { tenantId: "forged" },
    ])
      assert.throws(() =>
        customerMutation.parse({
          ...input,
          profile: { name: "ABC Hotel", ...patch },
        }),
      );
    assert.deepEqual(
      customerMutation.parse({ revision: 0, profile, coverage: emptyCoverage })
        .profile,
      profile,
    );
  } finally {
    db.close();
  }
});
