import test from "node:test";
import assert from "node:assert/strict";
import { publicSample } from "../src/lib/public-sample";
import { toCsv } from "../src/lib/export";
import {
  runSyntheticPilot,
  commercialSensitivity,
  emptyReview,
} from "../src/research/pilot";
test("two-market pilot exercises baseline and four scheduled cycles with measured fixture results", () => {
  const r = runSyntheticPilot();
  assert.equal(r.passed, true);
  assert.equal(r.marketIsolation, true);
  for (const market of r.markets) {
    assert.equal(market.cycles.length, 5);
    assert.equal(market.metrics.baselineCredits, 84);
    assert.equal(market.metrics.recurringCredits, 336);
    assert.equal(market.metrics.materialUpdates, 6);
    assert.equal(market.metrics.duplicateRecords, 0);
    assert.equal(market.metrics.liveEvidenceAccuracy, null);
    assert.equal(market.metrics.humanReview.onboardingMinutes, null);
    assert.equal(market.metrics.actualChargedUsd, 0);
    assert.ok(market.findings.every((f) => f.title.includes(market.market)));
    assert.equal(market.cycles[2].preparedDisabledPreviews, 0);
    assert.equal(market.cycles[3].status, "Partial");
  }
  assert.equal(r.commercial.monthlyContributionUsd, null);
  assert.match(r.launchDecision, /BLOCKED/);
  assert.deepEqual(runSyntheticPilot(), r);
});
test("review inputs stay labeled, bounded and separate from unmeasured live quality", () => {
  const r = runSyntheticPilot({
    ...emptyReview,
    Seattle: {
      onboardingMinutes: 40,
      correctionMinutes: 5,
      usefulFindings: 2,
      notes: "Manual fixture review",
    },
  });
  assert.equal(r.markets[0].metrics.humanReview.correctionMinutes, 5);
  assert.equal(r.markets[0].metrics.liveEvidenceAccuracy, null);
  assert.throws(() => runSyntheticPilot({ ...emptyReview, mode: "live" }));
  assert.throws(() =>
    runSyntheticPilot({
      ...emptyReview,
      Seattle: { ...emptyReview.Seattle, usefulFindings: 4 },
    }),
  );
});
test("commercial sensitivity preserves unknowns and does not hide negative contribution", () => {
  const inputs = {
    monthlyResearchUsd: 20,
    monthlyHostingUsd: 10,
    supportMinutes: 60,
    hourlyLaborUsd: 30,
    onboardingMinutes: 120,
    baselineResearchUsd: 10,
  };
  const r = commercialSensitivity(inputs);
  assert.equal(r.monthlyContributionUsd, -10);
  assert.equal(r.setupContributionUsd, 29);
  assert.equal(
    commercialSensitivity({ ...inputs, supportMinutes: null })
      .monthlyContributionUsd,
    null,
  );
  assert.throws(() => commercialSensitivity({ ...inputs, hourlyLaborUsd: -1 }));
});
test("public sample is a three-scout fiction allowlist with no pilot or private rows", () => {
  assert.deepEqual(
    publicSample.map((f) => f.category),
    ["corporate", "project", "event"],
  );
  assert.ok(
    publicSample.every(
      (f) =>
        !f.saved &&
        !f.dismissed &&
        f.lastVerifiedAt === null &&
        f.unknowns.length > 0 &&
        f.evidence.every((e) => e.verification === "fictional"),
    ),
  );
  const csv = toCsv(publicSample);
  assert.match(csv, /FICTIONAL DEMO/);
  assert.ok(
    !csv.includes("Seattle") &&
      !csv.includes("Portland") &&
      !csv.includes("tenant_id"),
  );
});
