import { categories, type Profile } from "../lib/contracts";
import {
  candidateSchema,
  policy,
  usageSchema,
  type Scenario,
  type SyntheticRun,
} from "./contracts";
import {
  createProvider,
  InterruptedFixtureError,
  RetryableFixtureError,
  type SyntheticProvider,
} from "./provider";
import { FixtureRetriever, digest } from "./retrieval";
import {
  identity,
  markUncertainty,
  mergeGroup,
  monthInTimezone,
  validateEvidence,
  type Supported,
} from "./merge";
import { playbooks, withinScope } from "./playbooks";
import { ResearchStore } from "./store";

export function initialRun(
  scenario: Scenario,
  cycleKey: string,
  at: string,
): SyntheticRun {
  return {
    id: `synthetic-run-${digest(cycleKey)}`,
    type: scenario === "baseline" ? "baseline" : "update",
    cycleKey,
    scenario,
    engine: "synthetic-v1",
    status: "Needs attention",
    at,
    newIds: [],
    changedIds: [],
    warnings: [
      "Synthetic replay only. No network requests, paid calls or notifications.",
    ],
    categories: [...categories],
    summary: "Synthetic run started.",
    checkpoint: "created",
    simulated: true,
    actualCostUsd: null,
    counts: { accepted: 0, rejected: 0, sources: 0, attempts: 0 },
    coverage: {
      corporate: "Not checked",
      project: "Not checked",
      event: "Not checked",
    },
    usage: {
      rateCard: "synthetic-credits-v1",
      provider: "fixture",
      model: "recorded-structured-output-v1",
      actualChargedUsd: 0,
      estimatedCredits: 0,
      reconciledCredits: 0,
      heldCredits: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      searchCalls: 0,
      toolCalls: 0,
    },
  };
}
export function replay(
  store: ResearchStore,
  profile: Profile,
  scenario: Scenario,
  cycleKey: string,
  options: { provider?: SyntheticProvider; now?: Date } = {},
) {
  if (!profile.confirmed)
    throw Error("Confirm the demo profile before fixture replay.");
  const provider = options.provider ?? createProvider("synthetic", scenario);
  if (provider.mode !== "synthetic") throw Error("Live research is disabled.");
  const now = options.now ?? new Date();
  const at = now.toISOString();
  const started = performance.now();
  const run = initialRun(scenario, cycleKey, at);
  const cached = store.begin(run);
  if (cached) return cached;
  const records = store.records();
  const groups = new Map<string, Supported[]>();
  const retriever = new FixtureRetriever(provider.registry);
  let failures = 0;
  let tokens = 0;
  let stop = false;
  const month = monthInTimezone(now, profile);
  const warn = (message: string) => {
    if (!run.warnings.includes(message)) run.warnings.push(message);
  };
  for (const scout of categories) {
    if (!profile.categories.includes(scout)) {
      run.coverage[scout] = "Excluded by profile";
      continue;
    }
    if (stop) {
      run.coverage[scout] = "Not checked: run stopped";
      continue;
    }
    let complete = false;
    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      const operation = `${scout}:${attempt}`;
      try {
        if (
          performance.now() - started > policy.maxRuntimeMs ||
          run.counts.attempts >= policy.maxAttempts ||
          tokens + 7000 > policy.maxTokens
        )
          throw Error("Run runtime, attempt or token ceiling reached.");
        store.reserve(
          cycleKey,
          operation,
          scout,
          month,
          policy.perAttemptCredits,
          {
            run: scenario === "budget-cutoff" ? 330 : policy.perRunCredits,
            month: policy.monthlyCredits,
          },
        );
        run.counts.attempts++;
        run.checkpoint = `reserved:${operation}`;
        store.checkpoint(run);
        const raw = provider.research(scout, attempt);
        // Usage is validated/reconciled independently even when candidates are rejected.
        if (!raw || typeof raw !== "object" || !("usage" in raw))
          throw Error("Provider usage missing; reservation retained.");
        const usage = usageSchema.parse(raw.usage);
        store.reconcile(cycleKey, operation, usage);
        tokens +=
          usage.inputTokens + usage.outputTokens + usage.reasoningTokens;
        if (performance.now() - started > policy.maxRuntimeMs)
          throw Error("Provider runtime ceiling reached.");
        if (
          !("candidates" in raw) ||
          !Array.isArray(raw.candidates) ||
          raw.candidates.length > 12 ||
          Object.keys(raw).some((k) => !["usage", "candidates"].includes(k))
        )
          throw Error("Invalid provider envelope.");
        let sourceFailure = false;
        for (const value of raw.candidates) {
          if (run.counts.accepted + run.counts.rejected >= policy.maxCandidates)
            throw Error("Candidate ceiling reached.");
          const parsed = candidateSchema.safeParse(value);
          if (!parsed.success) {
            run.counts.rejected++;
            sourceFailure = true;
            warn(`${scout}: rejected invalid candidate structure.`);
            continue;
          }
          const c = parsed.data;
          if (!withinScope(c, profile, scout)) {
            warn(
              `${scout}: candidate excluded by playbook or confirmed place/exclusion rules.`,
            );
            continue;
          }
          try {
            const supported = validateEvidence(c, retriever, at);
            const key = identity(c).key;
            groups.set(key, [...(groups.get(key) ?? []), supported]);
            run.counts.accepted++;
          } catch {
            sourceFailure = true;
            run.counts.rejected++;
            warn(
              `${scout}: source unavailable, unsafe, over limits or missing claim support.`,
            );
            const existing = records.find((r) => r.key === identity(c).key);
            if (existing)
              markUncertainty(
                existing,
                "Latest source check failed; previously accepted facts were retained.",
              );
            if (existing) existing.finding.lastCheckedAt = at;
          }
        }
        if (sourceFailure) failures++;
        run.coverage[scout] = sourceFailure
          ? "Partial: rejected candidate or evidence"
          : `Completed · ${playbooks[scout].version}`;
        complete = true;
        break;
      } catch (error) {
        if (error instanceof RetryableFixtureError) {
          store.reconcile(cycleKey, operation, {
            inputTokens: 0,
            cachedInputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            searchCalls: 1,
            toolCalls: 0,
          });
          warn(
            `${scout}: synthetic transient failure; bounded retry accounted for.`,
          );
          if (attempt < policy.maxRetries) continue;
        }
        failures++;
        run.coverage[scout] = "Needs attention";
        if (error instanceof InterruptedFixtureError) {
          warn(
            "Synthetic interruption: unknown usage remains reserved; no automatic release.",
          );
          stop = true;
        } else
          warn(
            `${scout}: bounded run stopped or invalid provider response; review coverage and held credits.`,
          );
        break;
      } finally {
        run.counts.sources = retriever.calls;
        run.checkpoint = `checked:${operation}`;
        store.checkpoint(run);
      }
    }
    if (!complete && run.coverage[scout] === "Not checked")
      run.coverage[scout] = "Needs attention";
  }
  for (const [key, group] of groups) {
    const index = records.findIndex((r) => r.key === key);
    const previous = index < 0 ? undefined : records[index];
    try {
      const merged = mergeGroup(group, previous, at);
      if (merged.conflict) {
        failures++;
        warn(
          "Conflicting evidence retained for review; accepted facts were not replaced.",
        );
        run.coverage[merged.record.finding.category] =
          "Partial: conflicting evidence";
      }
      if (index < 0) records.push(merged.record);
      else records[index] = merged.record;
      if (merged.changed)
        (previous ? run.changedIds : run.newIds).push(merged.record.finding.id);
    } catch {
      failures++;
      warn("Conflicting initial facts withheld for review.");
      (run.reviewItems ??= []).push({
        label: group[0].candidate.name,
        reason:
          "Conflicting initial facts withheld; no finding or change published.",
        sourceUrls: [
          ...new Set(group.flatMap((g) => g.evidence.map((e) => e.url))),
        ],
      });
      run.coverage[group[0].candidate.kind] =
        "Partial: conflicting initial evidence";
    }
  }
  for (const record of records) {
    if (
      !groups.has(record.key) &&
      record.finding.quality === "Sample evidence" &&
      now.getTime() - Date.parse(record.finding.lastCheckedAt) >
        policy.staleDays * 86400000
    )
      record.finding.quality = "Stale";
  }
  run.status = failures
    ? run.counts.accepted
      ? "Partial"
      : "Needs attention"
    : "Completed";
  run.summary = failures
    ? "Synthetic cycle incomplete. Last accepted data preserved."
    : run.newIds.length || run.changedIds.length
      ? `${run.newIds.length} new synthetic findings; ${run.changedIds.length} meaningful changes.`
      : "No meaningful changes found.";
  run.checkpoint = failures ? "finished-with-gaps" : "finished";
  store.finish(run, records);
  return run;
}
