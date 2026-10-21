"use client";
import { useEffect, useMemo, useState } from "react";
import type { CustomerWorkspace } from "@/customer/contracts";
import type { Category } from "@/lib/contracts";
import {
  customerBrief,
  selectCustomerFindings,
} from "@/customer/market-export";
import { DateText } from "./ui";
export function CustomerMarket({
  workspace,
  onChange,
  updatesOnly = false,
}: {
  workspace: CustomerWorkspace;
  onChange: (w: CustomerWorkspace) => void;
  updatesOnly?: boolean;
}) {
  const hotelName = workspace.profile?.name || workspace.propertyName;
  const categoryLabels: Record<Category, string> = {
    corporate: "Companies",
    project: "Projects",
    event: "Events",
  };
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("visible");
  const [order, setOrder] = useState("changed");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (detail) {
      const panel = document.getElementById("customer-finding-detail");
      panel?.focus();
      panel?.scrollIntoView({ block: "start" });
    }
  }, [detail]);
  const params = new URLSearchParams({
    q: query,
    state: view,
    category,
  });
  const list = useMemo(
    () =>
      selectCustomerFindings(
        workspace.findings,
        new URLSearchParams({
          q: query,
          state: view,
          category,
        }),
      ).sort((a, b) => {
        const x =
          order === "date"
            ? a.facts.start
            : a.versions.length > 1
              ? a.versions.at(-1)!.at
              : null;
        const y =
          order === "date"
            ? b.facts.start
            : b.versions.length > 1
              ? b.versions.at(-1)!.at
              : null;
        return !x && y
          ? 1
          : x && !y
            ? -1
            : x && y
              ? order === "date"
                ? x.localeCompare(y)
                : y.localeCompare(x)
              : a.title.localeCompare(b.title);
      }),
    [workspace, query, view, category, order],
  );
  const shownSelected = selected.filter((id) => list.some((f) => f.id === id));
  if (shownSelected.length) params.set("ids", shownSelected.join(","));
  const current = workspace.findings.find((f) => f.id === detail);
  const runs = workspace.runs;
  async function downloadCsv(url: string) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok)
        throw Error((await response.json()).error || "Export unavailable.");
      const blob = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blob;
      link.download = "scout-findings.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(blob), 1000);
      setMessage(
        workspace.marketMode === "synthetic"
          ? "CSV downloaded. Fictional examples are labeled in every row."
          : "CSV downloaded. Ready to use in your sales tools.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    }
  }
  async function state(id: string, saved: boolean, dismissed: boolean) {
    const f = workspace.findings.find((f) => f.id === id)!;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/customer/findings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingId: id,
          revision: f.stateRevision,
          saved,
          dismissed,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      onChange(data);
      setMessage("Finding updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!workspace.findings.length && !runs.length)
    return (
      <div className="empty-state">
        <h2>
          {updatesOnly
            ? "No updates yet."
            : `No findings added for ${hotelName} yet.`}
        </h2>
        <p>
          {updatesOnly
            ? "New findings and important changes will appear here after they are reviewed and added."
            : "Once findings are reviewed and added, you can explore the details, check the sources and save the ones that matter to your hotel."}
        </p>
      </div>
    );
  return (
    <>
      {workspace.marketMode === "synthetic" && (
        <div className="notice">
          Demo findings - fictional examples only. All findings and sources in
          this test workspace are synthetic.
        </div>
      )}
      {workspace.marketMode === "reviewed" && (
        <p className="notice">
          These findings were reviewed before being added. SCOUT has not
          independently verified the sources; check the evidence and open
          questions before acting.
        </p>
      )}
      <p role="status">{message}</p>
      {updatesOnly ? (
        <div className="run-history">
          {[...runs].reverse().map((r) => (
            <article key={r.batchKey} className="panel detail-section">
              <h2>
                <DateText value={r.at} />
              </h2>
              <p>
                {r.status !== "Completed"
                  ? "Update incomplete"
                  : r.newIds.length || r.changedIds.length
                    ? "Findings added or changed"
                    : "No significant changes"}{" "}
                · {r.newIds.length} new · {r.changedIds.length} changed
              </p>
              {[...r.newIds, ...r.changedIds].map((id) => {
                const f = workspace.findings.find((f) => f.id === id);
                return f ? (
                  <div key={id}>
                    <button
                      className="text-button"
                      onClick={() => {
                        setDetail(id);
                        setMessage("");
                      }}
                    >
                      {f.title}
                    </button>
                    <p>
                      {
                        [...f.versions].reverse().find((v) => v.at <= r.at)
                          ?.summary
                      }
                    </p>
                  </div>
                ) : null;
              })}
              {r.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="filter-bar customer-filters">
            <label className="search-field">
              Search findings
              <input
                value={query}
                maxLength={200}
                placeholder="Search a company, place or topic"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              Type
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSelected([]);
                }}
              >
                <option value="all">All types</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Show
              <select value={view} onChange={(e) => setView(e.target.value)}>
                <option value="visible">Current findings</option>
                <option value="all">Including dismissed</option>
                <option value="saved">Saved</option>
                <option value="updated">Changed findings</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </label>
            <label>
              Sort by
              <select value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="changed">Most recent change</option>
                <option value="date">Relevant date</option>
              </select>
            </label>
          </div>
          <div className="results-bar">
            <span>
              {list.length} findings · {shownSelected.length} selected
            </span>
            {list.length > 0 && (
              <a
                className="button secondary"
                href={`/api/customer/findings?${params}`}
                onClick={(e) => {
                  e.preventDefault();
                  void downloadCsv(`/api/customer/findings?${params}`);
                }}
              >
                {shownSelected.length
                  ? "Export selected CSV"
                  : "Export results CSV"}
              </a>
            )}
          </div>
          <p className="fine-print">
            Select findings to export a shortlist, or export all results shown.
          </p>
          {list.map((f) => (
            <article
              className={`panel detail-section customer-finding-card finding-accent-${f.categories[0]}`}
              key={f.id}
            >
              <label className="check-label">
                <input
                  type="checkbox"
                  aria-label={`Select ${f.title}`}
                  checked={shownSelected.includes(f.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, f.id]
                        : selected.filter((id) => id !== f.id),
                    )
                  }
                />
                <strong>{f.title}</strong>
              </label>
              <p>
                {f.categories.map((c) => categoryLabels[c]).join(" / ")} ·{" "}
                {f.location} · {f.facts.status}
              </p>
              <p className="finding-summary">{f.summary}</p>
              <p className="customer-finding-relevance">
                <strong>Why it may matter to {hotelName}:</strong>{" "}
                {f.assessment.inference ||
                  "Potential hotel business has not been assessed."}
              </p>
              <p>
                <DateText value={f.facts.start} /> /{" "}
                {f.quality === "Conflicting evidence"
                  ? "Sources disagree"
                  : "Sources provided"}
                {f.saved ? " · Saved" : ""}
                {f.dismissed ? " · Dismissed" : ""}
              </p>
              <button className="button small" onClick={() => setDetail(f.id)}>
                View finding
              </button>
            </article>
          ))}
          {!list.length && <p>No findings match these filters.</p>}
        </>
      )}
      {current && (
        <section
          className="panel detail-section customer-finding-detail"
          id="customer-finding-detail"
          tabIndex={-1}
          aria-label={`Finding details: ${current.title}`}
        >
          <button className="text-button" onClick={() => setDetail(null)}>
            Close details
          </button>
          <h2>{current.title}</h2>
          <div className="finding-actions">
            <button
              className="button small"
              disabled={busy || workspace.role === "viewer"}
              onClick={() =>
                void state(current.id, !current.saved, current.dismissed)
              }
            >
              {current.saved ? "Unsave" : "Save"}
            </button>
            <button
              className="button small"
              disabled={busy || workspace.role === "viewer"}
              onClick={() =>
                void state(current.id, current.saved, !current.dismissed)
              }
            >
              {current.dismissed ? "Restore" : "Dismiss"}
            </button>
            <button
              className="button small"
              onClick={() =>
                void navigator.clipboard.writeText(customerBrief(current)).then(
                  () => setMessage("Finding brief copied."),
                  () => setMessage("Clipboard unavailable. Use CSV export."),
                )
              }
            >
              Copy
            </button>
            <a
              className="button small"
              href={`/api/customer/findings?state=all&ids=${current.id}`}
              onClick={(e) => {
                e.preventDefault();
                void downloadCsv(
                  `/api/customer/findings?state=all&ids=${current.id}`,
                );
              }}
            >
              Export CSV
            </a>
          </div>
          <h3>What happened</h3>
          <p>{current.summary}</p>
          <h3>Why it may matter to {hotelName}</h3>
          <p className="fine-print">
            An assessment of possible hotel business, not confirmed demand.
          </p>
          <p>
            {current.assessment.inference ||
              "Potential hotel business has not been assessed."}
          </p>
          <p>{current.assessment.rationale}</p>
          <h3>What still needs checking</h3>
          <ul>
            {current.assessment.unknowns.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <h3>Relevant dates</h3>
          <p>
            <DateText value={current.facts.start} /> to{" "}
            <DateText value={current.facts.end} />
          </p>
          <h3>Sources</h3>
          {current.evidence.map((e) => (
            <div key={e.id}>
              <a href={e.url} target="_blank" rel="noreferrer">
                {e.publisher}
              </a>
              <p>
                Published <DateText value={e.publishedAt} /> · Collected{" "}
                <DateText value={e.retrievedAt} />
              </p>
              <ul>
                {e.claims.map((c, i) => (
                  <li key={i}>
                    {c.field}: {c.quote}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <details>
            <summary>Changes over time</summary>
            {current.versions.map((v, i) => (
              <p key={i}>
                <DateText value={v.at} /> · {v.summary}
              </p>
            ))}
          </details>
        </section>
      )}
    </>
  );
}
