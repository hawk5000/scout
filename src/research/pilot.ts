import { z } from "zod";
import { commercialSensitivity } from "../lib/commercial";
export { commercialSensitivity } from "../lib/commercial";
import { DemoRepository, tokenHash } from "../server/repository";
import { demoProfile } from "../lib/fixtures";
import { toCsv } from "../lib/export";
import { SubscriptionStore, claimJob, processJob } from "./subscription";
import { ResearchStore } from "./store";
import { FixtureProvider } from "./provider";
import type { Scenario, Scope } from "./contracts";

const minutes = z.number().finite().min(0).max(10000).nullable();
export const reviewSchema = z
  .object({
    mode: z.literal("synthetic-review"),
    Seattle: z
      .object({
        onboardingMinutes: minutes,
        correctionMinutes: minutes,
        usefulFindings: z.number().int().min(0).max(3).nullable(),
        notes: z.string().max(2000),
      })
      .strict(),
    Portland: z
      .object({
        onboardingMinutes: minutes,
        correctionMinutes: minutes,
        usefulFindings: z.number().int().min(0).max(3).nullable(),
        notes: z.string().max(2000),
      })
      .strict(),
  })
  .strict();
export const emptyReview = {
  mode: "synthetic-review" as const,
  Seattle: {
    onboardingMinutes: null,
    correctionMinutes: null,
    usefulFindings: null,
    notes: "Not reviewed by a human.",
  },
  Portland: {
    onboardingMinutes: null,
    correctionMinutes: null,
    usefulFindings: null,
    notes: "Not reviewed by a human.",
  },
};

const sequence: {
  at: string;
  scenario: Scenario;
  expectedNew: number;
  expectedChanged: number;
  status: string;
}[] = [
  {
    at: "2026-10-19T16:00:00Z",
    scenario: "baseline",
    expectedNew: 3,
    expectedChanged: 0,
    status: "Completed",
  },
  {
    at: "2026-10-20T16:00:00Z",
    scenario: "update",
    expectedNew: 0,
    expectedChanged: 3,
    status: "Completed",
  },
  {
    at: "2026-10-23T16:00:00Z",
    scenario: "quiet",
    expectedNew: 0,
    expectedChanged: 0,
    status: "Completed",
  },
  {
    at: "2026-10-27T16:00:00Z",
    scenario: "outage",
    expectedNew: 0,
    expectedChanged: 0,
    status: "Partial",
  },
  {
    at: "2026-10-30T16:00:00Z",
    scenario: "cancellation",
    expectedNew: 0,
    expectedChanged: 3,
    status: "Completed",
  },
];

export function runSyntheticPilot(reviewInput: unknown = emptyReview) {
  const review = reviewSchema.parse(reviewInput);
  // Disposable isolated storage: never reads or mutates the customer demo database.
  const repo = new DemoRepository(":memory:");
  try {
    const markets = (["Seattle", "Portland"] as const).map((market) => {
      const start = Date.parse(sequence[0].at);
      const token = repo.createSession();
      const scope = repo.db
        .prepare(
          "SELECT tenant_id,property_id FROM sessions WHERE token_hash=?",
        )
        .get(tokenHash(token)) as Scope;
      // Virtual-clock fixture campaign spans two weeks; this does not change app session policy.
      repo.db
        .prepare("UPDATE sessions SET expires_at=? WHERE token_hash=?")
        .run(Math.max(start, Date.now()) + 30 * 86400000, tokenHash(token));
      const profile = {
        ...demoProfile,
        name: `${market} Fictional Pilot Hotel`,
        address: `Fictional fixture district, ${market}; not an operating hotel`,
        website: `https://${market.toLowerCase()}-fixture.example`,
        marketCenter: `${market} fixture district`,
        includedPlaces: [`${market} fixture district`],
        recipients: [`review@${market.toLowerCase()}-fixture.example`],
      };
      repo.mutate(token, { action: "profile", profile });
      for (const category of profile.categories)
        repo.mutate(token, {
          action: "coverage",
          category,
          notes: "Synthetic pilot only",
          paused: false,
        });
      const store = new SubscriptionStore(repo.db, scope),
        research = new ResearchStore(repo.db, scope);
      store.command(
        {
          action: "configure",
          entitled: true,
          active: true,
          runCredits: 1500,
          monthCredits: 10000,
        },
        repo.read(token),
        new Date(start),
      );
      const checks: { name: string; passed: boolean }[] = [];
      const cycles = sequence.map((step) => {
        const now = Date.parse(step.at);
        const command =
          step.scenario === "baseline"
            ? { action: "baseline" }
            : { action: "due" };
        store.command(command, repo.read(token), new Date(now));
        store.command(command, repo.read(token), new Date(now));
        const job = claimJob(repo.db, now);
        if (!job) throw Error("Pilot job was not claimable.");
        const deliveredBefore = store.view(profile, new Date(now)).deliveries
          .length;
        if (
          !processJob(repo.db, job, {
            now: () => now,
            provider: new FixtureProvider(step.scenario, market),
          })
        )
          throw Error("Pilot worker failed.");
        const run = research.runs()[0];
        const records = research.records();
        checks.push({
          name: `${step.scenario}: expected research outcome`,
          passed:
            run.status === step.status &&
            run.newIds.length === step.expectedNew &&
            run.changedIds.length === step.expectedChanged,
        });
        checks.push({
          name: `${step.scenario}: no duplicate canonical records`,
          passed: new Set(records.map((r) => r.key)).size === records.length,
        });
        checks.push({
          name: `${step.scenario}: safe evidence and explicit uncertainty`,
          passed: records.every(
            (r) =>
              r.finding.evidence.length > 0 &&
              r.finding.evidence.every(
                (e) =>
                  e.verification === "fictional" &&
                  e.url.startsWith("https://sources.example/"),
              ) &&
              r.finding.lastVerifiedAt === null &&
              r.assessment.unknowns.length > 0 &&
              !!r.assessment.inference,
          ),
        });
        if (step.scenario === "outage")
          checks.push({
            name: "Outage preserves accepted contractor",
            passed:
              records.find((r) => r.finding.category === "project")?.facts
                .contractor === "Juniper Works",
          });
        const previews =
          store.view(profile, new Date(now)).deliveries.length -
          deliveredBefore;
        checks.push({
          name: `${step.scenario}: meaningful-only delivery preparation`,
          passed: previews === step.expectedNew + step.expectedChanged,
        });
        return {
          fixtureScenario: step.scenario,
          at: step.at,
          cycleKey: job.cycle_key,
          status: run.status,
          newFindings: run.newIds.length,
          materialUpdates: run.changedIds.length,
          coverage: run.coverage,
          preparedDisabledPreviews: previews,
          credits: run.usage.reconciledCredits,
          heldCredits: run.usage.heldCredits,
          actualChargedUsd: 0,
        };
      });
      const findings = research.views();
      const before = JSON.stringify(research.runs());
      const csv = toCsv(findings);
      checks.push({
        name: "Export retains fixture labeling without new research",
        passed:
          csv.includes("FICTIONAL DEMO") &&
          csv.includes("sources.example") &&
          before === JSON.stringify(research.runs()),
      });
      checks.push({
        name: "Baseline plus four shared slots only",
        passed: store.view(profile).jobs.length === 5,
      });
      checks.push({
        name: "No delivery marked sent",
        passed: store
          .view(profile)
          .deliveries.every((d) => d.state === "prepared-disabled"),
      });
      return {
        market,
        hotel: profile.name,
        scope:
          "Fictional district; no real hotel or geographic coverage evaluated.",
        cycles,
        checks,
        metrics: {
          uniqueFindings: findings.length,
          duplicateRecords:
            findings.length - new Set(findings.map((f) => f.entityId)).size,
          duplicateRecordDenominator: findings.length,
          materialUpdates: cycles.reduce((n, c) => n + c.materialUpdates, 0),
          baselineCredits: cycles[0].credits,
          recurringCredits: cycles.slice(1).reduce((n, c) => n + c.credits, 0),
          actualChargedUsd: 0,
          liveEvidenceAccuracy: null,
          liveCoverage: null,
          humanReview: review[market],
        },
        findings,
        csv,
      };
    });
    const isolated = !markets[0].findings.some((a) =>
      markets[1].findings.some((b) => a.id === b.id),
    );
    return {
      schemaVersion: "synthetic-pilot-v1",
      mode: "synthetic-only",
      fixtureWindow: "2026-10-19 through 2026-10-30 (virtual clock)",
      passed: isolated && markets.every((m) => m.checks.every((c) => c.passed)),
      marketIsolation: isolated,
      markets,
      commercial: commercialSensitivity({
        monthlyResearchUsd: null,
        monthlyHostingUsd: null,
        supportMinutes: null,
        hourlyLaborUsd: null,
        onboardingMinutes: null,
        baselineResearchUsd: null,
      }),
      launchDecision: "BLOCKED — fixture success does not authorize launch.",
      pending: [
        "Verified identity, membership and SIL entitlement contracts",
        "Authorized cloud resources and isolated preview storage",
        "Approved provider, credentials, verified pricing and spend limits",
        "Real confirmed pilot hotels and human quality review",
        "Authorized Vercel responsive/browser acceptance",
        "Authorized notification provider, sender and recipients",
      ],
    };
  } finally {
    repo.close();
  }
}
