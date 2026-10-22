import test from "node:test";
import assert from "node:assert/strict";
import {
  publicDemoBriefing,
  publicDemoCategories,
  publicDemoCsv,
  publicDemoFindings,
} from "../src/lib/public-demo";

test("public demo includes every product category and reserved fictional evidence", () => {
  assert.deepEqual(
    [...new Set(publicDemoFindings.map((finding) => finding.category))].sort(),
    [...publicDemoCategories].sort(),
  );
  for (const finding of publicDemoFindings) {
    assert.equal(
      new URL(finding.source.url).hostname.endsWith(".example"),
      true,
    );
    assert.match(finding.source.published, /illustrative/i);
    assert.ok(finding.relevance.length > 20);
    assert.ok(finding.unknowns.length > 0);
  }
  const propertyMention = publicDemoFindings.find(
    (finding) => finding.category === "Property",
  );
  assert.equal(propertyMention?.sentiment, "Mixed");
  const linkedIds = publicDemoBriefing.sections.flatMap(
    (section) => section.findingIds,
  );
  assert.deepEqual(
    [...new Set(linkedIds)].sort(),
    publicDemoFindings.map((finding) => finding.id).sort(),
  );
  for (const section of publicDemoBriefing.sections) {
    assert.ok(section.implication.length > 30);
    assert.ok(section.unknowns.length > 10);
  }
});

test("public demo CSV labels synthetic content and neutralizes spreadsheet formulas", () => {
  const csv = publicDemoCsv(publicDemoFindings);
  assert.match(csv, /SYNTHETIC — NOT LIVE RESEARCH/);
  assert.match(csv, /https:\/\/.*\.example\//);
  assert.match(
    publicDemoCsv([
      {
        ...publicDemoFindings[0],
        title: '=HYPERLINK("https:\/\/bad.example")',
      },
    ]),
    /'=HYPERLINK/,
  );
});
