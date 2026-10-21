import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ReviewedImports } from "../src/customer/reviewed-imports";
import {
  database,
  adapter,
  scope,
  batch,
  provision,
} from "./helpers/customer-market";
import worker from "../cloudflare/customer/worker";
const setup = () => {
  const db = database();
  db.exec(
    readFileSync("cloudflare/migrations/0004_reviewed_imports.sql", "utf8"),
  );
  return db;
};
const decision = (r: Record<string, unknown>, which = "approved") => ({
  operation: "decide",
  reviewId: r.reviewId,
  approvalHash: r.approvalHash,
  decision: which,
  note: "Sources, dates, inference and unknowns reviewed in isolated test.",
  evidenceReviewed: true,
  lodgingInferenceReviewed: true,
});
test("stage is private, approval publishes exactly once, and profile/membership stay unchanged", async () => {
  const db = setup();
  try {
    provision(
      db,
      "tenant_abc",
      "property_abc_abc_hotel",
      "user_info_abchotel_com",
    );
    const baseline = db.prepare("SELECT * FROM customer_properties").all();
    const reviews = new ReviewedImports(adapter(db));
    const r = await reviews.execute(scope, {
      operation: "stage",
      batch: batch(),
    });
    assert.equal(
      db.prepare("SELECT revision FROM customer_markets").get()!.revision,
      0,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM customer_ingestion_batches").get()!.n,
      0,
    );
    assert.equal(r.status, "pending");
    assert.equal((r.proposed as any).records.length, 3);
    assert.deepEqual(
      await reviews.execute(scope, { operation: "stage", batch: batch() }),
      r,
    );
    await reviews.execute(scope, decision(r));
    await reviews.execute(scope, decision(r));
    assert.equal(
      db.prepare("SELECT revision FROM customer_markets").get()!.revision,
      1,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM customer_ingestion_batches").get()!.n,
      1,
    );
    assert.deepEqual(
      db.prepare("SELECT * FROM customer_properties").all(),
      baseline,
    );
    assert.equal(
      (
        await reviews.execute(scope, {
          operation: "read",
          reviewId: r.reviewId,
        })
      ).status,
      "approved",
    );
    await assert.rejects(
      () => reviews.execute(scope, decision(r, "rejected")),
      /already decided/,
    );
  } finally {
    db.close();
  }
});
test("changed hash, changed payload, stale approval and rejection cannot publish", async () => {
  const db = setup();
  try {
    const reviews = new ReviewedImports(adapter(db));
    const r = await reviews.execute(scope, {
      operation: "stage",
      batch: batch(),
    });
    await assert.rejects(
      () =>
        reviews.execute(scope, {
          ...decision(r),
          approvalHash: "b".repeat(64),
        }),
      /does not match/,
    );
    const altered = batch();
    altered.items[0].summary = "Changed payload";
    await assert.rejects(
      () => reviews.execute(scope, { operation: "stage", batch: altered }),
      /different content/,
    );
    const second = await reviews.execute(scope, {
      operation: "stage",
      batch: batch(0, "fixture_second"),
    });
    await reviews.execute(scope, decision(r));
    await assert.rejects(
      () => reviews.execute(scope, decision(second)),
      /Market changed/,
    );
    assert.equal(
      (
        await reviews.execute(scope, {
          operation: "read",
          reviewId: second.reviewId,
        })
      ).stale,
      true,
    );
    await reviews.execute(scope, decision(second, "rejected"));
    assert.equal(
      db.prepare("SELECT count(*) n FROM customer_ingestion_batches").get()!.n,
      1,
    );
  } finally {
    db.close();
  }
});
test("approval and publication roll back together on audit failure; inactive and foreign scopes fail closed", async () => {
  const db = setup();
  try {
    const reviews = new ReviewedImports(adapter(db));
    const r = await reviews.execute(scope, {
      operation: "stage",
      batch: batch(),
    });
    db.exec(
      "CREATE TRIGGER fail_review_audit BEFORE INSERT ON customer_audit WHEN NEW.action='import_approved' BEGIN SELECT RAISE(ABORT,'audit_failed'); END;",
    );
    await assert.rejects(
      () => reviews.execute(scope, decision(r)),
      /audit_failed/,
    );
    assert.equal(
      db.prepare("SELECT status FROM customer_import_reviews").get()!.status,
      "pending",
    );
    assert.equal(
      db.prepare("SELECT revision FROM customer_markets").get()!.revision,
      0,
    );
    assert.equal(
      db.prepare("SELECT count(*) n FROM customer_ingestion_batches").get()!.n,
      0,
    );
    provision(db, scope.tenantId, "fixture_neighbor");
    const neighbor = { ...scope, propertyId: "fixture_neighbor" };
    await reviews.execute(neighbor, {
      operation: "enroll",
      confirmPropertyId: neighbor.propertyId,
    });
    await assert.rejects(
      () =>
        reviews.execute(neighbor, { operation: "read", reviewId: r.reviewId }),
      /not found/,
    );
    await assert.rejects(
      () => reviews.execute(neighbor, decision(r)),
      /not found/,
    );
    await assert.rejects(
      () =>
        reviews.execute(
          { ...scope, dataMode: "reviewed" },
          { operation: "read", reviewId: r.reviewId },
        ),
      /not enrolled/,
    );
    db.exec("UPDATE customer_properties SET active=0");
    await assert.rejects(
      () => reviews.execute(scope, decision(r)),
      /not active/,
    );
  } finally {
    db.close();
  }
});
test("review endpoint is gated, scope and actor cannot be forged, enrollment is repeat-safe", async () => {
  const db = setup();
  try {
    const env = {
      DB: adapter(db),
      CUSTOMER_ENABLED: "true",
      SERVICE_TOKEN: "s".repeat(32),
      SIL_ORIGIN: "https://sil.example",
      SIL_SERVICE_TOKEN: "sil-test",
      SIL_APP_KEY: "scout",
      REVIEW_TOKEN: "r".repeat(32),
      REVIEW_TENANT_ID: scope.tenantId,
      REVIEW_PROPERTY_ID: scope.propertyId,
      REVIEW_DATA_MODE: "synthetic",
      REVIEW_ACTOR: "fixture_operator",
    };
    const call = (body: unknown, enabled = false, token = env.REVIEW_TOKEN) =>
      worker.fetch(
        new Request("https://worker.example/reviews", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        { ...env, REVIEW_ENABLED: String(enabled) },
      );
    assert.equal((await call({ operation: "list" })).status, 403);
    assert.equal(
      (await call({ operation: "list" }, true, env.SERVICE_TOKEN)).status,
      403,
    );
    assert.equal(
      (await call({ operation: "list", tenantId: "tenant_abc" }, true)).status,
      400,
    );
    assert.equal(
      (await call({ operation: "stage", batch: batch(), actor: "owner" }, true))
        .status,
      400,
    );
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await call(
            { operation: "enroll", confirmPropertyId: scope.propertyId },
            true,
          )
        ).status,
        200,
      );
    assert.equal(
      db.prepare("SELECT count(*) n FROM customer_markets").get()!.n,
      1,
    );
    assert.equal(
      (await call({ operation: "enroll", confirmPropertyId: "wrong" }, true))
        .status,
      400,
    );
    const staged = await (
      await call({ operation: "stage", batch: batch() }, true)
    ).json();
    assert.equal(
      (await call({ ...decision(staged), evidenceReviewed: false }, true))
        .status,
      400,
    );
    assert.equal((await call(decision(staged), true)).status, 200);
  } finally {
    db.close();
  }
});

test("reviewed mode accepts prepared public evidence only through approval and preserves state across reopen", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { DatabaseSync } = await import("node:sqlite");
  const dir = mkdtempSync(join(tmpdir(), "scout-review-"));
  const filename = join(dir, "review.sqlite");
  let db = database(filename);
  try {
    db.exec(
      readFileSync("cloudflare/migrations/0004_reviewed_imports.sql", "utf8"),
    );
    // All content is fictional and stays in a temporary, local database. Public-shaped URLs are never fetched.
    provision(db, "fixture_review_tenant", "fixture_review_property");
    const reviewedScope = {
      tenantId: "fixture_review_tenant",
      propertyId: "fixture_review_property",
      actor: "fixture_reviewer",
      dataMode: "reviewed" as const,
    };
    let reviews = new ReviewedImports(adapter(db));
    await reviews.execute(reviewedScope, {
      operation: "enroll",
      confirmPropertyId: reviewedScope.propertyId,
    });
    await assert.rejects(
      () =>
        reviews.execute(reviewedScope, { operation: "stage", batch: batch() }),
      /URL is not allowed/,
    );
    const input = batch();
    for (const item of input.items) {
      item.candidate.sources[0].url =
        "https://public-shaped.fixture-review.org/" + item.candidate.kind;
      item.receipts[0].url = item.candidate.sources[0].url;
    }
    const r = await reviews.execute(reviewedScope, {
      operation: "stage",
      batch: input,
    });
    db.close();
    db = new DatabaseSync(filename);
    db.exec("PRAGMA foreign_keys=ON");
    reviews = new ReviewedImports(adapter(db));
    assert.equal(
      (
        await reviews.execute(reviewedScope, {
          operation: "read",
          reviewId: r.reviewId,
        })
      ).status,
      "pending",
    );
    await reviews.execute(reviewedScope, decision(r));
    const doc = JSON.parse(
      db
        .prepare("SELECT document_json FROM customer_markets WHERE tenant_id=?")
        .get(reviewedScope.tenantId)!.document_json as string,
    );
    assert.equal(doc.records.length, 3);
    const env = {
      DB: adapter(db),
      CUSTOMER_ENABLED: "true",
      SERVICE_TOKEN: "s".repeat(32),
      SIL_ORIGIN: "https://sil.example",
      SIL_SERVICE_TOKEN: "sil-test",
      SIL_APP_KEY: "scout",
      INGESTION_ENABLED: "true",
      INGESTION_TOKEN: "i".repeat(32),
      INGESTION_TENANT_ID: reviewedScope.tenantId,
      INGESTION_PROPERTY_ID: reviewedScope.propertyId,
      INGESTION_DATA_MODE: "reviewed",
    };
    const result = await worker.fetch(
      new Request("https://worker.example/ingestion", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.INGESTION_TOKEN}` },
        body: JSON.stringify(batch(1, "bypass_review")),
      }),
      env,
    );
    assert.equal(result.status, 403);
    assert.match(
      ((await result.json()) as { error: string }).error,
      /staged approval/,
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("operator report escapes untrusted evidence and separates proposed facts from lodging inference", async () => {
  const { renderReviewReport } = await import("../src/customer/review-report");
  const db = setup();
  try {
    const input = batch();
    input.items[0].summary = "<script>alert(1)</script>";
    const r = await new ReviewedImports(adapter(db)).execute(scope, {
      operation: "stage",
      batch: input,
    });
    const html = renderReviewReport(r);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("Lodging relevance — inference"));
    assert.ok(html.includes("Unknowns"));
    assert.ok(html.includes("default-src"));
  } finally {
    db.close();
  }
});

test("approval races publish once, rejected and immutable proposals cannot leak into customer workspace", async () => {
  const { CustomerStore } = await import("../src/customer/store");
  const { auth } = await import("./helpers/customer-market");
  const db = setup();
  try {
    const reviews = new ReviewedImports(adapter(db));
    const store = new CustomerStore(adapter(db), auth());
    const session = await store.login(
      "fixture@example.com",
      "fixture-only",
      "fixture-network",
    );
    const r = await reviews.execute(scope, {
      operation: "stage",
      batch: batch(),
    });
    assert.equal((await store.workspace(session.token)).findings.length, 0);
    assert.throws(
      () => db.exec("UPDATE customer_import_reviews SET document_json='{}'"),
      /immutable/,
    );
    const outcomes = await Promise.allSettled([
      reviews.execute(scope, decision(r)),
      reviews.execute(scope, decision(r)),
    ]);
    assert.ok(outcomes.every((x) => x.status === "fulfilled"));
    const workspace = await store.workspace(session.token);
    assert.equal(workspace.findings.length, 3);
    assert.equal(workspace.researchEnabled, false);
    assert.equal(workspace.paidCallsEnabled, false);
    assert.equal(workspace.notificationsEnabled, false);
    const f = workspace.findings[0];
    await store.findingState(session.token, {
      findingId: f.id,
      revision: 0,
      saved: true,
      dismissed: false,
    });
    const next = batch(1, "fixture_review_next");
    next.items[0].candidate.facts.end = "2026-12-01";
    next.items[0].candidate.sources[0].publishedAt = "2026-10-11";
    const pending = await reviews.execute(scope, {
      operation: "stage",
      batch: next,
    });
    await reviews.execute(scope, decision(pending, "rejected"));
    assert.equal((await store.workspace(session.token)).marketRevision, 1);
    assert.equal(
      (await store.workspace(session.token)).findings.find(
        (x) => x.id === f.id,
      )!.saved,
      true,
    );
    assert.equal(
      db
        .prepare(
          "SELECT count(*) n FROM customer_audit WHERE action='import_approved'",
        )
        .get()!.n,
      1,
    );
  } finally {
    db.close();
  }
});

test("review retention cap stops staging with a clear error instead of silently deleting history", async () => {
  const db = setup();
  try {
    // A trigger-local threshold makes the bounded-cap failure reachable without bulk fixtures.
    db.exec(
      "DROP TRIGGER customer_review_capacity; CREATE TRIGGER customer_review_capacity BEFORE INSERT ON customer_import_reviews BEGIN SELECT RAISE(ABORT,'review_retention_limit'); END;",
    );
    const env = {
      DB: adapter(db),
      CUSTOMER_ENABLED: "true",
      SERVICE_TOKEN: "s".repeat(32),
      SIL_ORIGIN: "https://sil.example",
      SIL_SERVICE_TOKEN: "sil-test",
      SIL_APP_KEY: "scout",
      REVIEW_ENABLED: "true",
      REVIEW_TOKEN: "r".repeat(32),
      REVIEW_TENANT_ID: scope.tenantId,
      REVIEW_PROPERTY_ID: scope.propertyId,
      REVIEW_DATA_MODE: "synthetic",
      REVIEW_ACTOR: "fixture_operator",
    };
    const response = await worker.fetch(
      new Request("https://worker.example/reviews", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.REVIEW_TOKEN}` },
        body: JSON.stringify({ operation: "stage", batch: batch() }),
      }),
      env,
    );
    assert.equal(response.status, 413);
    assert.equal(
      db.prepare("SELECT revision FROM customer_markets").get()!.revision,
      0,
    );
  } finally {
    db.close();
  }
});
