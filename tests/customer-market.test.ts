import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CustomerStore } from "../src/customer/store";
import { MarketIngestion } from "../src/customer/ingestion";
import { ingestionSchema } from "../src/customer/market-contracts";
import {
  customerCsv,
  selectCustomerFindings,
} from "../src/customer/market-export";
import {
  database,
  adapter,
  auth,
  provision,
  scope,
  batch,
} from "./helpers/customer-market";
import worker from "../cloudflare/customer/worker";
const scalar = (db: DatabaseSync, sql: string) => db.prepare(sql).get()!.n;

test("durable customer findings, evidence, private state and audit survive logout/restart; ABC profile is untouched", async () => {
  const dir = mkdtempSync(join(tmpdir(), "scout-market-"));
  let db = database(join(dir, "test.sqlite"));
  try {
    provision(
      db,
      "tenant_abc",
      "property_abc_abc_hotel",
      "user_info_abchotel_com",
    );
    db.prepare(
      "UPDATE customer_properties SET profile_json=?,revision=2,last_actor='owner',updated_at='2026-10-21' WHERE tenant_id='tenant_abc'",
    ).run('{"name":"ABC Hotel"}');
    const before = db
      .prepare("SELECT * FROM customer_properties WHERE tenant_id='tenant_abc'")
      .get();
    const importer = new MarketIngestion(adapter(db));
    await importer.ingest(scope, batch());
    const store = new CustomerStore(adapter(db), auth());
    const session = await store.login(
      "fixture@example.com",
      "fixture-only",
      "fixture-network",
    );
    let w = await store.workspace(session.token);
    assert.equal(w.findings.length, 3);
    assert.equal(w.runs.length, 1);
    assert.equal(w.marketMode, "synthetic");
    assert.equal(w.researchEnabled, false);
    assert.equal(w.paidCallsEnabled, false);
    assert.equal(w.notificationsEnabled, false);
    const f = w.findings[0];
    assert.equal(f.versions[0].evidenceIds[0], f.evidence[0].id);
    assert.equal(f.evidence[0].contentHash, "a".repeat(64));
    await store.findingState(session.token, {
      findingId: f.id,
      revision: 0,
      saved: true,
      dismissed: true,
    });
    await store.logout(session.token);
    db.close();
    db = new DatabaseSync(join(dir, "test.sqlite"));
    db.exec("PRAGMA foreign_keys=ON");
    const fresh = new CustomerStore(adapter(db), auth());
    const login = await fresh.login(
      "fixture@example.com",
      "fixture-only",
      "fixture-network",
    );
    w = await fresh.workspace(login.token);
    assert.equal(w.findings[0].saved, true);
    assert.equal(w.findings[0].dismissed, true);
    assert.equal(w.findings[0].stateRevision, 1);
    assert.deepEqual(
      db
        .prepare(
          "SELECT * FROM customer_properties WHERE tenant_id='tenant_abc'",
        )
        .get(),
      before,
    );
    assert.equal(
      scalar(
        db,
        "SELECT count(*) n FROM customer_audit WHERE action='findings_ingested'",
      ),
      1,
    );
    assert.equal(
      scalar(
        db,
        "SELECT count(*) n FROM customer_markets WHERE tenant_id='tenant_abc'",
      ),
      0,
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("idempotency, duplicate sources and conflicting retries cannot duplicate finding versions or commits", async () => {
  const db = database();
  try {
    const importer = new MarketIngestion(adapter(db));
    const initial = batch();
    initial.items = [
      initial.items[0],
      ...Array.from({ length: 4 }, () => structuredClone(initial.items[0])),
    ];
    const results = await Promise.all([
      importer.ingest(scope, initial),
      importer.ingest(scope, initial),
    ]);
    assert.equal(results.filter((r) => r.replayed).length, 1);
    const store = new CustomerStore(adapter(db), auth());
    const { token } = await store.login("fixture@example.com", "x", "fixture");
    let w = await store.workspace(token);
    assert.equal(w.findings.length, 1);
    assert.equal(w.findings[0].evidence.length, 1);
    assert.equal(w.findings[0].versions.length, 1);
    await assert.rejects(
      () =>
        importer.ingest(scope, { ...initial, warnings: ["different payload"] }),
      { status: 409 },
    );
    const quiet = batch(1, "fixture_quiet");
    quiet.items = [quiet.items[0]];
    await importer.ingest(scope, quiet);
    w = await store.workspace(token);
    assert.equal(w.runs.at(-1)!.changedIds.length, 0);
    assert.equal(w.findings[0].versions.length, 1);
    const update = batch(2, "fixture_update");
    update.items = [update.items[0]];
    update.items[0].candidate.facts.status = "Canceled";
    update.items[0].candidate.sources[0].publishedAt = "2026-10-11";
    update.items[0].candidate.sources[0].claims.find(
      (c) => c.field === "status",
    )!.quote = "Canceled";
    await importer.ingest(scope, update);
    w = await store.workspace(token);
    assert.equal(w.findings[0].facts.status, "Canceled");
    assert.equal(w.findings[0].versions.length, 2);
    assert.equal(w.runs.at(-1)!.changedIds.length, 1);
    const collision = batch(3, "fixture_collision");
    collision.items = [collision.items[0]];
    collision.items[0].candidate.sources[0].publishedAt = "2026-10-11";
    await importer.ingest(scope, collision);
    w = await store.workspace(token);
    assert.equal(w.findings[0].facts.status, "Canceled");
    assert.equal(w.findings[0].quality, "Conflicting evidence");
    assert.equal(w.runs.at(-1)!.status, "Partial");
    const races = await Promise.allSettled([
      importer.ingest(scope, { ...batch(4, "fixture_race_a"), items: [] }),
      importer.ingest(scope, { ...batch(4, "fixture_race_b"), items: [] }),
    ]);
    assert.equal(races.filter((r) => r.status === "fulfilled").length, 1);
  } finally {
    db.close();
  }
});

test("same-tenant and cross-tenant access, viewers, stale state and forged ingestion scope fail closed", async () => {
  const db = database();
  try {
    const importer = new MarketIngestion(adapter(db));
    await importer.ingest(scope, batch());
    provision(db, scope.tenantId, "fixture_other");
    provision(db, "fixture_other", scope.propertyId);
    provision(db, scope.tenantId, scope.propertyId, "viewer", "viewer");
    const editor = new CustomerStore(adapter(db), auth());
    const { token } = await editor.login("e@example.com", "x", "fixture");
    const record = (await editor.workspace(token)).findings[0];
    for (const [tenant, property] of [
      [scope.tenantId, "fixture_other"],
      ["fixture_other", scope.propertyId],
    ]) {
      const other = new CustomerStore(adapter(db), auth(tenant, property));
      const login = await other.login(
        `${tenant}${property}@example.com`,
        "x",
        "fixture",
      );
      assert.equal((await other.workspace(login.token)).findings.length, 0);
      await assert.rejects(
        () =>
          other.findingState(login.token, {
            findingId: record.id,
            revision: 0,
            saved: true,
            dismissed: false,
          }),
        { status: 404 },
      );
    }
    const viewer = new CustomerStore(
      adapter(db),
      auth(scope.tenantId, scope.propertyId, "viewer"),
    );
    const v = await viewer.login("v@example.com", "x", "fixture");
    await assert.rejects(
      () =>
        viewer.findingState(v.token, {
          findingId: record.id,
          revision: 0,
          saved: true,
          dismissed: false,
        }),
      { status: 403 },
    );
    const writes = await Promise.allSettled([
      editor.findingState(token, {
        findingId: record.id,
        revision: 0,
        saved: true,
        dismissed: false,
      }),
      editor.findingState(token, {
        findingId: record.id,
        revision: 0,
        saved: false,
        dismissed: true,
      }),
    ]);
    assert.equal(writes.filter((r) => r.status === "fulfilled").length, 1);
    await assert.rejects(
      () =>
        importer.ingest(
          {
            ...scope,
            tenantId: "tenant_abc",
            propertyId: "property_abc_abc_hotel",
          },
          batch(),
        ),
      { status: 403 },
    );
    assert.throws(() =>
      ingestionSchema.parse({ ...batch(), tenantId: "forged" }),
    );
    db.prepare(
      "UPDATE customer_memberships SET active=0 WHERE user_id='fixture_user'",
    ).run();
    await assert.rejects(() => editor.workspace(token), { status: 401 });
  } finally {
    db.close();
  }
});

test("ingestion transaction rolls back the full batch if its audit fails", async () => {
  const db = database();
  try {
    db.exec(
      "CREATE TRIGGER reject_import_audit BEFORE INSERT ON customer_audit WHEN NEW.action='findings_ingested' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END;",
    );
    await assert.rejects(() =>
      new MarketIngestion(adapter(db)).ingest(scope, batch()),
    );
    assert.equal(scalar(db, "SELECT revision n FROM customer_markets"), 0);
    assert.equal(
      scalar(db, "SELECT count(*) n FROM customer_ingestion_batches"),
      0,
    );
    assert.equal(
      scalar(
        db,
        "SELECT json_array_length(document_json,'$.records') n FROM customer_markets",
      ),
      0,
    );
  } finally {
    db.close();
  }
});

test("bounded evidence contracts, source URLs and customer exports reject unsafe or forged inputs", async () => {
  const db = database();
  try {
    const importer = new MarketIngestion(adapter(db));
    const missing = batch();
    missing.items[0].candidate.sources[0].claims = [];
    assert.throws(() => ingestionSchema.parse(missing));
    const unsafe = batch();
    unsafe.items[0].candidate.sources[0].url = "https://127.0.0.1/private";
    unsafe.items[0].receipts[0].url = "https://127.0.0.1/private";
    await assert.rejects(() => importer.ingest(scope, unsafe), { status: 400 });
    const future = batch();
    future.observedAt = "2099-01-01T00:00:00.000Z";
    await assert.rejects(() => importer.ingest(scope, future), { status: 400 });
    assert.throws(() =>
      ingestionSchema.parse({
        ...batch(),
        items: Array(51).fill(batch().items[0]),
      }),
    );
    await importer.ingest(scope, batch());
    const store = new CustomerStore(adapter(db), auth());
    const { token } = await store.login("fixture@example.com", "x", "fixture");
    const findings = (await store.workspace(token)).findings;
    assert.throws(() =>
      selectCustomerFindings(findings, new URLSearchParams("tenantId=other")),
    );
    assert.throws(
      () =>
        selectCustomerFindings(findings, new URLSearchParams("ids=foreign")),
      { status: 404 },
    );
    assert.throws(
      () =>
        selectCustomerFindings(
          findings,
          new URLSearchParams("state=all&state=saved"),
        ),
      { status: 400 },
    );
    const selected = selectCustomerFindings(
      findings,
      new URLSearchParams({ category: "event", state: "all" }),
    );
    assert.equal(selected.length, 1);
    assert.ok(customerCsv(selected).includes("FICTIONAL SYNTHETIC FIXTURE"));
    assert.ok(
      customerCsv([{ ...selected[0], title: "=DANGEROUS()" }]).includes(
        "'=DANGEROUS()",
      ),
    );
  } finally {
    db.close();
  }
});

test("Worker ingestion is disabled by default and requires its separate scoped credential; never fetches sources", async () => {
  const db = database();
  let calls = 0;
  const env = {
    DB: adapter(db),
    CUSTOMER_ENABLED: "true",
    SERVICE_TOKEN: "c".repeat(32),
    SIL_ORIGIN: "https://sil.example",
    SIL_SERVICE_TOKEN: "s".repeat(32),
    SIL_APP_KEY: "scout",
    INGESTION_TOKEN: "i".repeat(32),
    INGESTION_TENANT_ID: scope.tenantId,
    INGESTION_PROPERTY_ID: scope.propertyId,
    INGESTION_DATA_MODE: "synthetic",
  };
  const request = (token: string) =>
    new Request("https://worker.example/ingestion", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(batch()),
    });
  const transport: typeof fetch = async () => {
    calls++;
    throw Error("Network forbidden in fixture ingestion");
  };
  try {
    assert.equal(
      (await worker.fetch(request(env.INGESTION_TOKEN), env)).status,
      403,
    );
    const { handleCustomer } = await import("../cloudflare/customer/worker");
    assert.equal(
      (
        await handleCustomer(
          request(env.SERVICE_TOKEN),
          { ...env, INGESTION_ENABLED: "true" },
          transport,
        )
      ).status,
      403,
    );
    const result = await handleCustomer(
      request(env.INGESTION_TOKEN),
      { ...env, INGESTION_ENABLED: "true" },
      transport,
    );
    assert.equal(result.status, 200);
    assert.equal(calls, 0);
    assert.equal(scalar(db, "SELECT revision n FROM customer_markets"), 1);
  } finally {
    db.close();
  }
});

test("event editions stay separate, cross-category imports merge, older facts cannot overwrite, and fixture mode cannot change", async () => {
  const db = database();
  try {
    const importer = new MarketIngestion(adapter(db));
    const initial = batch();
    const linked = structuredClone(initial.items[0]);
    linked.candidate.categories = ["corporate", "project"];
    initial.items.push(linked);
    const nextEdition = structuredClone(initial.items[2]);
    nextEdition.candidate.edition = "2027";
    initial.items.push(nextEdition);
    await importer.ingest(scope, initial);
    const store = new CustomerStore(adapter(db), auth());
    const { token } = await store.login("fixture@example.com", "x", "fixture");
    let workspace = await store.workspace(token);
    assert.equal(workspace.findings.length, 4);
    assert.equal(
      workspace.findings.filter((f) => f.categories.includes("event")).length,
      2,
    );
    assert.deepEqual(workspace.findings[0].categories, [
      "corporate",
      "project",
    ]);
    const older = batch(1, "fixture_older_facts");
    older.items = [older.items[0]];
    older.items[0].candidate.facts.status = "Canceled";
    older.items[0].candidate.sources[0].publishedAt = "2026-10-08";
    await importer.ingest(scope, older);
    workspace = await store.workspace(token);
    assert.equal(workspace.findings[0].facts.status, "Active");
    assert.equal(workspace.findings[0].versions.length, 1);
    assert.equal(workspace.runs.at(-1)!.changedIds.length, 0);
    assert.throws(
      () => db.exec("UPDATE customer_markets SET data_mode='reviewed'"),
      /market_data_mode_is_immutable/,
    );
    await assert.rejects(
      () =>
        importer.ingest(
          { ...scope, dataMode: "reviewed" },
          batch(2, "fixture_wrong_mode"),
        ),
      { status: 403 },
    );
  } finally {
    db.close();
  }
});
