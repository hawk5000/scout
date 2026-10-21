import { z } from "zod";
import { CustomerError } from "./contracts";
import { digest, type Database } from "./store";
import { MarketIngestion, type IngestionScope } from "./ingestion";
import { ingestionSchema, storedMarket } from "./market-contracts";
const id = z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/);
export const reviewCommand = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("enroll"),
      confirmPropertyId: z.string().min(1),
    })
    .strict(),
  z.object({ operation: z.literal("stage"), batch: ingestionSchema }).strict(),
  z
    .object({
      operation: z.literal("list"),
      before: z.string().max(100).optional(),
    })
    .strict(),
  z.object({ operation: z.literal("read"), reviewId: id }).strict(),
  z
    .object({
      operation: z.literal("decide"),
      reviewId: id,
      approvalHash: z.string().regex(/^[a-f0-9]{64}$/),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().trim().min(10).max(2000),
      evidenceReviewed: z.literal(true),
      lodgingInferenceReviewed: z.literal(true),
    })
    .strict(),
]);
interface ReviewRow {
  review_id: string;
  payload_hash: string;
  approval_hash: string;
  expected_revision: number;
  payload_json: string;
  document_json: string;
  status: "pending" | "approved" | "rejected";
  submitted_by: string;
  submitted_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
}
export class ReviewedImports {
  constructor(
    private db: Database,
    private now: () => number = Date.now,
  ) {}
  private async active(s: IngestionScope) {
    if (
      !(await this.db
        .prepare(
          "SELECT property_id FROM customer_properties WHERE tenant_id=? AND property_id=? AND active=1",
        )
        .bind(s.tenantId, s.propertyId)
        .first())
    )
      throw new CustomerError("Property is not active.", 403);
  }
  private async row(s: IngestionScope, id: string) {
    const row = await this.db
      .prepare(
        "SELECT * FROM customer_import_reviews WHERE tenant_id=? AND property_id=? AND review_id=?",
      )
      .bind(s.tenantId, s.propertyId, id)
      .first<ReviewRow>();
    if (!row) throw new CustomerError("Review not found.", 404);
    return row;
  }
  async execute(
    s: IngestionScope,
    raw: unknown,
  ): Promise<Record<string, unknown>> {
    const c = reviewCommand.parse(raw);
    await this.active(s);
    if (c.operation === "enroll") {
      if (c.confirmPropertyId !== s.propertyId)
        throw new CustomerError("Property confirmation does not match.", 400);
      if (
        s.dataMode === "synthetic" &&
        (!s.tenantId.startsWith("fixture_") ||
          !s.propertyId.startsWith("fixture_"))
      )
        throw new CustomerError(
          "Synthetic imports require fixture scope.",
          403,
        );
      await this.db
        .prepare(
          "INSERT INTO customer_markets(tenant_id,property_id,data_mode) VALUES(?,?,?) ON CONFLICT(tenant_id,property_id) DO NOTHING",
        )
        .bind(s.tenantId, s.propertyId, s.dataMode)
        .run();
      const market = await this.db
        .prepare(
          "SELECT data_mode,revision FROM customer_markets WHERE tenant_id=? AND property_id=?",
        )
        .bind(s.tenantId, s.propertyId)
        .first<{ data_mode: string; revision: number }>();
      if (market?.data_mode !== s.dataMode)
        throw new CustomerError(
          "Existing market mode differs. No data was replaced.",
          409,
        );
      return {
        enrolled: true,
        mode: market.data_mode,
        revision: market.revision,
        propertyId: s.propertyId,
      };
    }
    const enrolled = await this.db
      .prepare(
        "SELECT data_mode FROM customer_markets WHERE tenant_id=? AND property_id=?",
      )
      .bind(s.tenantId, s.propertyId)
      .first<{ data_mode: string }>();
    if (enrolled?.data_mode !== s.dataMode)
      throw new CustomerError(
        "Market review scope is not enrolled in this mode.",
        403,
      );
    if (c.operation === "list") {
      // Bounded keyset page; no cross-property enumeration.
      const page = await this.db
        .prepare(
          "SELECT json_group_array(json_object('reviewId',review_id,'status',status,'submittedAt',submitted_at)) AS page FROM (SELECT review_id,status,submitted_at FROM customer_import_reviews WHERE tenant_id=? AND property_id=? AND review_id<? ORDER BY review_id DESC LIMIT 25)",
        )
        .bind(s.tenantId, s.propertyId, c.before ?? "~")
        .first<{ page: string }>();
      const items = JSON.parse(page?.page ?? "[]") as { reviewId: string }[];
      return {
        items,
        nextBefore: items.length === 25 ? items.at(-1)!.reviewId : null,
      };
    }
    if (c.operation === "stage") {
      const payload = JSON.stringify(c.batch),
        hash = await digest(payload);
      const existing = await this.db
        .prepare(
          "SELECT payload_hash FROM customer_import_reviews WHERE tenant_id=? AND property_id=? AND review_id=?",
        )
        .bind(s.tenantId, s.propertyId, c.batch.batchKey)
        .first<{ payload_hash: string }>();
      if (existing) {
        if (existing.payload_hash !== hash)
          throw new CustomerError(
            "Review ID already contains different content.",
            409,
          );
        return this.execute(s, {
          operation: "read",
          reviewId: c.batch.batchKey,
        });
      }
      const preview = await new MarketIngestion(this.db, this.now).ingest(
        s,
        c.batch,
        true,
      );
      if (!("document" in preview))
        throw new CustomerError(
          "Batch already published. Use a new review ID.",
          409,
        );
      const encoded = JSON.stringify(preview.document);
      const approvalHash = await digest(
        JSON.stringify([s.tenantId, s.propertyId, s.dataMode, hash, encoded]),
      );
      await this.db
        .prepare(
          "INSERT INTO customer_import_reviews(tenant_id,property_id,review_id,payload_hash,approval_hash,expected_revision,payload_json,document_json,submitted_by,submitted_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,property_id,review_id) DO NOTHING",
        )
        .bind(
          s.tenantId,
          s.propertyId,
          c.batch.batchKey,
          hash,
          approvalHash,
          c.batch.expectedRevision,
          payload,
          encoded,
          s.actor,
          new Date(this.now()).toISOString(),
        )
        .run();
      if ((await this.row(s, c.batch.batchKey)).payload_hash !== hash)
        throw new CustomerError("Concurrent review content differs.", 409);
      return this.execute(s, { operation: "read", reviewId: c.batch.batchKey });
    }
    const row = await this.row(s, c.reviewId);
    if (c.operation === "read") {
      const document = storedMarket.parse(JSON.parse(row.document_json));
      const market = await this.db
        .prepare(
          "SELECT revision,document_json FROM customer_markets WHERE tenant_id=? AND property_id=?",
        )
        .bind(s.tenantId, s.propertyId)
        .first<{ revision: number; document_json: string }>();
      return {
        tenantId: s.tenantId,
        propertyId: s.propertyId,
        mode: s.dataMode,
        reviewId: row.review_id,
        status: row.status,
        approvalHash: row.approval_hash,
        expectedRevision: row.expected_revision,
        currentRevision: market?.revision,
        stale:
          row.status === "pending" &&
          market?.revision !== row.expected_revision,
        submittedBy: row.submitted_by,
        submittedAt: row.submitted_at,
        decidedBy: row.decided_by,
        decidedAt: row.decided_at,
        note: row.decision_note,
        batch: JSON.parse(row.payload_json),
        before: market ? JSON.parse(market.document_json) : null,
        proposed: document,
        run: document.runs.at(-1),
        warning:
          "Prepared evidence is an operator assertion. SCOUT has not fetched or independently verified sources. Review facts, quotations, dates, lodging inference and unknowns before approving.",
      };
    }
    if (c.approvalHash !== row.approval_hash)
      throw new CustomerError(
        "Approval does not match the reviewed content.",
        409,
      );
    if (row.status !== "pending") {
      if (row.status !== c.decision)
        throw new CustomerError("Review already decided.", 409);
      return { reviewId: row.review_id, status: row.status, replayed: true };
    }
    try {
      await this.db
        .prepare(
          "UPDATE customer_import_reviews SET status=?,decided_by=?,decided_at=?,decision_note=? WHERE tenant_id=? AND property_id=? AND review_id=? AND status='pending' AND approval_hash=?",
        )
        .bind(
          c.decision,
          s.actor,
          new Date(this.now()).toISOString(),
          c.note,
          s.tenantId,
          s.propertyId,
          c.reviewId,
          c.approvalHash,
        )
        .run();
    } catch (error) {
      if (
        String(error).includes("market_revision_conflict") ||
        String(error).includes("UNIQUE constraint")
      )
        throw new CustomerError(
          "Market changed. Stage a fresh batch with a new ID and review it again.",
          409,
        );
      throw error;
    }
    const result = await this.row(s, c.reviewId);
    if (result.status !== c.decision)
      throw new CustomerError("Another operator decided this review.", 409);
    return {
      reviewId: result.review_id,
      status: result.status,
      replayed: false,
    };
  }
}
