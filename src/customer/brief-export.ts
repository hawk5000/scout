import type { Brief } from "./expansion-contracts";
import { csvCell } from "../lib/export";
export function briefingText(b: Brief) {
  return [
    `SCOUT Briefing ${b.version} - ${b.status.toUpperCase()}`,
    "FICTIONAL SYNTHETIC FIXTURE - no live research",
    `As of ${b.generatedAt}`,
    ...b.coverage.map(
      (o) =>
        `${o.category}: ${o.status}. ${o.message} Last success: ${o.lastSuccessAt ?? "None"}`,
    ),
    ...b.sections.flatMap((s) => [
      "",
      s.heading,
      ...s.items.map(
        (i) =>
          `${i.ongoing ? "Ongoing context: " : ""}${i.statement}\nImplication (inference): ${i.implication}\nUnknowns: ${i.unknowns.join("; ")}\nSources: ${b.records
            .find((r) => r.id === i.findingId)!
            .evidence.filter((e) => i.evidenceIds.includes(e.id))
            .map(
              (e) =>
                `${e.url} (published ${e.publishedAt ?? "unknown"}, retrieved ${e.retrievedAt})`,
            )
            .join("; ")}`,
      ),
    ]),
    ...b.connections.map((c) => c.explanation),
    "",
    ...b.unknowns,
    `Actual charge: $0. Fixture units used: ${b.cost.usedFixtureUnits}.`,
  ].join("\n");
}
export function briefingCsv(b: Brief) {
  return (
    "\ufeff" +
    [
      [
        "brief_version",
        "status",
        "as_of",
        "section",
        "finding_id",
        "finding_version",
        "ongoing_context",
        "observed_facts",
        "implication_inference",
        "unknowns",
        "sources",
        "mode",
      ],
      ...b.sections.flatMap((s) =>
        s.items.map((i) => [
          b.version,
          b.status,
          b.generatedAt,
          s.heading,
          i.findingId,
          i.version,
          i.ongoing,
          i.statement,
          i.implication,
          i.unknowns.join("; "),
          b.records
            .find((r) => r.id === i.findingId)!
            .evidence.filter((e) => i.evidenceIds.includes(e.id))
            .map((e) => e.url)
            .join("; "),
          "FICTIONAL SYNTHETIC FIXTURE",
        ]),
      ),
    ]
      .map((row) => row.map((v) => csvCell(String(v))).join(","))
      .join("\r\n")
  );
}
