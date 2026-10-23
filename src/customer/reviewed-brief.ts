import { randomUUID } from "node:crypto";
import { briefSchema, type Brief } from "./expansion-contracts";
import { storedMarket } from "./market-contracts";
import { CustomerError } from "./contracts";
import type { Database } from "./store";
import type { IngestionScope } from "./ingestion";

/** Operator-only publication. No provider, session or research dispatch is involved. */
export async function publishReviewedBrief(
  db: Database,
  scope: IngestionScope,
  reviewId: string,
  unknowns: string[],
  now = new Date().toISOString(),
) {
  const keys = [scope.tenantId, scope.propertyId];
  const existing = await db
    .prepare(
      "SELECT document_json FROM customer_reviewed_briefings WHERE tenant_id=? AND property_id=? AND job_id=?",
    )
    .bind(...keys, reviewId)
    .first<{ document_json: string }>();
  if (existing) return briefSchema.parse(JSON.parse(existing.document_json));
  const review = await db
    .prepare(
      "SELECT document_json,status FROM customer_import_reviews WHERE tenant_id=? AND property_id=? AND review_id=?",
    )
    .bind(...keys, reviewId)
    .first<{ document_json: string; status: string }>();
  if (!review || review.status !== "approved" || scope.dataMode !== "reviewed")
    throw new CustomerError("Approved reviewed import required.", 409);
  const market = storedMarket.parse(JSON.parse(review.document_json));
  const run = market.runs.find((r) => r.batchKey === reviewId);
  if (!run) throw new CustomerError("Review run missing.", 409);
  const selected = new Set([...run.newIds, ...run.changedIds]);
  const records = market.records
    .filter((r) => selected.has(r.id))
    .map((r) => ({ ...r, assessment: market.assessments[r.id] }));
  if (!records.length)
    throw new CustomerError("No reviewed changes to publish.", 409);
  const version = await db
    .prepare(
      "SELECT COALESCE(MAX(version),0)+1 AS version FROM customer_all_briefings WHERE tenant_id=? AND property_id=?",
    )
    .bind(...keys)
    .first<{ version: number }>();
  const config = await db
    .prepare(
      "SELECT revision FROM customer_expansion_config WHERE tenant_id=? AND property_id=?",
    )
    .bind(...keys)
    .first<{ revision: number }>();
  const brief: Brief = briefSchema.parse({
    id: randomUUID(),
    jobId: reviewId,
    version: version!.version,
    generatedAt: now,
    status: "partial",
    mode: "reviewed",
    fence: "reviewed-import",
    configRevision: config?.revision ?? 0,
    records,
    coverage: ["corporate", "project", "event", "competitor", "property"].map(
      (category) => ({
        category,
        status: ["project", "event"].includes(category) ? "partial" : "blocked",
        code: "REVIEWED_PUBLICATION",
        message: ["project", "event"].includes(category)
          ? "Selected source-checked findings published; market distance and lodging demand still require qualification."
          : "No verified findings published in this category. This does not establish that no activity exists.",
        checkedAt: run.at,
        lastSuccessAt: ["project", "event"].includes(category) ? run.at : null,
        newIds: records
          .filter((r) => r.categories.includes(category as any))
          .map((r) => r.id),
        changedIds: [],
      }),
    ),
    sections: [
      {
        heading: "Priorities for your hotel",
        items: records.map((r) => ({
          findingId: r.id,
          version: r.versions.length,
          evidenceIds: r.evidence.map((e) => e.id),
          statement: r.summary,
          implication:
            r.assessment.inference +
            " Suggested next step: " +
            r.assessment.rationale,
          unknowns: r.assessment.unknowns,
          ongoing: false,
        })),
      },
    ],
    connections: [],
    unknowns,
    cost: { provider: "reviewed", actualUsd: null, publicationUsd: 0 },
  });
  await db
    .prepare(
      "INSERT INTO customer_reviewed_briefings(tenant_id,property_id,id,job_id,version,created_at,document_json,actor) VALUES(?,?,?,?,?,?,?,?)",
    )
    .bind(
      ...keys,
      brief.id,
      reviewId,
      brief.version,
      now,
      JSON.stringify(brief),
      scope.actor,
    )
    .run();
  return brief;
}
