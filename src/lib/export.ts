import type { FindingView } from "./contracts";
export const csvColumns = [
  "finding_id",
  "category",
  "name",
  "factual_summary",
  "location",
  "relevant_start",
  "relevant_end",
  "status",
  "organizations",
  "public_contact",
  "lodging_relevance_inference",
  "unknowns",
  "source_urls",
  "last_verified_at",
  "change_summary",
  "data_mode",
] as const;
export function csvCell(input: unknown) {
  let value = String(input ?? "");
  if (/^[\s\u0000-\u001f\ufeff]*[=+@-]/u.test(value) || /^[\t\r\n]/.test(value))
    value = `'${value}`;
  return `"${value.replaceAll('"', '""')}"`;
}
export function toCsv(findings: FindingView[]) {
  return (
    "\ufeff" +
    [
      csvColumns.join(","),
      ...findings.map((f) =>
        [
          f.id,
          (f.categories ?? [f.category]).join("; "),
          f.title,
          f.summary,
          f.location,
          f.start,
          f.end,
          f.status,
          f.organizations.join("; "),
          f.publicContact,
          f.inference,
          f.unknowns.join("; "),
          f.evidence.map((e) => e.url).join("; "),
          f.lastVerifiedAt,
          f.versions.at(-1)?.summary,
          "FICTIONAL DEMO",
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n")
  );
}
export function toBrief(f: FindingView) {
  return `FICTIONAL SCOUT DEMO — not researched or verified\n${f.title}\n\nSample fact: ${f.summary}\nLocation: ${f.location}\nDates: ${f.start ?? "Unknown"} to ${f.end ?? "Unknown"}\nStatus: ${f.status}\n\nLodging inference: ${f.inference}\nUnknowns: ${f.unknowns.join("; ")}\nPublic contact: ${f.publicContact ?? "Not verified"}\nEvidence examples: ${f.evidence.map((e) => e.url).join(", ")}\nLast verified: ${f.lastVerifiedAt ?? "Never — fictional data"}\nChange: ${f.versions.at(-1)?.summary}\nFinding ID: ${f.id}`;
}
