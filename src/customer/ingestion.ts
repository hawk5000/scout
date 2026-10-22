import { CustomerError } from "./contracts";
import { digest, type Database } from "./store";
import {
  ingestionSchema,
  storedMarket,
  type Ingestion,
  type StoredMarket,
} from "./market-contracts";
import type { Facts } from "../research/contracts";
export type IngestionScope = {
  tenantId: string;
  propertyId: string;
  actor: string;
  jobGuard?: { id: string; lease: string };
  dataMode: "synthetic" | "reviewed";
};
const normalized = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
function canonicalFacts(f: Facts) {
  return JSON.stringify({
    ...f,
    venue: f.venue ? normalized(f.venue) : null,
    contractor: f.contractor ? normalized(f.contractor) : null,
    organizations: [...new Set(f.organizations.map(normalized))].sort(),
  });
}
function key(
  c: Ingestion["items"][number]["candidate"],
  context?: Ingestion["items"][number]["context"],
) {
  if (context)
    return JSON.stringify([
      c.kind,
      context.subjectId,
      normalized(context.originId),
      c.edition,
    ]);
  return JSON.stringify([
    c.facts.activity === "event" ? "event" : "activity",
    normalized(c.identity),
    normalized(c.location),
    c.edition ? normalized(c.edition) : null,
  ]);
}
function safeSource(value: string, mode: IngestionScope["dataMode"]) {
  const u = new URL(value);
  const h = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !h.includes(".") ||
    h.includes(":") ||
    /^\d+(\.\d+){3}$/.test(h) ||
    /\.(localhost|local|internal|test|invalid)$/.test(h) ||
    h === "localhost" ||
    (mode === "synthetic" ? !h.endsWith(".example") : h.endsWith(".example"))
  )
    throw new CustomerError(
      "Source URL is not allowed for this data mode.",
      400,
    );
  u.hash = "";
  for (const name of [...u.searchParams.keys()])
    if (/^(utm_|fbclid$|gclid$)/i.test(name)) u.searchParams.delete(name);
  u.searchParams.sort();
  return u.toString();
}
export class MarketIngestion {
  constructor(
    private db: Database,
    private now: () => number = Date.now,
  ) {}
  async ingest(scope: IngestionScope, raw: unknown, previewOnly = false) {
    const input = ingestionSchema.parse(raw);
    if (
      scope.dataMode === "synthetic" &&
      (!scope.tenantId.startsWith("fixture_") ||
        !scope.propertyId.startsWith("fixture_"))
    )
      throw new CustomerError(
        "Synthetic imports require an isolated fixture scope.",
        403,
      );
    if (Date.parse(input.observedAt) > this.now())
      throw new CustomerError("Future observations are not accepted.", 400);
    const hash = await digest(JSON.stringify(input));
    const prior = () =>
      this.db
        .prepare(
          "SELECT payload_hash FROM customer_ingestion_batches WHERE tenant_id=? AND property_id=? AND batch_key=?",
        )
        .bind(scope.tenantId, scope.propertyId, input.batchKey)
        .first<{ payload_hash: string }>();
    const enrolled = await this.db
      .prepare(
        "SELECT m.* FROM customer_markets m JOIN customer_properties p USING(tenant_id,property_id) WHERE m.tenant_id=? AND m.property_id=? AND p.active=1",
      )
      .bind(scope.tenantId, scope.propertyId)
      .first<{ data_mode: string; revision: number; document_json: string }>();
    if (!enrolled || enrolled.data_mode !== scope.dataMode)
      throw new CustomerError("Market ingestion scope is not enrolled.", 403);
    const previous = await prior();
    if (previous) {
      if (previous.payload_hash !== hash)
        throw new CustomerError(
          "Batch key already used with different content.",
          409,
        );
      return { batchKey: input.batchKey, replayed: true };
    }
    if (enrolled.revision !== input.expectedRevision)
      throw new CustomerError(
        "Market revision changed. Reload before importing.",
        409,
      );
    const doc = storedMarket.parse(JSON.parse(enrolled.document_json));
    if (doc.runs.some((r) => r.at > input.observedAt))
      throw new CustomerError("Out-of-order observation requires review.", 409);
    const result = await merge(doc, input, scope.dataMode);
    const encoded = JSON.stringify(result);
    if (new TextEncoder().encode(encoded).length > 1000000)
      throw new CustomerError(
        "Market storage limit reached; archive review required.",
        413,
      );
    if (previewOnly)
      return {
        batchKey: input.batchKey,
        replayed: false,
        revision: input.expectedRevision + 1,
        document: result,
        payloadHash: hash,
      };
    try {
      const committed = await this.db
        .prepare(
          scope.jobGuard
            ? "INSERT INTO customer_ingestion_batches(tenant_id,property_id,batch_key,payload_hash,expected_revision,actor,at,document_json) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM customer_refresh_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash JOIN customer_memberships m ON m.tenant_id=s.tenant_id AND m.property_id=s.property_id AND m.user_id=s.user_id WHERE j.tenant_id=? AND j.property_id=? AND j.id=? AND j.lease=? AND j.state='running' AND j.lease_until>? AND s.expires_at>? AND m.active=1 AND m.role IN('editor','admin')) RETURNING batch_key"
            : "INSERT INTO customer_ingestion_batches(tenant_id,property_id,batch_key,payload_hash,expected_revision,actor,at,document_json) VALUES(?,?,?,?,?,?,?,?) RETURNING batch_key",
        )
        .bind(
          scope.tenantId,
          scope.propertyId,
          input.batchKey,
          hash,
          input.expectedRevision,
          scope.actor,
          new Date(this.now()).toISOString(),
          encoded,
          ...(scope.jobGuard
            ? [
                scope.tenantId,
                scope.propertyId,
                scope.jobGuard.id,
                scope.jobGuard.lease,
                this.now(),
                this.now(),
              ]
            : []),
        )
        .first();
      if (!committed)
        throw new CustomerError(
          "Refresh ownership changed; resume the current job.",
          409,
        );
    } catch (error) {
      const raced = await prior();
      if (raced?.payload_hash === hash)
        return { batchKey: input.batchKey, replayed: true };
      if (raced || String(error).includes("market_revision_conflict"))
        throw new CustomerError(
          "Market revision or batch key changed. Reload before importing.",
          409,
        );
      throw error;
    }
    return {
      batchKey: input.batchKey,
      replayed: false,
      revision: input.expectedRevision + 1,
      run: result.runs.at(-1),
    };
  }
}
async function merge(
  doc: StoredMarket,
  input: Ingestion,
  mode: IngestionScope["dataMode"],
) {
  const groups = new Map<string, Ingestion["items"]>();
  for (const item of input.items) {
    const k = key(item.candidate, item.context);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  const newIds: string[] = [],
    changedIds: string[] = [],
    warnings = [...input.warnings];
  for (const [k, group] of groups) {
    const prior = doc.records.find((f) => f.key === k);
    // Unknown publication dates cannot displace dated facts. Same-date disagreements require review.
    const dated = group
      .map((item) => ({
        item,
        published:
          item.candidate.sources
            .map((s) => s.publishedAt ?? "")
            .sort()
            .at(-1) ?? "",
      }))
      .sort((a, b) => a.published.localeCompare(b.published));
    const last = dated.at(-1)!;
    const c = last.item.candidate;
    const pub = last.published || null;
    let facts = structuredClone(c.facts);
    if (prior)
      for (const field of ["start", "end", "venue", "contractor"] as const)
        facts[field] ??= prior.facts[field];
    const conflict =
      new Set(
        dated
          .filter((x) => x.published === last.published)
          .map((x) => canonicalFacts(x.item.candidate.facts)),
      ).size > 1 ||
      !!(
        prior &&
        (pub ?? "") === (prior.factPublishedAt ?? "") &&
        canonicalFacts(facts) !== canonicalFacts(prior.facts)
      );
    const stale = !!prior && (pub ?? "") < (prior.factPublishedAt ?? "");
    if (conflict && !prior)
      throw new CustomerError("Conflicting initial facts require review.", 409);
    const retain = stale || conflict;
    if (retain && prior) facts = prior.facts;
    const id = prior?.id ?? `finding-${await digest(k)}`;
    const evidence = [...(prior?.evidence ?? [])];
    const incomingIds: string[] = [];
    for (const item of group)
      for (const source of item.candidate.sources) {
        const url = safeSource(source.url, mode);
        const receipt = item.receipts.find((r) => r.url === source.url)!;
        const eid = await digest(
          JSON.stringify([
            url,
            source.publisher,
            source.publishedAt,
            receipt.contentHash,
            source.claims,
            ...(item.context ? [item.context.excerpt] : []),
          ]),
        );
        incomingIds.push(eid);
        if (!evidence.some((e) => e.id === eid))
          evidence.push({
            id: eid,
            url,
            publisher: source.publisher,
            publishedAt: source.publishedAt,
            retrievedAt: receipt.retrievedAt,
            contentHash: receipt.contentHash,
            claims: source.claims,
            ...(item.context
              ? {
                  excerpt: item.context.excerpt,
                  sourceClass: item.context.sourceClass,
                  originId: item.context.originId,
                  retrievalStatus: "retrieved" as const,
                  provenance: mode,
                }
              : {}),
          });
      }
    const context = retain && prior ? prior.context : last.item.context;
    const material =
      !prior ||
      canonicalFacts(facts) !== canonicalFacts(prior.facts) ||
      JSON.stringify(context) !== JSON.stringify(prior.context);
    const versions = [...(prior?.versions ?? [])];
    if (material)
      versions.push({
        at: input.observedAt,
        summary: prior
          ? `Changed: ${
              Object.keys(facts)
                .filter(
                  (f) =>
                    JSON.stringify(facts[f as keyof Facts]) !==
                    JSON.stringify(prior.facts[f as keyof Facts]),
                )
                .join(", ") || "property context"
            }.`
          : "Initial imported finding.",
        context,
        before: prior?.facts ?? null,
        after: facts,
        evidenceIds: [...new Set(incomingIds)],
      });
    if (evidence.length > 100 || versions.length > 100)
      throw new CustomerError(
        "Finding history limit reached; archive review required.",
        413,
      );
    const persistentConflict =
      conflict ||
      !!(
        prior?.quality === "Conflicting evidence" &&
        (pub ?? "") <= (prior.factPublishedAt ?? "")
      );
    const record = {
      id,
      key: k,
      title: retain && prior ? prior.title : c.name,
      summary: retain && prior ? prior.summary : last.item.summary,
      location: c.location,
      categories: [
        ...new Set([
          ...(prior?.categories ?? []),
          ...group.flatMap((g) => g.candidate.categories),
        ]),
      ],
      facts,
      context,
      firstSeenAt: prior?.firstSeenAt ?? input.observedAt,
      lastCheckedAt: input.observedAt,
      factPublishedAt: retain && prior ? prior.factPublishedAt : pub,
      evidence,
      versions,
      quality: persistentConflict
        ? ("Conflicting evidence" as const)
        : ("Imported" as const),
    };
    if (prior) doc.records[doc.records.indexOf(prior)] = record;
    else doc.records.push(record);
    if (!retain || !prior) doc.assessments[id] = last.item.assessment;
    if (persistentConflict)
      warnings.push(
        `Conflicting evidence for ${record.title}; accepted facts retained.`,
      );
    if (!prior) newIds.push(id);
    else if (material) changedIds.push(id);
  }
  doc.runs.push({
    batchKey: input.batchKey,
    at: input.observedAt,
    status:
      warnings.some((w) => w.startsWith("Conflicting evidence")) &&
      input.status === "Completed"
        ? "Partial"
        : input.status,
    newIds,
    changedIds,
    warnings,
    categories: input.categories,
  });
  return storedMarket.parse(doc);
}
