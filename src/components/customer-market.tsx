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
  category,
  updatesOnly = false,
}: {
  workspace: CustomerWorkspace;
  onChange: (w: CustomerWorkspace) => void;
  category?: Category;
  updatesOnly?: boolean;
}) {
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
    category: category ?? "all",
  });
  const list = useMemo(
    () =>
      selectCustomerFindings(
        workspace.findings,
        new URLSearchParams({
          q: query,
          state: view,
          category: category ?? "all",
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
  const runs = workspace.runs.filter(
    (r) => !category || r.categories.includes(category),
  );
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
      setMessage("CSV downloaded. Fictional imports are labeled in every row.");
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
      setMessage("Finding preference saved.");
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
            ? "No imported updates yet."
            : "No researched findings yet."}
        </h2>
        <p>
          No findings have been ingested for this hotel. Research and scheduled
          updates remain disabled.
        </p>
        {category && (
          <p>
            {workspace.coverage[category] ||
              "Coverage instructions have not been added."}
          </p>
        )}
      </div>
    );
  return (
    <>
      {workspace.marketMode === "synthetic" && (
        <div className="notice">
          Isolated synthetic test workspace. All findings and sources are
          fictional. No research or sending occurs.
        </div>
      )}
      {workspace.marketMode === "reviewed" && (
        <p className="notice">
          Reviewed imports. SCOUT has not independently verified these sources
          or started live research.
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
                  ? "Incomplete coverage"
                  : r.newIds.length || r.changedIds.length
                    ? "Imported update"
                    : "Completed import with no material changes"}{" "}
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
          <div className="tabs" role="group" aria-label="Finding views">
            {[
              ["visible", "All"],
              ["saved", "Saved"],
              ["updated", "Updated"],
            ].map(([v, label]) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => {
                  setView(v);
                  setSelected([]);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {view === "updated" && (
            <p>
              Findings with recorded material changes across the imported
              history, from <DateText value={workspace.runs[0]?.at ?? null} />{" "}
              through <DateText value={workspace.runs.at(-1)?.at ?? null} />.
              Quiet imports do not erase earlier changes.
            </p>
          )}
          <div className="filter-bar">
            <label className="search-field">
              Search findings
              <input
                value={query}
                maxLength={200}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              View
              <select value={view} onChange={(e) => setView(e.target.value)}>
                <option value="visible">Not dismissed</option>
                <option value="all">All records</option>
                <option value="saved">Saved</option>
                <option value="updated">Updated</option>
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
                  : "Export filtered CSV"}
              </a>
            )}
          </div>
          <p className="fine-print">
            Unknown dates and records without a material change appear last.
          </p>
          {list.map((f) => (
            <article className="panel detail-section" key={f.id}>
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
                {f.categories.join(" · ")} · {f.location} · {f.facts.status}
              </p>
              <p className="finding-summary">{f.summary}</p>
              <p>
                <strong>Potential hotel relevance · inference:</strong>{" "}
                {f.assessment.inference || "Hotel relevance not assessed."}
              </p>
              <p>
                <DateText value={f.facts.start} /> · {f.quality}
                {f.saved ? " · Saved" : ""}
                {f.dismissed ? " · Dismissed" : ""}
              </p>
              <button className="button small" onClick={() => setDetail(f.id)}>
                Details
              </button>
            </article>
          ))}
          {!list.length && <p>No findings match these filters.</p>}
        </>
      )}
      {current && (
        <section
          className="panel detail-section"
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
          <h3>Potential hotel relevance</h3>
          <p>
            {current.assessment.inference || "Hotel relevance not assessed."}
          </p>
          <p>{current.assessment.rationale}</p>
          <h3>Unknowns</h3>
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
                Published <DateText value={e.publishedAt} /> · Retrieved{" "}
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
            <summary>Version history</summary>
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
