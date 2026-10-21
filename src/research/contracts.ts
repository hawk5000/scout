import { z } from "zod";
import {
  categories,
  type Assessment,
  type Finding,
  type ResearchRun,
} from "../lib/contracts";

const text = z.string().trim().min(1).max(500);
const date = z.iso.date();
export const factFields = [
  "activity",
  "status",
  "start",
  "end",
  "venue",
  "contractor",
  "organizations",
] as const;
export const factsSchema = z
  .object({
    activity: z.enum([
      "facility",
      "expansion",
      "training",
      "construction",
      "event",
    ]),
    status: z.enum([
      "Announced",
      "Active",
      "Confirmed",
      "Proposed",
      "Canceled",
      "Completed",
    ]),
    start: date.nullable(),
    end: date.nullable(),
    venue: text.nullable(),
    contractor: text.nullable(),
    organizations: z.array(text).min(1).max(12),
  })
  .strict()
  .refine((v) => !v.start || !v.end || v.start <= v.end, "End precedes start.");
export const candidateSchema = z
  .object({
    kind: z.enum(categories),
    categories: z.array(z.enum(categories)).min(1).max(3),
    name: text,
    location: text,
    identity: text,
    edition: text.nullable(),
    facts: factsSchema,
    sources: z
      .array(
        z
          .object({
            url: z.url().max(2048),
            publisher: text,
            publishedAt: date.nullable(),
            claims: z
              .array(
                z
                  .object({
                    field: z.enum(factFields),
                    quote: z.string().min(1).max(2000),
                  })
                  .strict(),
              )
              .min(1)
              .max(20),
          })
          .strict(),
      )
      .min(1)
      .max(8),
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
export type Candidate = z.infer<typeof candidateSchema>;
export type Facts = z.infer<typeof factsSchema>;
export const usageSchema = z
  .object({
    inputTokens: z.number().int().min(0).max(4000),
    cachedInputTokens: z.number().int().min(0).max(4000),
    outputTokens: z.number().int().min(0).max(2000),
    reasoningTokens: z.number().int().min(0).max(1000),
    searchCalls: z.number().int().min(0).max(1),
    toolCalls: z.number().int().min(0).max(8),
  })
  .strict()
  .refine(
    (v) => v.cachedInputTokens <= v.inputTokens,
    "Cached input exceeds total input.",
  );
export type Usage = z.infer<typeof usageSchema>;
export const responseSchema = z
  .object({ candidates: z.array(candidateSchema).max(12), usage: usageSchema })
  .strict();
export const scenarioNames = [
  "baseline",
  "update",
  "quiet",
  "outage",
  "conflict",
  "cancellation",
  "next-edition",
  "malformed",
  "injection",
  "budget-cutoff",
  "retry",
  "interrupted",
] as const;
export type Scenario = (typeof scenarioNames)[number];
export const replaySchema = z
  .object({
    scenario: z.enum(scenarioNames),
    cycleKey: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
  })
  .strict();
export type Scope = { tenant_id: string; property_id: string };
export type EngineRecord = {
  key: string;
  familyKey: string;
  facts: Facts;
  factPublishedAt: string | null;
  finding: Finding;
  assessment: Assessment;
};
export interface SyntheticRun extends ResearchRun {
  scenario: Scenario;
  engine: "synthetic-v1";
  counts: {
    accepted: number;
    rejected: number;
    sources: number;
    attempts: number;
  };
  coverage: Record<(typeof categories)[number], string>;
  usage: {
    rateCard: "synthetic-credits-v1";
    provider: "fixture";
    model: "recorded-structured-output-v1";
    actualChargedUsd: 0;
    estimatedCredits: number;
    reconciledCredits: number;
    heldCredits: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    searchCalls: number;
    toolCalls: number;
  };
}
// These are artificial test credits, never USD estimates or provider prices.
export const policy = Object.freeze({
  perRunCredits: 1500,
  monthlyCredits: 10000,
  perAttemptCredits: 300,
  maxAttempts: 4,
  maxRetries: 1,
  maxSources: 24,
  maxCandidates: 36,
  maxTokens: 30000,
  maxRuntimeMs: 3000,
  maxBytes: 16000,
  maxRedirects: 2,
  staleDays: 30,
});
export function usageCredits(input: Usage) {
  const u = usageSchema.parse(input);
  return (
    Math.ceil((u.inputTokens - u.cachedInputTokens) / 100) +
    Math.ceil(u.cachedInputTokens / 200) +
    Math.ceil(u.outputTokens / 50) +
    Math.ceil(u.reasoningTokens / 50) +
    u.searchCalls * 5 +
    u.toolCalls * 2
  );
}
