import type { Evidence, Profile } from "../lib/contracts";
import {
  type Candidate,
  type EngineRecord,
  type Facts,
  factFields,
} from "./contracts";
import { digest, normalize, type FixtureRetriever } from "./retrieval";
import { playbooks } from "./playbooks";
export interface Supported {
  candidate: Candidate;
  evidence: Evidence[];
  publishedAt: string | null;
}
export function validateEvidence(
  c: Candidate,
  retriever: FixtureRetriever,
  now: string,
): Supported {
  const evidence: Evidence[] = [];
  const covered = new Set<string>();
  let publication: string | null = null;
  for (const source of c.sources) {
    const doc = retriever.retrieve(source.url);
    if (
      !doc.body.includes(`Publisher: ${source.publisher}`) ||
      (source.publishedAt &&
        !doc.body.includes(`Publication: ${source.publishedAt}`))
    )
      throw Error("Source metadata lacks retrieved support.");
    if (
      !normalize(doc.body).includes(normalize(c.name)) ||
      !normalize(doc.body).includes(normalize(c.location)) ||
      !normalize(doc.body).includes(normalize(c.identity)) ||
      (c.edition && !normalize(doc.body).includes(normalize(c.edition)))
    )
      throw Error("Identity lacks source support.");
    if (source.publishedAt && source.publishedAt > now.slice(0, 10))
      throw Error("Source publication is in the future.");
    for (const claim of source.claims) {
      if (!doc.body.includes(claim.quote))
        throw Error("Claim quote absent from retrieved source.");
      const value = c.facts[claim.field];
      if (value === null) continue;
      if (
        !(Array.isArray(value) ? value : [value]).every((v) =>
          normalize(claim.quote).includes(normalize(v)),
        )
      )
        throw Error("Claim does not support its structured value.");
      covered.add(claim.field);
    }
    if (
      source.publishedAt &&
      (!publication || source.publishedAt > publication)
    )
      publication = source.publishedAt;
    evidence.push({
      id: `syn-source-${digest(doc.url + doc.hash + source.publishedAt)}`,
      url: doc.url,
      publisher: source.publisher,
      publishedAt: source.publishedAt,
      retrievedAt: now,
      lastVerifiedAt: null,
      claim: source.claims.map((x) => `${x.field}: ${x.quote}`).join("\n"),
      verification: "fictional",
    });
  }
  for (const field of factFields)
    if (c.facts[field] !== null && !covered.has(field))
      throw Error(`Missing evidence for ${field}.`);
  return { candidate: c, evidence, publishedAt: publication };
}
export function identity(c: Candidate) {
  const family = [c.kind, normalize(c.identity), normalize(c.location)].join(
    "|",
  );
  return {
    family,
    key: family + (c.kind === "event" ? `|${normalize(c.edition!)}` : ""),
  };
}
const comparable = (f: Facts) =>
  JSON.stringify({
    ...f,
    venue: f.venue ? normalize(f.venue) : null,
    contractor: f.contractor ? normalize(f.contractor) : null,
    organizations: [...new Set(f.organizations.map(normalize))].sort(),
  });
function summary(f: Facts) {
  return `Fictional ${f.activity}: ${f.status.toLowerCase()}. ${f.start ? `Starts ${f.start}. ` : ""}${f.end ? `Ends ${f.end}. ` : ""}${f.venue ? `Venue: ${f.venue}. ` : ""}${f.contractor ? `Contractor: ${f.contractor}. ` : ""}Organizations: ${f.organizations.join(", ")}.`;
}
export function mergeGroup(
  group: Supported[],
  previous: EngineRecord | undefined,
  now: string,
): { record: EngineRecord; changed: boolean; conflict: boolean } {
  const sorted = [...group].sort((a, b) =>
    (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""),
  );
  const last = sorted.at(-1)!;
  const c = last.candidate;
  const ident = identity(c);
  const sameDate = sorted.filter((s) => s.publishedAt === last.publishedAt);
  let conflict =
    new Set(sameDate.map((x) => comparable(x.candidate.facts))).size > 1;
  let facts = structuredClone(last.candidate.facts);
  if (previous) {
    if (
      previous.finding.quality === "Conflicting evidence" &&
      (last.publishedAt ?? "") <= (previous.factPublishedAt ?? "")
    )
      conflict = true;
    // A missing field is not evidence that a previously known fact disappeared.
    for (const key of ["start", "end", "venue", "contractor"] as const)
      facts[key] ??= previous.facts[key];
    if ((last.publishedAt ?? "") < (previous.factPublishedAt ?? ""))
      facts = previous.facts;
    else if (
      last.publishedAt === previous.factPublishedAt &&
      comparable(facts) !== comparable(previous.facts)
    )
      conflict = true;
    if (conflict) facts = previous.facts;
  } else if (conflict) {
    throw Error("Conflicting initial facts require review before publication.");
  }
  const material =
    !previous || comparable(facts) !== comparable(previous.facts);
  const id = previous?.finding.id ?? `synthetic-${digest(ident.key)}`;
  const evidence = [
    ...new Map(
      [
        ...(previous?.finding.evidence ?? []),
        ...group.flatMap((g) => g.evidence),
      ].map((e) => [e.id, e]),
    ).values(),
  ];
  const categories = [
    ...new Set([
      ...(previous?.finding.categories ?? []),
      ...group.flatMap((g) => g.candidate.categories),
    ]),
  ];
  const changedFields = previous
    ? factFields.filter(
        (f) => JSON.stringify(facts[f]) !== JSON.stringify(previous.facts[f]),
      )
    : [];
  const versions = [...(previous?.finding.versions ?? [])];
  if (material)
    versions.push({
      id: `${id}-v${versions.length + 1}`,
      at: now,
      summary: previous
        ? `Changed: ${changedFields.join(", ")}.`
        : "Synthetic baseline finding established.",
      material: true,
      before: previous ? JSON.stringify(previous.facts) : null,
      after: JSON.stringify(facts),
      evidenceIds: group.flatMap((g) => g.evidence.map((e) => e.id)),
    });
  const unknowns = [
    "No live evidence has been verified.",
    "No public lodging contact is verified.",
    "Actual overnight demand and room requirements are unknown.",
    ...(conflict
      ? ["Sources disagree; retained the last accepted facts."]
      : []),
  ];
  const record: EngineRecord = {
    key: ident.key,
    familyKey: ident.family,
    facts,
    factPublishedAt: conflict
      ? (previous?.factPublishedAt ?? null)
      : ([previous?.factPublishedAt, last.publishedAt]
          .filter((d): d is string => !!d)
          .sort()
          .at(-1) ?? null),
    finding: {
      id,
      entityId: `synthetic-entity-${digest(ident.key)}`,
      category: c.kind,
      categories,
      title:
        previous?.finding.title ??
        `${c.name}${c.edition ? ` · ${c.edition}` : ""}`,
      summary: summary(facts),
      location: c.location,
      start: facts.start,
      end: facts.end,
      status: facts.status,
      organizations: facts.organizations,
      publicContact: null,
      firstSeenAt: previous?.finding.firstSeenAt ?? now,
      lastCheckedAt: now,
      lastVerifiedAt: null,
      quality: conflict ? "Conflicting evidence" : "Sample evidence",
      evidence,
      versions,
    },
    assessment: {
      findingId: id,
      inference: ["Canceled", "Completed"].includes(facts.status)
        ? "This activity is canceled or completed; do not treat it as current lodging demand."
        : playbooks[c.kind].inference,
      rationale: summary(facts),
      unknowns,
      version: (previous?.assessment.version ?? 0) + (material ? 1 : 0),
    },
  };
  return { record, changed: material, conflict };
}
export function markUncertainty(record: EngineRecord, reason: string) {
  record.finding.quality = "Needs verification";
  if (!record.assessment.unknowns.includes(reason))
    record.assessment.unknowns.push(reason);
}
export function monthInTimezone(now: Date, profile: Profile) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: profile.timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
