"use client";
import { useEffect, useState } from "react";
import type { PublicIdentity, BlueprintPlan } from "@/research/blueprint-plan";
type View = {
  manualResearchAllowed: boolean;
  approvedPlans: {
    id: string;
    mode: string;
    max_calls: number;
    run_cap_micros: number;
  }[];
  configurationHash: string;
  accountName: string;
  identities: Record<string, PublicIdentity>;
  identityProposal: PublicIdentity | null;
  competitors: {
    id: string;
    name: string;
    address: string;
    domain: string;
    proposal: PublicIdentity | null;
  }[];
  baselineCount: number;
  baselineStatus: string;
  plan: BlueprintPlan;
  planHash: string;
  accountedMicros: number;
  fullPlanMaximumMicros: number;
  coverage: {
    category: string;
    subjectId: string;
    focus: string;
    outcome: string;
    lastCheckedAt: string | null;
    lastSuccessAt: string | null;
    gaps: string[];
    sources: { url: string; title: string }[];
  }[];
  jobs: {
    id: string;
    state: string;
    mode: string;
    reviewId: string | null;
    brief: {
      title: string;
      proposed: {
        title: string;
        fact: string;
        inference: string;
        nextStep: string;
        unknowns: string[];
        sources: string[];
      }[];
      gaps: string[];
      existingContext: {
        id: string;
        title: string;
        summary: string;
        sources: string[];
      }[];
    } | null;
  }[];
  message: string;
};
export function CustomerBlueprint({
  identityOnly = false,
}: {
  identityOnly?: boolean;
}) {
  const [view, setView] = useState<View | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/customer/blueprint", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error ?? "Coverage unavailable.");
        if (active) setView(data);
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function confirm(subjectId: string, form: HTMLFormElement) {
    if (!view) return;
    setBusy(true);
    setMessage("");
    try {
      const f = new FormData(form);
      const identity = {
        name: String(f.get("name")),
        address: String(f.get("address")),
        website: String(f.get("website")),
        sourceUrl: String(f.get("sourceUrl")),
      };
      const r = await fetch("/api/customer/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm-identity",
          subjectId,
          identity,
          configurationHash: view.configurationHash,
          confirmed: true,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error ?? "Could not confirm identity.");
      setView(data);
      setMessage(
        "Public research identity confirmed. Account name and saved profile are unchanged. No research started.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Confirmation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function dispatch(input: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      let next: View;
      do {
        const r = await fetch("/api/customer/blueprint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        next = await r.json();
        if (!r.ok)
          throw Error(
            (next as unknown as { error: string }).error ??
              "Research could not continue.",
          );
        setView(next);
        const job = next.jobs.find((j) => j.state === "running");
        if (!job) break;
        input = { action: "advance", jobId: job.id };
      } while (true);
      setMessage(
        "Research stopped. Review coverage and private results below; nothing was automatically published.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Research stopped.");
    } finally {
      setBusy(false);
    }
  }
  if (!view)
    return <p role="status">{message || "Loading market coverage…"}</p>;
  if (identityOnly)
    return (
      <section
        className="expansion-panel"
        aria-label="Public research identities"
      >
        <h2>Which hotels should SCOUT research?</h2>
        <p>
          Your account remains <strong>{view.accountName}</strong>. Public hotel
          identities are separate and require your confirmation. Saving profile
          details again requires these identities to be reviewed again.
        </p>
        {[
          {
            id: "own",
            name: "Your hotel's public identity",
            address: "",
            domain: "",
            proposal: null,
          },
          ...view.competitors,
        ].map((h) => {
          const confirmed = view.identities[h.id],
            suggested =
              confirmed ??
              (h.id === "own" ? view.identityProposal : h.proposal);
          return (
            <details key={h.id} open={h.id === "own" && !confirmed}>
              <summary>
                {h.name} — {confirmed ? "confirmed" : "confirmation needed"}
              </summary>
              {h.id === "own" && view.identityProposal && !confirmed && (
                <p>
                  The official Hilton page lists{" "}
                  <strong>{view.identityProposal.name}</strong> at{" "}
                  <strong>{view.identityProposal.address}</strong>, matching the
                  saved street address. Is this your public property?{" "}
                  <a
                    href={view.identityProposal.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Review the official property page
                  </a>
                  . Confirm only if correct; the account will not be renamed.
                </p>
              )}
              <form
                className="customer-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void confirm(h.id, e.currentTarget);
                }}
              >
                <label>
                  Public hotel name
                  <input
                    name="name"
                    required
                    maxLength={200}
                    defaultValue={
                      suggested?.name ?? (h.id === "own" ? "" : h.name)
                    }
                  />
                </label>
                <label>
                  Verified full address
                  <input
                    name="address"
                    required
                    maxLength={500}
                    defaultValue={suggested?.address ?? h.address}
                  />
                </label>
                <label>
                  Official property website
                  <input
                    name="website"
                    type="url"
                    required
                    defaultValue={suggested?.website ?? ""}
                    placeholder="https://…/specific-hotel/"
                  />
                </label>
                <label>
                  Source confirming this identity and address
                  <input
                    name="sourceUrl"
                    type="url"
                    required
                    defaultValue={suggested?.sourceUrl ?? ""}
                  />
                </label>
                <p className="fine-print">
                  Use the individual hotel's page, not a brand homepage. This
                  confirmation does not approve new source domains or spending.
                </p>
                <button className="button secondary" disabled={busy}>
                  Confirm this public identity
                </button>
              </form>
            </details>
          );
        })}
        <p role="status">{message}</p>
      </section>
    );
  return (
    <section className="expansion-panel" aria-label="Market blueprint coverage">
      <p className="eyebrow">Market foundation</p>
      <h2>Build the market picture first</h2>
      <p>
        <strong>{view.baselineCount} reviewed demand-generator records.</strong>{" "}
        Baseline coverage is incomplete. Existing events and projects remain
        available; they do not establish a complete employer baseline.
      </p>
      <p>
        Baseline research establishes local employers, facilities and demand
        generators. Later updates maintain those records and identify meaningful
        changes. Briefings compile saved evidence and explicitly show gaps.
      </p>
      <details>
        <summary>Research coverage and remaining gaps</summary>
        {view.coverage.map((c) => (
          <article key={c.subjectId}>
            <h3>{c.focus}</h3>
            <p>
              {c.outcome} · Last checked: {c.lastCheckedAt ?? "Not checked"} ·
              Last useful result: {c.lastSuccessAt ?? "None yet"}
            </p>
            <ul>
              {c.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
            {c.sources.map((s) => (
              <p key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
              </p>
            ))}
          </article>
        ))}
      </details>
      {view.manualResearchAllowed && (
        <>
          {view.approvedPlans.map((a) => (
            <button
              key={a.id}
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void dispatch({
                  action: "start",
                  mode: a.mode,
                  approvalId: a.id,
                  requestKey: crypto.randomUUID(),
                })
              }
            >
              Run approved {a.mode} sample � up to {a.max_calls} calls / $
              {(a.run_cap_micros / 1000000).toFixed(3)}
            </button>
          ))}
          {view.jobs
            .filter((j) => j.state === "running")
            .map((j) => (
              <button
                key={j.id}
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void dispatch({ action: "advance", jobId: j.id })
                }
              >
                Continue approved research
              </button>
            ))}
        </>
      )}
      <p role="status">{message}</p>
      <p className="fine-print">
        {view.message} Schedules and notifications remain off.
      </p>
      {view.jobs.map((j) => (
        <details key={j.id}>
          <summary>
            {j.mode} research — {j.state} · private review
          </summary>
          {j.brief && (
            <>
              <h3>{j.brief.title}</h3>
              {j.brief.proposed.map((p, i) => (
                <article key={i}>
                  <h4>{p.title}</h4>
                  <p>{p.fact}</p>
                  <p>
                    <strong>Hotel-demand inference:</strong> {p.inference}
                  </p>
                  <p>
                    <strong>Suggested next step:</strong> {p.nextStep}
                  </p>
                  <ul>
                    {p.unknowns.map((u, n) => (
                      <li key={n}>{u}</li>
                    ))}
                  </ul>
                  {p.sources.map((s) => (
                    <p key={s}>
                      <a href={s} target="_blank" rel="noreferrer">
                        {new URL(s).hostname}
                      </a>
                    </p>
                  ))}
                </article>
              ))}
              <p>
                Publication requires source and relevance review. Review
                reference: {j.reviewId ?? "No usable findings"}.
              </p>
            </>
          )}
        </details>
      ))}
    </section>
  );
}
