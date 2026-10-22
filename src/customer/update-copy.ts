import type { Facts } from "../research/contracts";
const labels: Record<keyof Facts, string> = {
  activity: "Activity",
  status: "Status",
  start: "Start date",
  end: "End date",
  venue: "Venue",
  contractor: "Contractor",
  organizations: "Organizations involved",
};
export function updateDescription(
  version:
    { before: Facts | null; after: Facts; context?: unknown } | undefined,
): string {
  if (!version) return "Finding updated.";
  if (!version.before) return "New finding added to your market blueprint.";
  const changed = (Object.keys(labels) as (keyof Facts)[])
    .filter(
      (key) =>
        JSON.stringify(version.before![key]) !==
        JSON.stringify(version.after[key]),
    )
    .map((key) => labels[key]);
  if (!changed.length)
    return version.context
      ? "Property identity or sentiment context updated."
      : "No significant changes.";
  return changed.map((label) => `${label} updated.`).join(" ");
}
