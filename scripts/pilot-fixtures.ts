import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runSyntheticPilot, emptyReview } from "../src/research/pilot";
if (
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.SCOUT_LIVE_RESEARCH === "true"
)
  throw Error("Pilot rehearsal is local and synthetic only.");
const argv = process.argv.slice(2);
if (argv.length && (argv.length !== 2 || argv[0] !== "--review-file"))
  throw Error("Use --review-file <local JSON> or no arguments.");
if (argv[1] && statSync(argv[1]).size > 16000)
  throw Error("Review file exceeds 16 KB.");
const result = runSyntheticPilot(
  argv[1] ? JSON.parse(readFileSync(argv[1], "utf8")) : emptyReview,
);
const dir = path.join(process.cwd(), "reports", "synthetic-pilot");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "results.json"), JSON.stringify(result, null, 2));
for (const market of result.markets)
  writeFileSync(
    path.join(dir, `${market.market.toLowerCase()}-blueprint.csv`),
    market.csv,
  );
writeFileSync(
  path.join(dir, "review-template.json"),
  JSON.stringify(emptyReview, null, 2),
);
const lines = [
  "# SCOUT synthetic pilot rehearsal",
  "",
  "FICTIONAL FIXTURES ONLY. No real hotel, live research, paid calls or notifications. Virtual dates are not research execution dates.",
  "",
  `Fixture checks: ${result.passed ? "PASS" : "FAIL"}. Production launch: BLOCKED.`,
  "",
  "| Market | Unique records | Duplicates / records | Material updates | Baseline credits | Four update credits | Charged USD |",
  "|---|---:|---:|---:|---:|---:|---:|",
];
for (const m of result.markets)
  lines.push(
    `| ${m.market} (fictional) | ${m.metrics.uniqueFindings} | ${m.metrics.duplicateRecords}/${m.metrics.duplicateRecordDenominator} | ${m.metrics.materialUpdates} | ${m.metrics.baselineCredits} | ${m.metrics.recurringCredits} | $0 |`,
  );
lines.push(
  "",
  "Artificial credits are not provider prices. Live evidence accuracy, market completeness, human correction/onboarding time and profitability remain unmeasured unless a separate fixture review is supplied; even that review cannot establish live outcomes.",
  "",
  "## Cycle evidence",
);
for (const m of result.markets) {
  lines.push("", `### ${m.market} — fictional district`);
  for (const c of m.cycles)
    lines.push(
      `- ${c.at}: ${c.fixtureScenario}, ${c.status}; ${c.newFindings} new, ${c.materialUpdates} changed, ${c.preparedDisabledPreviews} disabled previews.`,
    );
  for (const c of m.checks)
    lines.push(`- ${c.passed ? "PASS" : "FAIL"}: ${c.name}`);
}
lines.push(
  "",
  "## Live activation dependencies",
  ...result.pending.map((p) => `- ${p}`),
);
writeFileSync(path.join(dir, "REPORT.md"), lines.join("\n") + "\n");
console.log(
  `Synthetic pilot ${result.passed ? "passed" : "failed"}. Results: ${dir}. Live launch remains blocked.`,
);
if (!result.passed) process.exitCode = 1;
