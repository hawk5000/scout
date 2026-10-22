import {
  ingestionSchema,
  type Ingestion,
  type MarketCategory,
} from "./market-contracts";
import type {
  ExpansionConfiguration,
  fixtureScenarios,
} from "./expansion-contracts";
import { fixtureItems, matchProperty } from "./expansion-fixtures";
import {
  SourceError,
  sourceUrl,
  type RetrievedSource,
} from "../research/source-adapters";
export type ResearchInput = {
  jobId?: string;
  category: MarketCategory;
  config: ExpansionConfiguration;
  propertyId: string;
  scenario: (typeof fixtureScenarios)[number];
  at: string;
};
export interface ExpansionProvider {
  readonly mode: "synthetic";
  research(input: ResearchInput): Promise<Ingestion["items"]>;
}
export const fixtureExpansionProvider: ExpansionProvider = {
  mode: "synthetic",
  research: (i) =>
    fixtureItems(i.category, i.config, i.propertyId, i.scenario, i.at),
};
// Adapter output enters the EXISTING ingestion/versioning engine, never direct SQL.
// Dates/receipts come from retrieval, not generated model strings. Fact interpretation
// remains reviewable; verbatim support alone is not a claim of semantic correctness.
export function validateSourceItems(
  input: ResearchInput,
  drafts: Ingestion["items"],
  sources: RetrievedSource[],
) {
  const items = structuredClone(drafts);
  for (const item of items) {
    item.receipts = [];
    for (const evidence of item.candidate.sources) {
      const canonical = sourceUrl(
        evidence.url,
        sources.map((s) => new URL(s.url).hostname),
      );
      const source = sources.find((s) => s.url === canonical);
      evidence.url = canonical;
      if (
        !source ||
        !source.body.trim() ||
        !Number.isFinite(Date.parse(source.retrievedAt)) ||
        source.retrievedAt > input.at ||
        Date.parse(input.at) - Date.parse(source.retrievedAt) > 24 * 3600000 ||
        evidence.claims.some((c) => !source.body.includes(c.quote))
      )
        throw new SourceError("EVIDENCE_UNSUPPORTED");
      evidence.publishedAt = source.publishedAt;
      item.receipts.push({
        url: source.url,
        retrievedAt: source.retrievedAt,
        contentHash: source.contentHash,
      });
    }
    if (item.context) {
      const subject =
        input.category === "property"
          ? input.config.own
          : input.config.competitors.find(
              (c) => c.id === item.context!.subjectId && c.active,
            );
      if (
        !subject ||
        (input.category === "property" &&
          item.context.subjectId !== input.propertyId)
      )
        throw new SourceError("SUBJECT_NOT_SELECTED");
      const bodies = sources
        .filter((s) => item.candidate.sources.some((e) => e.url === s.url))
        .map((s) => s.body);
      if (!bodies.some((b) => b.includes(item.context!.excerpt)))
        throw new SourceError("EXCERPT_UNSUPPORTED");
      // Independent attributes must occur together on at least one actual source.
      const matching = bodies.map((body) =>
        matchProperty(subject, {
          name:
            [subject.name, ...subject.aliases, ...subject.formerNames].find(
              (n) => n && body.toLowerCase().includes(n.toLowerCase()),
            ) ?? "",
          address:
            subject.address &&
            body.toLowerCase().includes(subject.address.toLowerCase())
              ? subject.address
              : undefined,
          domain:
            subject.domain &&
            body.toLowerCase().includes(subject.domain.toLowerCase())
              ? subject.domain
              : undefined,
        }),
      );
      const match =
        matching.find((m) => m.match === "confirmed") ??
        matching.find((m) => m.match === "ambiguous") ??
        matching[0];
      // Never upgrade a provider's ambiguous/brand-wide result to confirmed automatically.
      if (item.context.match === "confirmed" && match.match !== "confirmed")
        Object.assign(item.context, match);
    }
  }
  return ingestionSchema.parse({
    expectedRevision: 0,
    batchKey: "adapter-validation",
    observedAt: input.at,
    status: "Completed",
    categories: [input.category],
    warnings: [],
    items,
  }).items;
}
