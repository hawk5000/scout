"use client";
import { useEffect, useState } from "react";
import type {
  SubscriptionCommand,
  SubscriptionView,
} from "@/research/subscription-contracts";
import { Notice } from "./ui";

export function SubscriptionControls() {
  const [data, setData] = useState<SubscriptionView | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [runCredits, setRunCredits] = useState(1500),
    [monthCredits, setMonthCredits] = useState(10000);
  async function request(command?: SubscriptionCommand) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/demo/subscription",
        command
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(command),
            }
          : { cache: "no-store" },
      );
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setData(result);
      setRunCredits(result.controls.runCredits);
      setMonthCredits(result.controls.monthCredits);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load fixture controls.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void request();
  }, []);
  const configure = (entitled: boolean, active: boolean) =>
    request({
      action: "configure",
      entitled,
      active,
      runCredits,
      monthCredits,
    });
  return (
    <section
      className="panel coverage-editor"
      style={{ marginBottom: 28 }}
      aria-busy={busy}
    >
      <span className="eyebrow">LOCAL FIXTURE LAB · DELIVERY DISABLED</span>
      <h2>Subscription & delivery rehearsal</h2>
      <p>
        Queue one initial blueprint, then shared updates across all three
        scouts. Jobs persist until the separate local worker runs.
      </p>
      <Notice>
        Fictional entitlement only. No SIL connection, live schedule, paid calls
        or messages. To process queued fixtures, run{" "}
        <code>npm run worker:fixtures</code> in the project folder, then refresh
        below. The worker stops after at most 20 attempts.
      </Notice>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>
            <strong>
              {data.controls.active
                ? "Fixture subscription active"
                : "Fixture subscription paused"}
            </strong>{" "}
            ·{" "}
            {data.controls.entitled
              ? "Fictional entitlement enabled"
              : "Fictional entitlement disabled"}
          </p>
          <div className="form-grid">
            <label>
              Per-job artificial credit ceiling
              <input
                type="number"
                min="0"
                max="1500"
                value={runCredits}
                onChange={(e) => setRunCredits(Number(e.target.value))}
              />
            </label>
            <label>
              Property-month artificial credit ceiling
              <input
                type="number"
                min="0"
                max="10000"
                value={monthCredits}
                onChange={(e) => setMonthCredits(Number(e.target.value))}
              />
            </label>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBlock: 20,
            }}
          >
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void configure(true, true)}
            >
              Activate fictional subscription
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void configure(data.controls.entitled, false)}
            >
              Pause
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void configure(false, false)}
            >
              Revoke fictional entitlement
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void configure(data.controls.entitled, data.controls.active)
              }
            >
              Save credit ceilings
            </button>
          </div>
          <p>
            {data.month}: {data.usage.reconciledCredits} reconciled credits ·{" "}
            {data.usage.heldCredits} held · actual charged USD $0. Credits are
            test units, not provider prices.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBlock: 20,
            }}
          >
            <button
              className="button"
              disabled={busy || !data.controls.active}
              onClick={() => void request({ action: "baseline" })}
            >
              Queue initial blueprint
            </button>
            <button
              className="button"
              disabled={busy || !data.controls.active}
              onClick={() => void request({ action: "due" })}
            >
              Queue today’s due fixture slot
            </button>
            <button
              className="button"
              disabled={busy || !data.controls.active}
              onClick={() =>
                void request({
                  action: "enqueue",
                  scenario: "update",
                  key: `update-${crypto.randomUUID()}`,
                })
              }
            >
              Queue synthetic update
            </button>
            <button
              className="button"
              disabled={busy || !data.controls.active}
              onClick={() =>
                void request({
                  action: "enqueue",
                  scenario: "quiet",
                  key: `quiet-${crypto.randomUUID()}`,
                })
              }
            >
              Queue quiet check
            </button>
          </div>
          <p className="muted">
            Due slots use the two Hotel Profile days, time and timezone.
            Checking a slot is explicit; no recurring scheduler is installed.
            Add recipients in Hotel Profile to preview delivery preparation.
            Nothing is sent.
          </p>
          <h3>Durable job history</h3>
          {!data.jobs.length && <p>No fixture jobs queued.</p>}
          {data.jobs.map((j) => (
            <div className="quiet-note" key={j.cycle_key}>
              <strong>
                {j.scenario} · {j.state}
              </strong>
              <p>{j.cycle_key}</p>
              <small>
                {j.checkpoint} · {j.attempts}/3 worker attempts
              </small>
              {j.result && (
                <p>
                  <strong>{j.result}</strong> � {j.summary}
                </p>
              )}
              {j.error && <p role="status">{j.error}</p>}
            </div>
          ))}
          <h3>Delivery previews · never sent</h3>
          {!data.deliveries.length && (
            <p>
              No delivery previews. Quiet cycles create none; recipients must be
              configured before preparation.
            </p>
          )}
          {data.deliveries.map((d) => (
            <div
              className="quiet-note"
              key={`${d.recipient}:${d.finding_id}:${d.version_id}`}
            >
              <strong>
                {d.state} · {d.recipient}
              </strong>
              <p>{d.preview}</p>
            </div>
          ))}
        </>
      )}
      <button className="button" disabled={busy} onClick={() => void request()}>
        Refresh job & delivery status
      </button>
      <p className="fine-print">
        Refresh the page after worker completion to load new blueprint findings
        and run history. The most recent 50 jobs and delivery previews are
        shown.
      </p>
    </section>
  );
}
