"use client";
import { demoFetch } from "@/lib/demo-client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Check,
  Copy,
  Download,
  Search,
  X,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import {
  categories,
  filterFindings,
  filtersSchema,
  type ResearchRun,
  type Category,
  type Filters,
  type FindingView,
  type Mutation,
} from "@/lib/contracts";
import { latestMaterialUpdate, sortFindings } from "@/lib/finding-presentation";
import { toBrief } from "@/lib/export";
import {
  ArrowLink,
  CategoryTag,
  DateText,
  Empty,
  Notice,
  PageHeading,
} from "./ui";
export type Mutate = (input: Mutation) => Promise<boolean>;
export type Notify = (message: string, error?: boolean) => void;
export async function exportCsv(
  filters: Filters,
  ids: string[],
  notify: Notify,
) {
  try {
    const params = new URLSearchParams({ ...filters });
    if (ids.length) params.set("ids", ids.join(","));
    const res = await demoFetch(`/api/demo/export?${params}`);
    if (!res.ok) throw Error((await res.json()).error);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SCOUT-fictional-demo.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("CSV downloaded. Fictional data is labeled in every row.");
  } catch (e) {
    notify(e instanceof Error ? e.message : "Export failed.", true);
  }
}
export async function copyFinding(f: FindingView, notify: Notify) {
  try {
    await navigator.clipboard.writeText(toBrief(f));
    notify("Finding brief copied with evidence and unknowns.");
  } catch {
    notify(
      "Clipboard access was unavailable. Use the readable brief or CSV export.",
      true,
    );
  }
}
export function FindingActions({
  finding: f,
  mutate,
  notify,
  busy,
}: {
  finding: FindingView;
  mutate: Mutate;
  notify: Notify;
  busy: boolean;
}) {
  return (
    <div className="finding-actions">
      <button
        className={`button small ${f.saved ? "selected" : ""}`}
        disabled={busy}
        onClick={() =>
          void mutate({
            action: "state",
            findingId: f.id,
            saved: !f.saved,
            dismissed: f.dismissed,
          })
        }
      >
        {f.saved ? <Check size={15} /> : <Bookmark size={15} />}{" "}
        {f.saved ? "Saved" : "Save"}
      </button>
      <button
        className="button small"
        disabled={busy}
        onClick={() =>
          void mutate({
            action: "state",
            findingId: f.id,
            saved: f.saved,
            dismissed: !f.dismissed,
          })
        }
      >
        {f.dismissed ? <RotateCcw size={15} /> : <X size={15} />}{" "}
        {f.dismissed ? "Restore" : "Dismiss"}
      </button>
      <button
        className="button small"
        onClick={() => void copyFinding(f, notify)}
      >
        <Copy size={15} />
        Copy
      </button>
    </div>
  );
}
export function FindingTable({
  findings,
  selected = [],
  onSelect,
  hideScout = false,
}: {
  findings: FindingView[];
  selected?: string[];
  onSelect?: (id: string) => void;
  hideScout?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table className="findings-table">
        <thead>
          <tr>
            {onSelect && (
              <th>
                <span className="sr-only">Select</span>
              </th>
            )}
            <th>Finding / location</th>
            {!hideScout && <th>Scout</th>}
            <th>Sample observation</th>
            <th>Relevant dates</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr key={f.id} className={f.dismissed ? "dismissed-row" : ""}>
              {onSelect && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${f.title}`}
                    checked={selected.includes(f.id)}
                    onChange={() => onSelect(f.id)}
                  />
                </td>
              )}
              <td>
                <Link href={`/demo/findings/${f.id}`} className="finding-name">
                  {f.title}
                </Link>
                <small>{f.location}</small>
                <div className="record-flags">
                  {f.saved && (
                    <span>
                      <Bookmark size={12} />
                      Saved
                    </span>
                  )}
                  {f.dismissed && <span>Dismissed</span>}
                </div>
              </td>
              {!hideScout && (
                <td>
                  <CategoryTag category={f.category} />
                </td>
              )}
              <td>
                <p className="finding-summary">{f.summary}</p>
                <p className="finding-relevance">
                  <strong>Potential hotel relevance · inference</strong>
                  <span>
                    {f.inference?.trim() || "Hotel relevance not assessed."}
                  </span>
                </p>
                <span
                  className={`quality ${f.quality === "Sample evidence" ? "" : "attention"}`}
                >
                  {f.quality}
                </span>
              </td>
              <td>
                <DateText value={f.start} />
                <small>
                  <span className="tag neutral">{f.status}</span>
                </small>
              </td>
              <td>
                <ArrowLink href={`/demo/findings/${f.id}`}>Details</ArrowLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Blueprint({
  findings,
  notify,
  category,
  exportMode = false,
  runs = [],
}: {
  findings: FindingView[];
  notify: Notify;
  category?: Category;
  exportMode?: boolean;
  runs?: ResearchRun[];
}) {
  const [filters, setFilters] = useState<Filters>({
      q: "",
      category: category ?? "all",
      state: "visible",
      quality: "all",
    }),
    [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState("all");
  const [sort, setSort] = useState<"changed" | "date">("changed");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const parsed = filtersSchema.safeParse(
      Object.fromEntries(
        ["q", "category", "state", "quality"]
          .filter((key) => query.has(key))
          .map((key) => [key, query.get(key)]),
      ),
    );
    if (parsed.success)
      setFilters({
        ...parsed.data,
        category: category ?? parsed.data.category,
      });
    setView(
      query.get("view") === "updated"
        ? "updated"
        : query.get("view") === "saved"
          ? "saved"
          : "all",
    );
  }, [category]);
  const changed = latestMaterialUpdate(runs, findings);
  const list = useMemo(
    () =>
      sortFindings(
        filterFindings(findings, filters).filter((f) =>
          view === "saved"
            ? f.saved
            : view === "updated"
              ? changed.ids.has(f.id)
              : true,
        ),
        sort,
      ),
    [findings, filters, view, sort, runs],
  );
  const visibleSelected = selected.filter((id) =>
    list.some((f) => f.id === id),
  );
  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters({ ...filters, [key]: value });
    setSelected([]);
  }
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Finding views">
        {["all", "saved", "updated"].map((name, index) => (
          <button
            key={name}
            role="tab"
            id={`finding-tab-${name}`}
            aria-controls="finding-results"
            aria-selected={view === name}
            tabIndex={view === name ? 0 : -1}
            onClick={() => {
              setView(name);
              setSelected([]);
            }}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % 3
                  : event.key === "ArrowLeft"
                    ? (index + 2) % 3
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 2
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              const name = ["all", "saved", "updated"][next];
              setView(name);
              setSelected([]);
              document.getElementById(`finding-tab-${name}`)?.focus();
            }}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="finding-results"
        aria-labelledby={`finding-tab-${view}`}
      >
        {view === "updated" && (
          <p className="period-note">
            {changed.run ? (
              <>
                Materially changed findings recorded in the{" "}
                <DateText value={changed.run.at} /> sample update.{" "}
                <Link href={`/demo/updates#${changed.run.id}`}>
                  Review that update
                </Link>
                . Later quiet cycles do not clear this view.
              </>
            ) : (
              "No material changes have been recorded."
            )}
          </p>
        )}
        <div className="filter-bar">
          <label className="search-field">
            <Search size={18} />
            <span className="sr-only">Search findings</span>
            <input
              placeholder="Search companies, projects, events…"
              value={filters.q}
              maxLength={200}
              onChange={(e) => update("q", e.target.value)}
            />
          </label>
          {!category && (
            <label>
              Scout
              <select
                value={filters.category}
                onChange={(e) =>
                  update("category", e.target.value as Filters["category"])
                }
              >
                <option value="all">All scouts</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            View
            <select
              value={filters.state}
              onChange={(e) =>
                update("state", e.target.value as Filters["state"])
              }
            >
              <option value="visible">Not dismissed</option>
              <option value="saved">Saved</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All records</option>
            </select>
          </label>
          <label>
            Evidence
            <select
              value={filters.quality}
              onChange={(e) =>
                update("quality", e.target.value as Filters["quality"])
              }
            >
              {[
                "all",
                "Sample evidence",
                "Needs verification",
                "Stale",
                "Conflicting evidence",
              ].map((v) => (
                <option key={v} value={v}>
                  {v === "all" ? "Any evidence status" : v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as "changed" | "date");
                setSelected([]);
              }}
            >
              <option value="changed">Most recent change</option>
              <option value="date">Relevant date · earliest first</option>
            </select>
          </label>
        </div>
        <p className="sort-note">
          {sort === "changed"
            ? "Recorded material changes, newest first. Findings without a recorded change appear last."
            : "Relevant start date, earliest first. Unknown dates appear last."}
        </p>
        <div className="results-bar">
          <span>
            {list.length} finding{list.length !== 1 ? "s" : ""}{" "}
            {visibleSelected.length > 0 &&
              `· ${visibleSelected.length} selected`}
          </span>
          <div>
            <button
              className="text-button"
              onClick={() =>
                setSelected(
                  visibleSelected.length === list.length
                    ? []
                    : list.map((f) => f.id),
                )
              }
              disabled={!list.length}
            >
              {visibleSelected.length === list.length && list.length
                ? "Clear selection"
                : "Select all results"}
            </button>
            <button
              className="button secondary small"
              disabled={!list.length}
              onClick={() =>
                void exportCsv(
                  filters,
                  visibleSelected.length
                    ? visibleSelected
                    : list.map((f) => f.id),
                  notify,
                )
              }
            >
              <Download size={16} />
              {visibleSelected.length ? "Export selected" : "Export filtered"}
            </button>
          </div>
        </div>
        {list.length ? (
          <FindingTable
            findings={list}
            hideScout={Boolean(category)}
            selected={visibleSelected}
            onSelect={(id) =>
              setSelected(
                selected.includes(id)
                  ? selected.filter((x) => x !== id)
                  : [...selected, id],
              )
            }
          />
        ) : (
          <Empty title="No findings match these filters">
            Try a different search, scout or evidence status. Dismissed findings
            remain available in the Dismissed view.
          </Empty>
        )}
      </div>
      {exportMode && (
        <Notice>
          Exports use the same filters and selections shown above. CSV includes
          stable IDs, facts, lodging inference, unknowns, evidence URLs, dates
          and verification status. Open a finding to copy or print its readable
          brief.
        </Notice>
      )}
    </>
  );
}
export function FindingDetail({
  finding: f,
  mutate,
  notify,
  busy,
}: {
  finding: FindingView;
  mutate: Mutate;
  notify: Notify;
  busy: boolean;
}) {
  return (
    <>
      <Link href="/demo/blueprint" className="text-link">
        <ArrowLeft size={16} />
        Back to blueprint
      </Link>
      <PageHeading
        title={f.title}
        description={`${f.location} · ${f.status}`}
        action={<CategoryTag category={f.category} />}
      />
      <div className="detail-actions">
        <FindingActions
          finding={f}
          mutate={mutate}
          notify={notify}
          busy={busy}
        />
        <button
          className="button secondary small"
          onClick={() =>
            void exportCsv(
              { q: "", category: "all", state: "all", quality: "all" },
              [f.id],
              notify,
            )
          }
        >
          <Download size={15} />
          Export CSV
        </button>
        <button className="text-button" onClick={() => window.print()}>
          Print brief
        </button>
      </div>
      <div className="detail-grid">
        <div>
          <section className="panel detail-section">
            <span className="eyebrow">Sample observed facts</span>
            <h2>What happened</h2>
            <p className="lead-copy">{f.summary}</p>
            <dl className="fact-grid">
              <div>
                <dt>Organizations</dt>
                <dd>{f.organizations.join(", ")}</dd>
              </div>
              <div>
                <dt>Public contact</dt>
                <dd>
                  {f.publicContact ??
                    "Not verified. No contact has been invented."}
                </dd>
              </div>
            </dl>
          </section>
          <section className="panel detail-section relevance">
            <span className="eyebrow">Assessment · inference, not demand</span>
            <h2>Potential hotel relevance</h2>
            <p className="lead-copy">
              {f.inference?.trim() || "Hotel relevance not assessed."}
            </p>
            {f.rationale && f.rationale !== f.summary && (
              <p>
                <strong>Supporting rationale:</strong> {f.rationale}
              </p>
            )}
            <h3>What we don’t know</h3>
            <ul className="unknowns">
              {f.unknowns.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </section>
          <section className="panel detail-section">
            <h2>Relevant dates</h2>
            <dl className="fact-grid">
              {" "}
              <div>
                <dt>Relevant start</dt>
                <dd>
                  <DateText value={f.start} />
                </dd>
              </div>
              <div>
                <dt>Relevant end</dt>
                <dd>
                  <DateText value={f.end} />
                </dd>
              </div>
            </dl>
          </section>
          <section className="panel detail-section">
            <h2>Sources</h2>
            <p className="muted">
              These are fictional evidence examples. The reserved .example
              addresses are not real sources.
            </p>
            {f.evidence.map((e) => (
              <article key={e.id} className="evidence">
                <h3>{e.publisher}</h3>
                <p>{e.claim}</p>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="source-link"
                >
                  {e.url}
                </a>
                <dl className="fact-grid">
                  <div>
                    <dt>Publication date</dt>
                    <dd>
                      <DateText value={e.publishedAt} />
                    </dd>
                  </div>
                  <div>
                    <dt>Sample retrieval date</dt>
                    <dd>
                      <DateText value={e.retrievedAt} />
                    </dd>
                  </div>
                  <div>
                    <dt>Verification</dt>
                    <dd>
                      {e.verification === "unavailable"
                        ? "Unavailable in this example"
                        : "Fictional · never verified"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>
        </div>
        <aside>
          <section className="panel detail-section">
            <h2>Record context</h2>
            <span className="tag neutral">{f.quality}</span>
            <dl className="stacked-facts">
              <dt>First seen in sample</dt>
              <dd>
                <DateText value={f.firstSeenAt} />
              </dd>
              <dt>Last checked in sample</dt>
              <dd>
                <DateText value={f.lastCheckedAt} />
              </dd>
              <dt>Last verified</dt>
              <dd>Never · fictional data</dd>
              <dt>Distance from hotel</dt>
              <dd>Not calculated</dd>
            </dl>
          </section>
          <details className="panel detail-section version-history">
            <summary>Version history</summary>
            {[...f.versions].reverse().map((v) => (
              <div className="timeline-item" key={v.id}>
                <small>
                  <DateText value={v.at} />
                </small>
                <h3>{v.summary}</h3>
                <p>
                  {v.before
                    ? `Before: ${v.before}`
                    : "First version of the sample record."}
                </p>
                <p>After: {v.after}</p>
                <small>
                  {v.material ? "Material change" : "Nonmaterial change"} ·{" "}
                  {v.evidenceIds.join(", ")}
                </small>
              </div>
            ))}
          </details>
        </aside>
      </div>
      <details className="brief-output">
        <summary>Readable copy of this finding</summary>
        <pre>{toBrief(f)}</pre>
      </details>
    </>
  );
}
