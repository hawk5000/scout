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
  type Workspace,
} from "@/lib/contracts";
import { ArrowLink, DateText, Notice, PageHeading } from "./ui";
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
        title="Your research team."
        description="Three perspectives on one market. Review the fictional findings, coverage and run history."
      />
      <Notice>
        Live research is inactive. The administrator workbench can replay
        offline synthetic scenarios through all three playbooks. Nothing runs
        when you view a page.
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
          The intended service establishes one initial market blueprint, then
          runs two update cycles each week across all three scouts. New evidence
          should update existing findings; a quiet cycle is a valid result.
        </p>
      </section>
    </>
  );
}
export function RunHistory({ runs }: { runs: ResearchRun[] }) {
  return (
    <div className="run-history">
      {runs.map((r) => (
        <article className="panel run-card" key={r.id}>
          <div className="run-date">
            <DateText value={r.at} />
            <small>
              {r.type === "baseline" ? "Initial blueprint" : "Market update"} ·
              {r.engine ? "synthetic engine replay" : "preloaded sample"}
            </small>
          </div>
          <div>
            <span
              className={`tag ${r.status !== "Completed" ? "warning" : "neutral"}`}
            >
              {r.status}
            </span>
            <h3>{r.summary}</h3>
            <p>
              {r.newIds.length} new findings · {r.changedIds.length} meaningful
              changes · all three scouts
            </p>
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
                  {r.usage.searchCalls}; tools: {r.usage.toolCalls}. All counts
                  are simulated.
                </p>
              </details>
            )}
            {[...r.newIds, ...r.changedIds].length > 0 && (
              <details>
                <summary>View affected findings</summary>
                <ul>
                  {[...r.newIds, ...r.changedIds].map((id) => (
                    <li key={id}>
                      <Link href={`/demo/findings/${id}`}>
                        {id
                          .replace(/^(corporate|project|event)-/, "")
                          .replaceAll("-", " ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
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
          <Blueprint findings={data.findings} notify={notify} category={c} />
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
            runs={data.runs.filter((r) => r.categories.includes(c))}
          />
        )}
      </div>
    </>
  );
}
