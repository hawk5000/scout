import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { database, adapter, batch, provision } from "./helpers/customer-market";
import { ReviewedImports } from "../src/customer/reviewed-imports";
import { publishReviewedBrief } from "../src/customer/reviewed-brief";
import {
  briefingCsv,
  briefingHtml,
  briefingText,
} from "../src/customer/brief-export";

test("reviewed publication requires scoped approval, is immutable and idempotent, and exports real-source labels", async () => {
  const db = database();
  for (const f of [
    "0004_reviewed_imports.sql",
    "0005_scout_expansion.sql",
    "0014_reviewed_brief_publication.sql",
  ])
    db.exec(readFileSync("cloudflare/migrations/" + f, "utf8"));
  const s = {
    tenantId: "isolated_review_tenant",
    propertyId: "isolated_review_property",
    actor: "test_operator",
    dataMode: "reviewed" as const,
  };
  provision(db, s.tenantId, s.propertyId);
  const api = new ReviewedImports(adapter(db));
  await api.execute(s, {
    operation: "enroll",
    confirmPropertyId: s.propertyId,
  });
  const b = batch();
  for (const i of b.items) {
    i.candidate.sources[0].url = i.candidate.sources[0].url.replace(
      "sources.example",
      "public.example.org",
    );
    i.receipts[0].url = i.candidate.sources[0].url;
  }
  const r = await api.execute(s, { operation: "stage", batch: b });
  await assert.rejects(
    () => publishReviewedBrief(adapter(db), s, b.batchKey, []),
    /Approved/,
  );
  await api.execute(s, {
    operation: "decide",
    reviewId: r.reviewId,
    approvalHash: r.approvalHash,
    decision: "approved",
    note: "Explicit owner approval after source review.",
    evidenceReviewed: true,
    lodgingInferenceReviewed: true,
  });
  await assert.rejects(
    () =>
      publishReviewedBrief(
        adapter(db),
        { ...s, tenantId: "other" },
        b.batchKey,
        [],
      ),
    /Approved/,
  );
  const brief = await publishReviewedBrief(adapter(db), s, b.batchKey, [
    "Distances unconfirmed.",
  ]);
  assert.equal(brief.records.length, 3);
  assert.deepEqual(
    await publishReviewedBrief(adapter(db), s, b.batchKey, []),
    brief,
  );
  for (const output of [
    briefingText(brief),
    briefingHtml(brief),
    briefingCsv(brief),
  ]) {
    assert.match(output, /reviewed/i);
    assert.doesNotMatch(
      output,
      /FICTIONAL SYNTHETIC FIXTURE|Fictional synthetic sample/,
    );
  }
  assert.throws(
    () => db.prepare("UPDATE customer_reviewed_briefings SET version=2").run(),
    /immutable/,
  );
  assert.throws(
    () => db.prepare("DELETE FROM customer_reviewed_briefings").run(),
    /immutable/,
  );
  const insert = (doc: any) =>
    db
      .prepare(
        "INSERT INTO customer_reviewed_briefings(tenant_id,property_id,id,job_id,version,created_at,document_json,actor) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        s.tenantId,
        s.propertyId,
        doc.id,
        b.batchKey,
        doc.version,
        doc.generatedAt,
        JSON.stringify(doc),
        s.actor,
      );
  assert.throws(
    () => insert({ ...brief, id: crypto.randomUUID(), version: 1 }),
    /version_conflict/,
  );
  const bad = structuredClone(brief);
  bad.id = crypto.randomUUID();
  bad.version = 2;
  bad.sections[0].items[0].evidenceIds = ["unrelated"];
  assert.throws(() => insert(bad), /evidence_invalid/);
  bad.sections[0].items[0].evidenceIds = brief.sections[0].items[0].evidenceIds;
  bad.records[0].summary = "unapproved change";
  assert.throws(() => insert(bad), /unapproved_brief_finding/);
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM customer_reviewed_briefings").get()!.n,
    1,
  );
  const secondBatch = {
    ...b,
    batchKey: "second-review-batch",
    expectedRevision: 1,
    items: b.items.slice(0, 1),
  };
  const second = await api.execute(s, {
    operation: "stage",
    batch: secondBatch,
  });
  await api.execute(s, {
    operation: "decide",
    reviewId: second.reviewId,
    approvalHash: second.approvalHash,
    decision: "approved",
    note: "Second scoped review preserves prior baseline evidence.",
    evidenceReviewed: true,
    lodgingInferenceReviewed: true,
  });
  const compiled = await publishReviewedBrief(
    adapter(db),
    s,
    secondBatch.batchKey,
    [],
  );
  assert.equal(
    compiled.records.length,
    3,
    "Briefing must retain earlier approved context outside this batch",
  );
  assert.equal(compiled.status, "partial");
  assert.equal(compiled.version, 2);
  assert.ok(
    compiled.sections
      .flatMap((section) => section.items)
      .every((item) =>
        compiled.records.some(
          (record) =>
            record.id === item.findingId &&
            item.evidenceIds.every((id) =>
              record.evidence.some((e) => e.id === id),
            ),
        ),
      ),
  );
  db.close();
});
