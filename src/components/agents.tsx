"use client";
import { useState } from "react";
import { Building2, HardHat, CalendarDays, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  categories,
  categoryDescriptions,
  categoryNames,
  type Category,
  type ResearchRun,
  type FindingView,
  type Workspace,
} from "@/lib/contracts";
import { ArrowLink, DateText, Notice, PageHeading } from "./ui";
import { runFindingSummary } from "@/lib/finding-presentation";
import { Blueprint, type Mutate, type Notify } from "./findings";
export const scoutIcons = {
  corporate: Building2,
  project: HardHat,
  event: CalendarDays,
};
export function AgentList({ data }: { data: Workspace }) {
  return (
    <>
      <PageHeading
        title="Company, project and event findings."
        description="The three prospecting categories in this fictional sample, with their findings, coverage and run history."
      />
      <Notice>
        This demo replays fictional updates across companies, projects and
        events. The expanded customer workspace also includes selected
        competitors, public mentions of the hotel and SCOUT Briefing. Live
        research is inactive; viewing this page never starts a refresh.
      </Notice>
      <div className="agent-grid">
        {categories.map((c) => {
          const Icon = scoutIcons[c];
          return (
            <article className="panel agent-card" key={c}>
              <div className="agent-card-top">
                <Icon size={30} strokeWidth={1.4} />
                <span className="tag neutral">
                  {data.coverage[c].paused ? "Paused" : "Ready · demo only"}
                </span>
              </div>
              <h2>{categoryNames[c]}</h2>
              <p>{categoryDescriptions[c]}</p>
              <dl>
                <div>
                  <dt>Sample findings</dt>
                  <dd>
                    {
                      data.findings.filter((f) =>
                        (f.categories ?? [f.category]).includes(c),
                      ).length
                    }
                  </dd>
                </div>
                <div>
                  <dt>Last successful sample run</dt>
                  <dd>
                    <DateText
                      value={
                        data.runs.find((r) => r.status === "Completed")?.at ??
                        null
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Next scheduled cycle</dt>
                  <dd>Not scheduled</dd>
                </div>
              </dl>
              <ArrowLink href={`/demo/agents/${c}`}>
                Open {categoryNames[c]}
              </ArrowLink>
            </article>
          );
        })}
      </div>
      <section className="shared-cycle">
        <h2>A shared cycle, not three separate rescans.</h2>
        <p>
          The planned service starts with one market blueprint, then shares two
          weekly update cycles across all five research categories. New evidence
          updates existing findings; a quiet cycle is a valid result. No
          schedule is active in this demo.
        </p>
      </section>
    </>
  );
}
export function RunHistory({
  runs,
  findings,
}: {
  runs: ResearchRun[];
  findings: FindingView[];
}) {
  return (
    <div className="run-history">
      {runs.map((r) => (
        <article
          className={`panel run-card ${r.status === "Completed" && !r.newIds.length && !r.changedIds.length ? "quiet-run" : ""}`}
          key={r.id}
          id={r.id}
        >
          <div className="run-date">
            <DateText value={r.at} />
            <small>
              {r.type === "baseline" ? "Initial blueprint" : "Market update"} ·
              {r.engine ? "sample update" : "preloaded sample"}
            </small>
          </div>
          <div>
            <span
              className={`tag ${r.status !== "Completed" ? "warning" : "neutral"}`}
            >
              {r.status}
            </span>
            <h3>
              {r.status !== "Completed"
                ? "Incomplete coverage"
                : !r.newIds.length && !r.changedIds.length
                  ? "Completed quiet check"
                  : r.summary}
            </h3>
            <p>
              {r.newIds.length} new findings · {r.changedIds.length} meaningful
              changes · three prospecting categories
            </p>
            {r.status !== "Completed" && (
              <p>
                Some coverage is incomplete. Zero changes does not mean a
                successful quiet check.
              </p>
            )}
            {[...new Set([...r.newIds, ...r.changedIds])].map((id) => {
              const finding = findings.find((f) => f.id === id);
              return (
                <div className="run-finding" key={id}>
                  {finding ? (
                    <>
                      <Link href={`/demo/findings/${id}`}>{finding.title}</Link>
                      <p>{runFindingSummary(finding, r)}</p>
                    </>
                  ) : (
                    <p>Historical finding unavailable in this workspace.</p>
                  )}
                </div>
              );
            })}
            <details className="run-details">
              <summary>Full update details</summary>
              <p>{r.summary}</p>
              {r.warnings.map((w) => (
                <p className="muted" key={w}>
                  {w}
                </p>
              ))}
              {r.reviewItems?.map((item, i) => (
                <details key={i}>
                  <summary>Review: {item.label}</summary>
                  <p>{item.reason}</p>
                  <ul>
                    {item.sourceUrls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p>Fictional .example source references only.</p>
                </details>
              ))}
              {r.coverage && (
                <dl className="fact-grid">
                  {Object.entries(r.coverage).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {r.usage && (
                <details>
                  <summary>Synthetic usage and reservations</summary>
                  <p>
                    Actual charged: $0. Test credits are artificial and do not
                    estimate commercial API costs.
                  </p>
                  <p>
                    Rate card: {r.usage.rateCard} · reserved{" "}
                    {r.usage.estimatedCredits} · reconciled{" "}
                    {r.usage.reconciledCredits} · held {r.usage.heldCredits}{" "}
                    credits
                  </p>
                  <p>
                    Tokens: {r.usage.inputTokens} input (
                    {r.usage.cachedInputTokens} cached), {r.usage.outputTokens}{" "}
                    output, {r.usage.reasoningTokens} reasoning. Searches:{" "}
                    {r.usage.searchCalls}; tools: {r.usage.toolCalls}. All
                    counts are simulated.
                  </p>
                </details>
              )}
            </details>
          </div>
        </article>
      ))}
    </div>
  );
}
export function AgentDetail({
  category: c,
  data,
  mutate,
  notify,
  busy,
}: {
  category: Category;
  data: Workspace;
  mutate: Mutate;
  notify: Notify;
  busy: boolean;
}) {
  const [tab, setTab] = useState("Findings");
  const Icon = scoutIcons[c];
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await mutate({
      action: "coverage",
      category: c,
      notes: String(form.get("notes")),
      paused: form.has("paused"),
    });
  }
  return (
    <>
      <Link className="text-link" href="/demo/agents">
        <ArrowLeft size={16} />
        All research agents
      </Link>
      <PageHeading
        title={categoryNames[c]}
        description={categoryDescriptions[c]}
        action={<Icon size={40} strokeWidth={1.2} />}
      />
      <div className="agent-stats">
        <div>
          <small>Current status</small>
          <strong>
            {data.coverage[c].paused
              ? "Paused"
              : "Ready · demo preference only"}
          </strong>
        </div>
        <div>
          <small>Last successful sample run</small>
          <strong>
            <DateText
              value={
                data.runs.find((r) => r.status === "Completed")?.at ?? null
              }
            />
          </strong>
        </div>
        <div>
          <small>Next cycle</small>
          <strong>Not scheduled</strong>
        </div>
        <div>
          <small>Sample findings</small>
          <strong>
            {
              data.findings.filter((f) =>
                (f.categories ?? [f.category]).includes(c),
              ).length
            }
          </strong>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Agent details">
        {["Findings", "Coverage", "Run history"].map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t.replace(" ", "-")}`}
            aria-controls="agent-panel"
            aria-selected={t === tab}
            tabIndex={t === tab ? 0 : -1}
            onKeyDown={(event) => {
              const names = ["Findings", "Coverage", "Run history"];
              const index = names.indexOf(tab);
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
              setTab(names[next]);
              document
                .getElementById(`tab-${names[next].replace(" ", "-")}`)
                ?.focus();
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        id="agent-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab.replace(" ", "-")}`}
      >
        {tab === "Findings" && (
          <Blueprint
            runs={data.runs}
            findings={data.findings}
            notify={notify}
            category={c}
          />
        )}
        {tab === "Coverage" && (
          <form className="panel coverage-editor" onSubmit={save}>
            <h2>What this scout covers</h2>
            <p>
              Within {data.profile.radiusMiles} miles of{" "}
              {data.profile.marketCenter}. Exclusions:{" "}
              {data.profile.exclusions.join(", ") || "None"}.
            </p>
            <label>
              Coverage instructions
              <textarea
                name="notes"
                defaultValue={data.coverage[c].notes}
                key={c}
                maxLength={2000}
                required
                rows={5}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                name="paused"
                defaultChecked={data.coverage[c].paused}
              />
              Pause this scout in the demo preferences
            </label>
            <Notice>
              Saving coverage or changing the pause preference never starts
              research. In a future activated service, coverage changes will be
              reviewed before the next authorized cycle; they will not trigger
              an automatic full baseline.
            </Notice>
            <button className="button primary" disabled={busy}>
              Save coverage preferences
            </button>
          </form>
        )}
        {tab === "Run history" && (
          <RunHistory
            findings={data.findings}
            runs={data.runs.filter((r) => r.categories.includes(c))}
          />
        )}
      </div>
    </>
  );
}
