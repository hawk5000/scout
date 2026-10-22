import type {
  ExpansionConfiguration,
  fixtureScenarios,
} from "./expansion-contracts";
import type { Ingestion, MarketCategory } from "./market-contracts";
import { digest } from "./store";
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
export function matchProperty(
  identity: ExpansionConfiguration["own"],
  observed: {
    name: string;
    address?: string;
    domain?: string;
    locality?: string;
    brandWide?: boolean;
  },
) {
  const name = [
    identity.name,
    ...identity.aliases,
    ...identity.formerNames,
  ].some((n) => n && norm(n) === norm(observed.name));
  const address =
    !!identity.address &&
    norm(identity.address) === norm(observed.address ?? "");
  const domain =
    !!identity.domain && norm(identity.domain) === norm(observed.domain ?? "");
  const locality =
    !!identity.locality &&
    norm(identity.locality) === norm(observed.locality ?? "");
  if (observed.brandWide)
    return {
      match: "unmatched" as const,
      matchReason:
        "Brand-wide source does not establish a change at this property.",
    };
  if ((name && (address || domain)) || (address && domain && locality))
    return {
      match: "confirmed" as const,
      matchReason:
        "Property name and address/domain agree with the selected identity.",
    };
  return {
    match: name ? ("ambiguous" as const) : ("unmatched" as const),
    matchReason:
      "Insufficient independent property attributes; do not confidently attribute this mention.",
  };
}
// Pure, bounded fixture adapter. It has no network or provider credentials. Units are not currency.
export async function fixtureItems(
  category: MarketCategory,
  config: ExpansionConfiguration,
  propertyId: string,
  scenario: (typeof fixtureScenarios)[number],
  at: string,
): Promise<Ingestion["items"]> {
  const subjects =
    category === "competitor"
      ? config.competitors.filter((c) => c.active)
      : category === "property"
        ? [{ ...config.own, id: propertyId }]
        : [{ ...config.own, id: "prospecting" }];
  return Promise.all(
    subjects.map(async (subject) => {
      const changed = scenario === "change" || scenario === "cancellation";
      const published =
        scenario === "cancellation"
          ? "2026-10-20"
          : changed
            ? "2026-10-19"
            : "2026-10-01";
      const event = category === "event" || category === "competitor";
      const facts = {
        activity: event
          ? ("event" as const)
          : category === "project"
            ? ("construction" as const)
            : category === "corporate"
              ? ("training" as const)
              : ("facility" as const),
        status:
          scenario === "cancellation" && event
            ? ("Canceled" as const)
            : ("Active" as const),
        start: event ? (changed ? "2026-12-05" : "2026-12-03") : null,
        end: event ? "2026-12-07" : null,
        venue: subject.name || "Fictional conference center",
        contractor: null,
        organizations: [
          category === "corporate"
            ? "Fictional training company"
            : subject.name || "Fictional organization",
        ],
      };
      const identity = event
        ? "fixture-conference-2026"
        : `fixture-${category}-${subject.id}`;
      const originId = `${category}-${subject.id}-source-1`;
      const url = `https://sources.example/${originId}`;
      const claims = Object.entries(facts)
        .filter(([, v]) => v !== null)
        .map(([field, value]) => ({
          field: field as keyof typeof facts,
          quote: String(value),
        }));
      const sources = [
        {
          url,
          publisher: "Fictional public source",
          publishedAt: published,
          claims,
        },
      ];
      if (category === "property")
        sources.push({
          url: `${url}-syndicated?utm_source=fixture`,
          publisher: "Fictional syndication",
          publishedAt: published,
          claims,
        });
      const match = matchProperty(subject, {
        name: subject.name,
        address:
          scenario === "ambiguous" && category === "property"
            ? undefined
            : subject.address,
        domain:
          scenario === "ambiguous" && category === "property"
            ? undefined
            : subject.domain,
      });
      return {
        candidate: {
          kind: category,
          categories: [category],
          name:
            category === "competitor"
              ? `${subject.name}: public conference announcement`
              : category === "property"
                ? `${subject.name}: guest experience mention`
                : `Fictional ${category} development`,
          identity,
          location: subject.locality || "Fictional market",
          edition: event ? "2026" : null,
          facts,
          sources,
        },
        ...(category === "property" || category === "competitor"
          ? {
              context: {
                subjectId: subject.id,
                sourceClass:
                  category === "property"
                    ? ("review" as const)
                    : ("event" as const),
                originId,
                ...match,
                sentiment:
                  category === "property"
                    ? ("mixed" as const)
                    : ("neutral" as const),
                sentimentReason:
                  category === "property"
                    ? "The fictional mention praises welcome and describes check-in delays; no rating is inferred."
                    : "Public announcement; no evaluative sentiment.",
                relatedIdentity:
                  category === "competitor" ? "fixture-conference-2026" : null,
                excerpt:
                  category === "property"
                    ? "Friendly welcome, but check-in took longer than expected."
                    : "The selected hotel is named as the conference venue.",
              },
            }
          : {}),
        summary:
          category === "property"
            ? "A fictional public mention describes both a welcoming arrival and a check-in delay."
            : event
              ? `A fictional conference is ${facts.status.toLowerCase()} for ${facts.start} at ${facts.venue}.`
              : "A fictional organization announced local activity. This is isolated acceptance data.",
        assessment: {
          inference:
            category === "property"
              ? "Arrival experience may merit internal review; this isolated mention does not establish a trend."
              : scenario === "cancellation" && event
                ? "Canceled activity should not be treated as an active lodging opportunity."
                : "This activity may be relevant to hotel sales planning; overnight demand is not established.",
          rationale: "Illustrative interpretation of the cited fixture only.",
          unknowns: [
            "Actual demand, attendance and commercial impact are unknown.",
            "Fixture sources are not real public coverage.",
          ],
        },
        receipts: await Promise.all(
          sources.map(async (s) => ({
            url: s.url,
            retrievedAt: at,
            contentHash: await digest(JSON.stringify([facts, s.publisher])),
          })),
        ),
      };
    }),
  );
}
