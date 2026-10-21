"use client";
import { useState } from "react";
import { scenarioNames, type Scenario } from "@/research/contracts";
import { Notice } from "./ui";
export function ResearchReplay({
  busy,
  onReplay,
}: {
  busy: boolean;
  onReplay: (scenario: Scenario, key: string) => Promise<boolean>;
}) {
  const [scenario, setScenario] = useState<Scenario>("baseline");
  const [key, setKey] = useState("");
  async function run() {
    const cycle = key || `replay-${crypto.randomUUID()}`;
    setKey(cycle);
    if (await onReplay(scenario, cycle)) setKey("");
  }
  return (
    <section className="panel coverage-editor" style={{ marginBottom: 28 }}>
      <h2>Synthetic research workbench</h2>
      <p>
        Replay bounded fictional sources through the shared engine. Findings,
        evidence, changes and usage are saved to this demo property.
      </p>
      <Notice>
        No live research, paid API calls, automatic schedules or notifications.
        This direct engine test is separate from subscription jobs and pause
        preferences. It honors confirmed places, categories and exclusions;
        distances and free-text priorities are not interpreted by this
        deterministic adapter. Once subscription controls are configured, their
        activation and credit ceilings also apply here. Queued jobs must finish
        first.
      </Notice>
      <label>
        Scenario
        <select
          value={scenario}
          disabled={busy}
          onChange={(e) => {
            setScenario(e.target.value as Scenario);
            setKey("");
          }}
        >
          {scenarioNames.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("-", " ")}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        Try baseline → update → quiet, then conflict or outage. All scenarios
        remain fictional. Budget cutoffs use artificial credits, never dollars.
      </p>
      <button
        className="button primary"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? "Replaying fixtures…" : "Run synthetic scenario"}
      </button>
      {key && (
        <p className="fine-print">
          Retry retains this operation key to prevent duplicate work: {key}
        </p>
      )}
    </section>
  );
}
