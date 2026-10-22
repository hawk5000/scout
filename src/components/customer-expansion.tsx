"use client";
import { useEffect, useState } from "react";
import type { CustomerWorkspace } from "@/customer/contracts";
import type { ExpansionState } from "@/customer/expansion";
import {
  categoryLabels,
  fixtureScenarios,
  type ExpansionCommand,
  type ExpansionConfiguration,
} from "@/customer/expansion-contracts";
import {
  marketCategories,
  type MarketCategory,
} from "@/customer/market-contracts";
import { briefingText } from "@/customer/brief-export";
import { CustomerMarket } from "./customer-market";
const purposes = {
  corporate:
    "Companies and business activity that may bring visitors to your market.",
  project: "Construction and temporary projects that may bring visiting crews.",
  event: "Events and gatherings with possible overnight visitors.",
  competitor:
    "Noteworthy public changes at hotels you have explicitly selected.",
  property:
    "Public mentions of your hotel, with identity checks and sentiment in context.",
};
export function CustomerExpansion({
  destination,
  workspace,
  onWorkspace,
}: {
  destination: string;
  workspace: CustomerWorkspace;
  onWorkspace: (w: CustomerWorkspace) => void;
}) {
  const [state, setState] = useState<ExpansionState | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [providerStatus, setProviderStatus] = useState<
      "not_configured" | "valid" | "denied" | "unavailable" | null
    >(null),
    [category, setCategory] = useState<MarketCategory>("competitor"),
    [scenario, setScenario] =
      useState<(typeof fixtureScenarios)[number]>("baseline");
  const name = workspace.profile?.name || workspace.propertyName;
  async function request(input?: ExpansionCommand, briefId?: string) {
    const r = await fetch(
      `/api/customer/expansion${briefId ? `?briefId=${briefId}` : ""}`,
      input
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        : { cache: "no-store" },
    );
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    setState(data);
    return data as ExpansionState;
  }
  useEffect(() => {
    void request().catch((e) => setMessage(e.message));
  }, []);
  async function run(id?: string) {
    setBusy(true);
    setMessage("");
    try {
      let next = id
        ? state!
        : await request({
            action: "start",
            requestKey: crypto.randomUUID(),
            scenario,
          });
      for (let i = 0; i < 7; i++) {
        const job = next.jobs.find(
          (j) => j.state === "queued" || j.state === "running",
        );
        if (!job) break;
        next = await request({ action: "advance", jobId: job.id });
      }
      const r = await fetch("/api/workspace", { cache: "no-store" });
      if (r.ok) onWorkspace(await r.json());
      setMessage(
        next.jobs[0]?.document.reason ??
          `Refresh ${next.jobs[0]?.state ?? "finished"}.`,
      );
    } catch (e) {
      setMessage(
        (e as Error).message +
          " You can resume an interrupted refresh without importing duplicates.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function checkProvider() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/customer/openai-connection", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Connection check failed.");
      if (
        !["not_configured", "valid", "denied", "unavailable"].includes(
          data.status,
        )
      )
        throw Error("Connection check returned an unknown status.");
      setProviderStatus(data.status);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Connection check failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  const job = state?.jobs[0],
    active = state?.jobs.find(
      (j) => j.state === "queued" || j.state === "running",
    );
  const brief = state?.brief;
  async function downloadBrief(format: "csv" | "text" | "html") {
    if (!brief) return;
    try {
      const response = await fetch(
        `/api/customer/expansion?briefId=${brief.id}&format=${format}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw Error((await response.json()).error || "Export unavailable.");
      const blob = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blob;
      link.download = `scout-briefing-${brief.version}.${format === "csv" ? "csv" : format === "html" ? "html" : "txt"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blob), 1000);
      setMessage(
        format === "html"
          ? "Formatted briefing downloaded. Open it in a browser to print or save as PDF."
          : "Briefing downloaded with sources, coverage and fictional-data labels.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    }
  }
  return (
    <section className="expansion-workspace">
      <p className="eyebrow">
        {destination === "briefing"
          ? "SCOUT Briefing"
          : "Your research coverage"}
      </p>
      <h1>
        {destination === "briefing"
          ? `A clearer picture for ${name}`
          : `Around ${name}`}
      </h1>
      <p>
        {destination === "briefing"
          ? "One source-linked brief across your market, selected competitors and your hotel's public mentions."
          : "Explore useful findings by research category. You choose the competitor hotels; SCOUT keeps the evidence together."}
      </p>
      <p role="status">{message}</p>
      {!state ? (
        <p>Loading hotel research information...</p>
      ) : (
        <>
          {workspace.role === "admin" && (
            <aside
              className="expansion-panel"
              aria-label="Research provider status"
            >
              <p className="eyebrow">ADMINISTRATOR · CONNECTION CHECK</p>
              <h2>OpenAI provider</h2>
              <p>
                Check whether the existing Worker secret can access the selected
                model. This makes one free model-access check only; it does not
                search the web, create findings, or change research settings.
              </p>
              <button
                className="button secondary"
                type="button"
                onClick={() => void checkProvider()}
                disabled={busy}
              >
                {busy ? "Checking…" : "Check OpenAI connection"}
              </button>
              {providerStatus && (
                <p role="status">
                  Connection status: {providerStatus.replaceAll("_", " ")}.
                </p>
              )}
              <p className="fine-print">
                Live research and paid calls remain disabled. The approved
                ceiling is $1.25 for one manual five-category cycle; source
                permissions and review staging are still required before it can
                run.
              </p>
            </aside>
          )}
          {state.fixturesEnabled && (
            <aside className="expansion-notice">
              <strong>Isolated synthetic workspace</strong>
              <p>
                All refreshes below use fictional fixtures. No public sources
                are fetched and no research charges or notifications are
                generated.
              </p>
            </aside>
          )}
          {destination === "research" ? (
            <>
              <div className="expansion-tabs" aria-label="Research categories">
                {marketCategories.map((c) => (
                  <button
                    key={c}
                    className={`button ${category === c ? "primary" : "secondary"}`}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {categoryLabels[c]}
                  </button>
                ))}
              </div>
              <div className={`expansion-panel finding-accent-${category}`}>
                <p className="eyebrow">{categoryLabels[category]}</p>
                <h2>
                  {category === "property"
                    ? `What is being said about ${name}?`
                    : category === "competitor"
                      ? "Your selected hotels, in focus"
                      : categoryLabels[category]}
                </h2>
                <p>{purposes[category]}</p>
                {category === "competitor" && (
                  <p>
                    <strong>Selected competitors:</strong>{" "}
                    {state.config.competitors
                      .filter((c) => c.active)
                      .map((c) => c.name)
                      .join(", ") ||
                      "None selected yet. Add the hotels you want to follow below."}
                  </p>
                )}
                {category === "property" && (
                  <p>
                    <strong>Matching identity:</strong>{" "}
                    {state.config.own.name || "Not configured"}
                    {state.config.own.domain
                      ? ` - ${state.config.own.domain}`
                      : ""}
                    . Similar names and brand-wide announcements are not enough
                    to confirm a match.
                  </p>
                )}
                <p>
                  {state.fixturesEnabled
                    ? "Fixture coverage only. Sources and dates are shown with each finding."
                    : "Live research is disabled. Existing reviewed findings remain available."}
                </p>
              </div>
              <CustomerMarket
                key={category}
                initialCategory={category}
                workspace={workspace}
                onChange={onWorkspace}
              />
              <details className="expansion-panel">
                <summary>Hotel identity and selected competitors</summary>
                <p>
                  Help distinguish your hotel from similarly named properties.
                  This does not start research.
                </p>
                <Configuration
                  key={state.revision}
                  state={state}
                  name={name}
                  readOnly={workspace.role === "viewer"}
                  save={async (config) => {
                    setBusy(true);
                    try {
                      await request({
                        action: "configure",
                        revision: state.revision,
                        config,
                      });
                      setMessage("Hotel identities and competitors saved.");
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  busy={busy}
                />
              </details>
              <details className="expansion-panel">
                <summary>
                  Recent coverage for {categoryLabels[category]}
                </summary>
                {state.jobs.flatMap((j) =>
                  j.document.outcomes
                    .filter((o) => o.category === category)
                    .map((o) => (
                      <div key={j.id}>
                        <strong>{o.status}</strong> -{" "}
                        {new Date(o.checkedAt).toLocaleString()}
                        <p>{o.message}</p>
                        <p>
                          Last successful check:{" "}
                          {o.lastSuccessAt
                            ? new Date(o.lastSuccessAt).toLocaleString()
                            : "None"}
                        </p>
                      </div>
                    )),
                )}
                {!state.jobs.some((j) =>
                  j.document.outcomes.some((o) => o.category === category),
                ) && <p>No refresh has been completed for this category.</p>}
              </details>
            </>
          ) : (
            <>
              <div className="expansion-panel briefing-action">
                <h2>Refresh research, then create a brief</h2>
                <p>
                  {state.fixturesEnabled
                    ? "Checks all five categories against isolated fixtures before preparing an evidence snapshot. An incomplete check is shown clearly."
                    : "Live refresh is not enabled. Your existing findings and stored briefs remain available. No paid source access or research budget has been activated."}
                </p>
                {state.fixturesEnabled && (
                  <label>
                    Fixture scenario
                    <select
                      value={scenario}
                      onChange={(e) =>
                        setScenario(e.target.value as typeof scenario)
                      }
                      disabled={busy || !!active}
                    >
                      {fixtureScenarios.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  className="button primary"
                  disabled={busy || workspace.role === "viewer"}
                  onClick={() => void run(active?.id)}
                >
                  {busy
                    ? "Refreshing fixture research..."
                    : active
                      ? "Resume refresh"
                      : state.fixturesEnabled
                        ? "Refresh fixtures and create briefing"
                        : "Check briefing availability"}
                </button>
                {state.fixturesEnabled && (
                  <p className="muted">
                    Fixture allowance: {state.budget.used ?? 0} used,{" "}
                    {state.budget.held ?? 0} reserved of {state.budget.limit}{" "}
                    units this month. Maximum 6 units per job. Actual charges:
                    $0.
                  </p>
                )}
              </div>
              {job && (
                <section
                  className="expansion-panel"
                  aria-label="Latest refresh"
                >
                  <h2>Latest refresh: {job.state}</h2>
                  <p>
                    Requested {new Date(job.createdAt).toLocaleString()}.{" "}
                    {job.step} of 5 categories checked.
                  </p>
                  {job.document.reason && <p>{job.document.reason}</p>}
                  <div className="coverage-grid">
                    {marketCategories.map((c) => {
                      const o = job.document.outcomes.find(
                        (o) => o.category === c,
                      );
                      return (
                        <article key={c}>
                          <h3>{categoryLabels[c]}</h3>
                          <strong>
                            {o?.status ??
                              (job.state === "blocked"
                                ? "blocked"
                                : "not checked")}
                          </strong>
                          <p>
                            {o?.message ?? "No new source check completed."}
                          </p>
                          {o && (
                            <small>
                              Last success:{" "}
                              {o.lastSuccessAt
                                ? new Date(o.lastSuccessAt).toLocaleString()
                                : "None"}
                            </small>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
              <div className="brief-history">
                <h2>Stored briefings</h2>
                <p>
                  Viewing a stored brief does not refresh research. Each version
                  preserves its original evidence and coverage.
                </p>
                {state.history.length > 0 ? (
                  <label>
                    View a stored briefing
                    <select
                      value={brief?.id ?? ""}
                      onChange={(e) =>
                        void request(undefined, e.target.value).catch((e) =>
                          setMessage(e.message),
                        )
                      }
                    >
                      {state.history.map((b) => (
                        <option key={b.id} value={b.id}>
                          Version {b.version} - {b.status} -{" "}
                          {new Date(b.createdAt).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p>No briefing has been created yet.</p>
                )}
              </div>
              {brief && (
                <article className="brief-snapshot">
                  <p className="eyebrow">
                    {job?.id === brief.jobId
                      ? "Evidence snapshot"
                      : "Previously stored brief - not a new refresh"}
                  </p>
                  <h2>SCOUT Briefing {brief.version}</h2>
                  <p>
                    <strong>{brief.status}</strong> - as of{" "}
                    {new Date(brief.generatedAt).toLocaleString()} - fictional
                    evidence
                  </p>
                  <div className="expansion-tabs">
                    <button
                      className="button secondary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            briefingText(brief),
                          );
                          setMessage(
                            "Briefing copied with sources and coverage.",
                          );
                        } catch {
                          setMessage("Copy unavailable. Use the text export.");
                        }
                      }}
                    >
                      Copy briefing
                    </button>
                    <a
                      className="button secondary"
                      href={`/api/customer/expansion?briefId=${brief.id}&format=html`}
                      onClick={(e) => {
                        e.preventDefault();
                        void downloadBrief("html");
                      }}
                    >
                      Download formatted report
                    </a>
                    <a
                      className="button secondary"
                      href={`/api/customer/expansion?briefId=${brief.id}&format=csv`}
                      onClick={(e) => {
                        e.preventDefault();
                        void downloadBrief("csv");
                      }}
                    >
                      Export briefing CSV
                    </a>
                    <a
                      className="button secondary"
                      href={`/api/customer/expansion?briefId=${brief.id}&format=text`}
                      onClick={(e) => {
                        e.preventDefault();
                        void downloadBrief("text");
                      }}
                    >
                      Export text
                    </a>
                  </div>
                  {brief.status === "no-change" && (
                    <div className="expansion-notice">
                      <strong>No material changes in this refresh.</strong>
                      <p>
                        The findings below are ongoing context, not newly
                        discovered opportunities.
                      </p>
                    </div>
                  )}
                  {brief.status === "partial" && (
                    <div className="expansion-notice">
                      <strong>Coverage is incomplete.</strong>
                      <p>
                        Missing checks do not mean there were no changes.
                        Previous findings remain labeled as ongoing context.
                      </p>
                    </div>
                  )}
                  <details>
                    <summary>Coverage at the time of this brief</summary>
                    {brief.coverage.map((o) => (
                      <p key={o.category}>
                        <strong>
                          {categoryLabels[o.category]}: {o.status}
                        </strong>{" "}
                        - {o.message} Last success: {o.lastSuccessAt ?? "None"}
                      </p>
                    ))}
                  </details>
                  {brief.sections.map((section) => (
                    <section key={section.heading}>
                      <h3>{section.heading}</h3>
                      {section.items.length === 0 ? (
                        <p>
                          No confidently matched findings available for this
                          section.
                        </p>
                      ) : (
                        section.items.map((item) => {
                          const f = brief.records.find(
                            (r) => r.id === item.findingId,
                          )!;
                          return (
                            <article
                              className={`brief-finding finding-accent-${f.categories[0]}`}
                              key={item.findingId}
                            >
                              <p className="eyebrow">
                                {item.ongoing
                                  ? "Ongoing context"
                                  : "New or changed"}{" "}
                                - finding version {item.version}
                              </p>
                              <h4>{f.title}</h4>
                              <p>{item.statement}</p>
                              <p>
                                <strong>Status:</strong> {f.facts.status}
                              </p>
                              {f.context && (
                                <p>
                                  <strong>
                                    Sentiment: {f.context.sentiment}.
                                  </strong>{" "}
                                  {f.context.sentimentReason}
                                </p>
                              )}
                              <div className="customer-finding-relevance">
                                <strong>
                                  What this may mean for your hotel
                                </strong>
                                <p>{item.implication}</p>
                                <small>
                                  Interpretation, not an established commercial
                                  result.
                                </small>
                              </div>
                              <p>
                                <strong>Unknowns:</strong>{" "}
                                {item.unknowns.join(" ")}
                              </p>
                              <ul>
                                {f.evidence
                                  .filter((e) =>
                                    item.evidenceIds.includes(e.id),
                                  )
                                  .map((e) => (
                                    <li key={e.id}>
                                      <a
                                        href={e.url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {e.publisher}
                                      </a>{" "}
                                      - published{" "}
                                      {e.publishedAt ?? "date unknown"}; checked{" "}
                                      {e.retrievedAt.slice(0, 10)}
                                    </li>
                                  ))}
                              </ul>
                            </article>
                          );
                        })
                      )}
                    </section>
                  ))}
                  {brief.connections.length > 0 && (
                    <section>
                      <h3>Connected activity</h3>
                      {brief.connections.map((c, i) => (
                        <p key={i}>
                          {c.explanation} Related findings:{" "}
                          {c.findingIds
                            .map(
                              (id) =>
                                brief.records.find((f) => f.id === id)?.title,
                            )
                            .join("; ")}
                        </p>
                      ))}
                    </section>
                  )}
                  <section>
                    <h3>What remains unknown</h3>
                    {brief.unknowns.map((u) => (
                      <p key={u}>{u}</p>
                    ))}
                  </section>
                </article>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
function Configuration({
  state,
  name,
  readOnly,
  busy,
  save,
}: {
  state: ExpansionState;
  name: string;
  readOnly: boolean;
  busy: boolean;
  save: (c: ExpansionConfiguration) => Promise<void>;
}) {
  const [config, setConfig] = useState<ExpansionConfiguration>({
    own: { ...state.config.own, name: state.config.own.name || name },
    competitors: state.config.competitors,
    paused: state.config.paused,
  });
  const fields = (
    item: ExpansionConfiguration["own"],
    change: (v: ExpansionConfiguration["own"]) => void,
    prefix: string,
  ) => (
    <div className="identity-grid">
      {(
        [
          ["name", "Hotel name"],
          ["address", "Street address"],
          ["locality", "City / region"],
          ["domain", "Official domain"],
          ["brand", "Brand (optional)"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            aria-label={`${prefix} ${label}`}
            value={item[key]}
            maxLength={300}
            placeholder={key === "domain" ? "hotel.example" : undefined}
            onChange={(e) => change({ ...item, [key]: e.target.value })}
          />
        </label>
      ))}
      <label>
        Other names / aliases
        <textarea
          aria-label={`${prefix} aliases`}
          value={item.aliases.join("\n")}
          onChange={(e) =>
            change({ ...item, aliases: e.target.value.split("\n") })
          }
        />
      </label>
      <label>
        Former names
        <textarea
          aria-label={`${prefix} former names`}
          value={item.formerNames.join("\n")}
          onChange={(e) =>
            change({ ...item, formerNames: e.target.value.split("\n") })
          }
        />
      </label>
    </div>
  );
  function clean(i: ExpansionConfiguration["own"]) {
    return {
      ...i,
      aliases: i.aliases.map((s) => s.trim()).filter(Boolean),
      formerNames: i.formerNames.map((s) => s.trim()).filter(Boolean),
    };
  }
  return (
    <form
      className="expansion-config"
      onSubmit={(e) => {
        e.preventDefault();
        void save({
          paused: config.paused,
          own: clean(config.own),
          competitors: config.competitors.map((c) => ({
            ...clean(c),
            id: c.id,
            active: c.active,
          })),
        });
      }}
    >
      <fieldset disabled={readOnly || busy}>
        <legend>Your hotel's public identity</legend>
        {fields(
          config.own,
          (own) => setConfig({ ...config, own }),
          "Own hotel",
        )}
      </fieldset>
      <fieldset disabled={readOnly || busy}>
        <legend>Selected competitor hotels</legend>
        <p>
          Only active hotels you add here are included. Deactivating a hotel
          preserves its earlier findings and membership history.
        </p>
        {config.competitors.map((c, index) => (
          <div className="competitor-editor" key={c.id}>
            <h3>Competitor {index + 1}</h3>
            {fields(
              c,
              (value) =>
                setConfig({
                  ...config,
                  competitors: config.competitors.map((x) =>
                    x.id === c.id ? { ...x, ...value } : x,
                  ),
                }),
              `Competitor ${index + 1}`,
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={c.active}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    competitors: config.competitors.map((x) =>
                      x.id === c.id ? { ...x, active: e.target.checked } : x,
                    ),
                  })
                }
              />
              Include this hotel in future research
            </label>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={config.competitors.length >= 25}
          onClick={() =>
            setConfig({
              ...config,
              competitors: [
                ...config.competitors,
                {
                  name: "",
                  address: "",
                  locality: "",
                  domain: "",
                  aliases: [],
                  formerNames: [],
                  brand: "",
                  id: crypto.randomUUID(),
                  active: true,
                },
              ],
            })
          }
        >
          Add competitor hotel
        </button>
        <p className="muted">
          Up to 25 entries per configuration for this implementation's storage
          safety limit; this is not a subscription allowance.
        </p>
      </fieldset>
      {state.fixturesEnabled && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={config.paused ?? false}
            disabled={busy || readOnly}
            onChange={(e) => setConfig({ ...config, paused: e.target.checked })}
          />
          Pause fixture refreshes for this hotel
        </label>
      )}
      <button className="button primary" disabled={busy || readOnly}>
        Save hotel identities
      </button>
    </form>
  );
}
