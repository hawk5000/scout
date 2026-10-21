import type { FindingView, ResearchRun } from "./contracts";

export function latestMaterialUpdate(
  runs: ResearchRun[],
  findings: FindingView[],
) {
  const known = new Set(findings.map((f) => f.id));
  const run = [...runs]
    .sort((a, b) => b.at.localeCompare(a.at))
    .find(
      (r) => r.type === "update" && r.changedIds.some((id) => known.has(id)),
    );
  return {
    run,
    ids: new Set(run?.changedIds.filter((id) => known.has(id)) ?? []),
  };
}

export function sortFindings(
  findings: FindingView[],
  order: "changed" | "date",
) {
  const time = (f: FindingView) => {
    const value =
      order === "date"
        ? f.start
        : [...f.versions]
            .filter((v) => v.material && v.before !== null)
            .sort((a, b) => b.at.localeCompare(a.at))[0]?.at;
    return value && Number.isFinite(Date.parse(value))
      ? Date.parse(value)
      : null;
  };
  return [...findings].sort((a, b) => {
    const x = time(a),
      y = time(b);
    if (x === null && y !== null) return 1;
    if (y === null && x !== null) return -1;
    return (
      (x !== null && y !== null ? (order === "date" ? x - y : y - x) : 0) ||
      a.title.localeCompare(b.title)
    );
  });
}

export function runFindingSummary(f: FindingView, run: ResearchRun) {
  const version = [...f.versions]
    .filter((v) => v.at <= run.at)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  return (
    version?.summary ??
    "Recorded in this sample update; historical detail unavailable."
  );
}
