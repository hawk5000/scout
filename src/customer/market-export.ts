import { z } from "zod";
import { marketCategories as categories } from "./market-contracts";
import { csvCell } from "../lib/export";
import { CustomerError } from "./contracts";
import type { CustomerFinding } from "./market-contracts";
export const customerFilters = z
  .object({
    q: z.string().max(200).default(""),
    category: z.enum(["all", ...categories]).default("all"),
    state: z
      .enum(["all", "visible", "saved", "dismissed", "updated"])
      .default("visible"),
    ids: z.string().max(40000).optional(),
  })
  .strict();
export function selectCustomerFindings(
  findings: CustomerFinding[],
  params: URLSearchParams,
) {
  if ([...params.keys()].some((k) => params.getAll(k).length > 1))
    throw new CustomerError("Duplicate filter.", 400);
  const filter = customerFilters.parse(Object.fromEntries(params));
  const ids = filter.ids?.split(",");
  if (ids?.some((id) => !findings.some((f) => f.id === id)))
    throw new CustomerError("Finding unavailable.", 404);
  return findings.filter(
    (f) =>
      (!ids || ids.includes(f.id)) &&
      (filter.category === "all" || f.categories.includes(filter.category)) &&
      (filter.state === "all" ||
        (filter.state === "visible" && !f.dismissed) ||
        (filter.state === "saved" && f.saved) ||
        (filter.state === "dismissed" && f.dismissed) ||
        (filter.state === "updated" && f.versions.length > 1)) &&
      [f.title, f.summary, f.location, ...f.facts.organizations]
        .join(" ")
        .toLowerCase()
        .includes(filter.q.toLowerCase()),
  );
}
export function customerCsv(findings: CustomerFinding[]) {
  return (
    "\ufeff" +
    [
      "finding_id,name,categories,observed_facts,location,start,end,status,lodging_inference,unknowns,sources,last_checked,verification,data_mode,subject,identity_match,sentiment,sentiment_context,published,discovered",
      ...findings.map((f) =>
        [
          f.id,
          f.title,
          f.categories.join("; "),
          f.summary,
          f.location,
          f.facts.start,
          f.facts.end,
          f.facts.status,
          f.assessment.inference,
          f.assessment.unknowns.join("; "),
          f.evidence.map((e) => e.url).join("; "),
          f.lastCheckedAt,
          "Imported evidence; not independently verified by SCOUT",
          f.dataMode === "synthetic"
            ? "FICTIONAL SYNTHETIC FIXTURE"
            : "REVIEWED IMPORT",
          f.context?.subjectId,
          f.context?.match,
          f.context?.sentiment,
          f.context?.sentimentReason,
          f.factPublishedAt,
          f.firstSeenAt,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n")
  );
}
export function customerBrief(f: CustomerFinding) {
  return `${f.dataMode === "synthetic" ? "FICTIONAL SYNTHETIC FIXTURE" : "REVIEWED IMPORT"}\n${f.title}\n\nObserved facts: ${f.summary}\n${f.location}\nDates: ${f.facts.start ?? "Unknown"} to ${f.facts.end ?? "Unknown"}\nStatus: ${f.facts.status}${f.context ? `\nIdentity: ${f.context.match}. ${f.context.matchReason}\nSentiment: ${f.context.sentiment}. ${f.context.sentimentReason}\nExcerpt: ${f.context.excerpt}` : ""}\n\nPotential hotel relevance (inference): ${f.assessment.inference || "Hotel relevance not assessed."}\nUnknowns: ${f.assessment.unknowns.join("; ")}\nSources: ${f.evidence.map((e) => e.url).join("; ")}\nLast checked: ${f.lastCheckedAt}\nImported evidence; not independently verified by SCOUT.`;
}
