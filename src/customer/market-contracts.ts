import { z } from "zod";
import {
  candidateSchema,
  factsSchema,
  factFields,
} from "../research/contracts";
export const marketCategories = [
  "corporate",
  "project",
  "event",
  "competitor",
  "property",
] as const;
export type MarketCategory = (typeof marketCategories)[number];
const categories = marketCategories;
export const observationContext = z
  .object({
    subjectId: z.string().min(1).max(100),
    sourceClass: z.enum(["official", "news", "review", "social", "event"]),
    originId: z.string().min(1).max(500),
    match: z.enum(["confirmed", "ambiguous", "unmatched"]),
    matchReason: z.string().min(1).max(1000),
    sentiment: z.enum(["positive", "negative", "neutral", "mixed", "unclear"]),
    sentimentReason: z.string().min(1).max(1000),
    relatedIdentity: z.string().max(500).nullable(),
    excerpt: z.string().min(1).max(500),
  })
  .strict();
const marketCandidate = z
  .object({
    ...candidateSchema.shape,
    kind: z.enum(categories),
    categories: z.array(z.enum(categories)).min(1).max(5),
  })
  .strict()
  .refine(
    (v) => v.categories.includes(v.kind),
    "Primary category must be included.",
  )
  .refine(
    (v) => v.kind !== "event" || v.edition !== null,
    "Events require an edition identifier.",
  );
const text = z.string().trim().min(1).max(2000);
export const marketMode = z.enum(["synthetic", "reviewed"]);
export const assessmentSchema = z
  .object({
    inference: z.string().trim().max(2000),
    rationale: z.string().trim().max(2000),
    unknowns: z.array(text).min(1).max(30),
  })
  .strict();
export const ingestionSchema = z
  .object({
    batchKey: z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/),
    expectedRevision: z.number().int().nonnegative(),
    observedAt: z.iso.datetime(),
    status: z.enum(["Completed", "Partial", "Needs attention"]),
    categories: z.array(z.enum(categories)).min(1).max(5),
    warnings: z.array(text).max(30),
    items: z
      .array(
        z
          .object({
            candidate: marketCandidate,
            context: observationContext.optional(),
            summary: text,
            assessment: assessmentSchema,
            receipts: z
              .array(
                z
                  .object({
                    url: z.url().max(2048),
                    retrievedAt: z.iso.datetime(),
                    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
                  })
                  .strict(),
              )
              .min(1)
              .max(8),
          })
          .strict(),
      )
      .max(50),
  })
  .strict()
  .superRefine((batch, ctx) => {
    if (batch.status !== "Completed" && !batch.warnings.length)
      ctx.addIssue({
        code: "custom",
        message: "Incomplete coverage requires an explanation.",
      });
    for (const item of batch.items) {
      if (
        item.candidate.categories.some(
          (c) => c === "competitor" || c === "property",
        ) &&
        !item.context
      )
        ctx.addIssue({
          code: "custom",
          message: "Property observations require identity and source context.",
        });
      if (!item.candidate.categories.every((c) => batch.categories.includes(c)))
        ctx.addIssue({
          code: "custom",
          message: "Candidate outside declared coverage.",
        });
      for (const s of item.candidate.sources) {
        const receipt = item.receipts.find((r) => r.url === s.url);
        if (
          !receipt ||
          receipt.retrievedAt > batch.observedAt ||
          (s.publishedAt && s.publishedAt > batch.observedAt.slice(0, 10))
        )
          ctx.addIssue({
            code: "custom",
            message: "Missing or future source receipt.",
          });
      }
      for (const field of factFields)
        if (
          item.candidate.facts[field] !== null &&
          !item.candidate.sources.some((s) =>
            s.claims.some((c) => c.field === field),
          )
        )
          ctx.addIssue({
            code: "custom",
            message: `Missing claim support: ${field}.`,
          });
    }
  });
export type Ingestion = z.infer<typeof ingestionSchema>;
export const marketRecord = z
  .object({
    id: z.string(),
    key: z.string(),
    title: z.string(),
    summary: z.string(),
    location: z.string(),
    categories: z.array(z.enum(categories)),
    facts: factsSchema,
    context: observationContext.optional(),
    firstSeenAt: z.iso.datetime(),
    lastCheckedAt: z.iso.datetime(),
    factPublishedAt: z.iso.date().nullable(),
    evidence: z.array(
      z.object({
        id: z.string(),
        url: z.url(),
        publisher: z.string(),
        publishedAt: z.iso.date().nullable(),
        retrievedAt: z.iso.datetime(),
        contentHash: z.string(),
        excerpt: z.string().max(500).optional(),
        sourceClass: z.string().optional(),
        originId: z.string().optional(),
        retrievalStatus: z.literal("retrieved").optional(),
        provenance: z.enum(["synthetic", "reviewed"]).optional(),
        claims: z.array(
          z.object({ field: z.enum(factFields), quote: z.string() }),
        ),
      }),
    ),
    versions: z.array(
      z.object({
        at: z.iso.datetime(),
        summary: z.string(),
        before: factsSchema.nullable(),
        after: factsSchema,
        evidenceIds: z.array(z.string()),
        context: observationContext.optional(),
      }),
    ),
    quality: z.enum(["Imported", "Conflicting evidence"]),
  })
  .strict();
export const marketRun = z
  .object({
    batchKey: z.string(),
    at: z.iso.datetime(),
    status: z.enum(["Completed", "Partial", "Needs attention"]),
    newIds: z.array(z.string()),
    changedIds: z.array(z.string()),
    warnings: z.array(z.string()),
    categories: z.array(z.enum(categories)),
  })
  .strict();
export const storedMarket = z
  .object({
    records: z.array(marketRecord).max(500),
    assessments: z.record(z.string(), assessmentSchema),
    runs: z.array(marketRun).max(200),
  })
  .strict();
export type StoredMarket = z.infer<typeof storedMarket>;
export const customerFinding = marketRecord.extend({
  assessment: assessmentSchema,
  saved: z.boolean(),
  dismissed: z.boolean(),
  stateRevision: z.number().int().nonnegative(),
  dataMode: marketMode,
});
export type CustomerFinding = z.infer<typeof customerFinding>;
export const findingStateMutation = z
  .object({
    findingId: z.string().regex(/^finding-[a-f0-9]{64}$/),
    revision: z.number().int().nonnegative(),
    saved: z.boolean(),
    dismissed: z.boolean(),
  })
  .strict();
