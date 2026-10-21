import { categories, type FindingView } from "./contracts";
import { findings, assessments } from "./fixtures";
// Deliberate allowlist of bundled fiction only. Never read private pilot/customer storage.
export const publicSample: FindingView[] = categories.map((category) => {
  const finding = findings.find((f) => f.category === category)!;
  return {
    ...finding,
    ...assessments.find((a) => a.findingId === finding.id)!,
    saved: false,
    dismissed: false,
  };
});
