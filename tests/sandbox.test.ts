import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSandbox } from "../src/server/sandbox";
import type {
  SandboxCommand,
  SandboxState,
} from "../src/lib/sandbox-contracts";

const step = (state: SandboxState, command: SandboxCommand) =>
  evaluateSandbox({ journal: state.journal, command });
test("sandbox uses fresh isolated scopes and reconstructs only validated browser history", () => {
  const original = evaluateSandbox({ journal: null });
  assert.equal(original.workspace.findings.length, 9);
  const changed = step(original, {
    kind: "mutation",
    input: {
      action: "state",
      findingId: original.workspace.findings[0].id,
      saved: true,
      dismissed: true,
    },
  });
  assert.equal(changed.workspace.findings[0].saved, true);
  assert.deepEqual(
    evaluateSandbox({ journal: changed.journal }).workspace,
    changed.workspace,
  );
  const other = evaluateSandbox({ journal: null });
  assert.equal(other.workspace.findings[0].saved, false);
  assert.equal(other.workspace.findings[0].dismissed, false);
  assert.ok(!JSON.stringify(changed).includes('"tenant_id"'));
  assert.ok(!JSON.stringify(changed).includes('"token_hash"'));
  assert.throws(() => evaluateSandbox({ journal: null, tenant_id: "other" }));
  assert.throws(() =>
    evaluateSandbox({
      journal: null,
      command: {
        kind: "mutation",
        input: {
          action: "state",
          findingId: "foreign-record",
          saved: true,
          dismissed: false,
        },
      },
    }),
  );
});
test("hosted synthetic jobs complete, stay idempotent and retain state through subsequent changes", () => {
  let state = evaluateSandbox({ journal: null });
  state = step(state, {
    kind: "subscription",
    input: {
      action: "configure",
      active: true,
      entitled: true,
      runCredits: 1500,
      monthCredits: 10000,
    },
  });
  state = step(state, {
    kind: "mutation",
    input: {
      action: "profile",
      profile: {
        ...state.workspace.profile,
        recipients: ["fixture@example.com"],
      },
    },
  });
  state = step(state, { kind: "subscription", input: { action: "baseline" } });
  assert.equal(state.subscription.jobs[0].state, "queued");
  state = step(state, { kind: "worker" });
  assert.equal(state.subscription.jobs[0].state, "done");
  assert.equal(state.workspace.findings.length, 12);
  assert.equal(state.subscription.deliveries.length, 3);
  state = step(state, { kind: "subscription", input: { action: "baseline" } });
  assert.equal(state.subscription.jobs.length, 1);
  const id = state.workspace.findings[0].id;
  state = step(state, {
    kind: "mutation",
    input: { action: "state", findingId: id, saved: true, dismissed: false },
  });
  state = step(state, {
    kind: "subscription",
    input: { action: "enqueue", scenario: "update", key: "hosted-update" },
  });
  state = step(state, { kind: "worker" });
  assert.equal(state.workspace.runs[0].changedIds.length, 3);
  assert.equal(state.workspace.findings.find((f) => f.id === id)!.saved, true);
  state = step(state, {
    kind: "subscription",
    input: { action: "enqueue", scenario: "quiet", key: "hosted-quiet" },
  });
  state = step(state, { kind: "worker" });
  assert.equal(state.workspace.runs[0].changedIds.length, 0);
  assert.equal(state.subscription.deliveries.length, 6);
  state = step(state, {
    kind: "subscription",
    input: {
      action: "configure",
      active: false,
      entitled: false,
      runCredits: 1500,
      monthCredits: 10000,
    },
  });
  assert.throws(() =>
    step(state, {
      kind: "subscription",
      input: {
        action: "enqueue",
        scenario: "update",
        key: "blocked-after-pause",
      },
    }),
  );
  assert.ok(
    state.subscription.deliveries.every((d) => d.state === "suppressed"),
  );
  assert.equal(state.subscription.usage.actualChargedUsd, 0);
});
test("sandbox rejects provider overrides, identity, expired histories and excessive work", () => {
  const state = evaluateSandbox({ journal: null });
  assert.throws(() =>
    evaluateSandbox({
      journal: state.journal,
      command: {
        kind: "research",
        input: {
          scenario: "baseline",
          cycleKey: "scope-override",
          provider: "live",
        },
      },
    }),
  );
  assert.throws(
    () =>
      evaluateSandbox({
        journal: { ...state.journal, createdAt: "2000-01-01T00:00:00Z" },
      }),
    /expired/,
  );
  assert.throws(
    () =>
      evaluateSandbox({
        journal: {
          ...state.journal,
          events: Array.from({ length: 13 }, () => ({
            at: state.journal.createdAt,
            command: { kind: "worker" },
          })),
        },
      }),
    /limit/,
  );
  assert.throws(() =>
    evaluateSandbox({
      journal: {
        ...state.journal,
        events: Array.from({ length: 129 }, () => ({
          at: state.journal.createdAt,
          command: { kind: "worker" },
        })),
      },
    }),
  );
  assert.throws(
    () =>
      evaluateSandbox({
        journal: {
          ...state.journal,
          events: [{ at: "2100-01-01T00:00:00Z", command: { kind: "worker" } }],
        },
      }),
    /Invalid demo history/,
  );
});
test("direct hosted fixture research preserves timestamps on replay and cannot enable live activity", () => {
  let state = evaluateSandbox({ journal: null });
  state = step(state, {
    kind: "research",
    input: { scenario: "baseline", cycleKey: "hosted-baseline" },
  });
  const again = evaluateSandbox({ journal: state.journal });
  assert.deepEqual(again.workspace, state.workspace);
  assert.equal(state.workspace.runs[0].usage!.actualChargedUsd, 0);
  assert.equal(evaluateSandbox({ journal: null }).workspace.findings.length, 9);
});
