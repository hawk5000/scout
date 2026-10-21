"use client";
import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import {
  profileSchema,
  categories,
  categoryNames,
  type Profile,
  type Workspace,
} from "@/lib/contracts";
import { Notice, PageHeading } from "./ui";
import type { Mutate } from "./findings";
const split = (v: string) =>
  v
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
export function ProfileEditor({
  profile,
  mutate,
  busy,
}: {
  profile: Profile;
  mutate: Mutate;
  busy: boolean;
}) {
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "");
    const result = profileSchema.safeParse({
      name: str("name"),
      website: str("website"),
      address: str("address"),
      timezone: str("timezone"),
      confirmed: f.has("confirmed"),
      marketCenter: str("marketCenter"),
      radiusMiles: Number(str("radiusMiles")),
      includedPlaces: split(str("includedPlaces")),
      excludedPlaces: split(str("excludedPlaces")),
      categories: f.getAll("categories"),
      priorities: split(str("priorities")),
      exclusions: split(str("exclusions")),
      recipients: split(str("recipients")),
      scheduleDays: [str("day1"), str("day2")],
      scheduleTime: str("scheduleTime"),
    });
    if (!result.success) {
      setError(
        result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" · "),
      );
      return;
    }
    await mutate({ action: "profile", profile: result.data });
  }
  return (
    <form className="profile-form" onSubmit={submit}>
      <section className="panel">
        <h2>The hotel</h2>
        <p className="muted">
          Use fictional information in this demo. Changes are saved only to your
          isolated demo workspace.
        </p>
        <div className="form-grid">
          <label>
            Hotel name
            <input
              name="name"
              defaultValue={profile.name}
              required
              maxLength={300}
            />
          </label>
          <label>
            Website
            <input
              name="website"
              type="url"
              defaultValue={profile.website}
              required
              maxLength={300}
            />
          </label>
          <label className="full">
            Address
            <input
              name="address"
              defaultValue={profile.address}
              required
              maxLength={300}
            />
          </label>
          <label>
            Timezone
            <input
              name="timezone"
              defaultValue={profile.timezone}
              required
              placeholder="America/Los_Angeles"
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="confirmed"
              defaultChecked={profile.confirmed}
            />
            I have reviewed and confirmed this sample profile.
          </label>
        </div>
      </section>
      <section className="panel">
        <h2>Market boundaries</h2>
        <p className="muted">
          Boundaries are saved as research instructions. Geocoding and distance
          calculations are not connected.
        </p>
        <div className="form-grid">
          <label>
            Market center
            <input
              name="marketCenter"
              defaultValue={profile.marketCenter}
              required
              maxLength={300}
            />
          </label>
          <label>
            Radius in miles
            <input
              name="radiusMiles"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue={profile.radiusMiles}
              required
            />
          </label>
          <label>
            Included places · one per line
            <textarea
              name="includedPlaces"
              defaultValue={profile.includedPlaces.join("\n")}
              required
            />
          </label>
          <label>
            Excluded places · one per line
            <textarea
              name="excludedPlaces"
              defaultValue={profile.excludedPlaces.join("\n")}
            />
          </label>
        </div>
        <fieldset>
          <legend>Research categories</legend>
          <div className="checkbox-row">
            {categories.map((c) => (
              <label key={c}>
                <input
                  name="categories"
                  value={c}
                  type="checkbox"
                  defaultChecked={profile.categories.includes(c)}
                />
                {categoryNames[c]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-grid">
          <label>
            Priorities · one per line
            <textarea
              name="priorities"
              defaultValue={profile.priorities.join("\n")}
            />
          </label>
          <label>
            Exclusions · one per line
            <textarea
              name="exclusions"
              defaultValue={profile.exclusions.join("\n")}
            />
          </label>
        </div>
      </section>
      <section className="panel">
        <h2>Delivery preferences</h2>
        <Notice>
          Used by explicit fixture slot checks and delivery previews only. No
          live research or notifications run in this build. Both weekly cycles
          cover all three scouts together.
        </Notice>
        <div className="form-grid">
          {["day1", "day2"].map((name, i) => (
            <label key={name}>
              Cycle {i + 1} day
              <select name={name} defaultValue={profile.scheduleDays[i]}>
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Local time
            <input
              name="scheduleTime"
              type="time"
              defaultValue={profile.scheduleTime}
              required
            />
          </label>
          <label>
            Notification recipients · one per line
            <textarea
              name="recipients"
              defaultValue={profile.recipients.join("\n")}
              placeholder="Optional · use fictional .example addresses"
            />
          </label>
        </div>
      </section>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy} type="submit">
        {busy ? "Saving…" : "Save hotel profile"}
      </button>
    </form>
  );
}
const setupSteps = [
  "Hotel profile",
  "Market boundaries",
  "Access & recipients",
  "Cycle preferences",
  "Review blueprint",
  "Demo handoff",
];
export function Setup({
  data,
  mutate,
  busy,
}: {
  data: Workspace;
  mutate: Mutate;
  busy: boolean;
}) {
  const step = data.setupStep;
  return (
    <>
      <PageHeading
        title="A thoughtful start."
        description="Guided administrator setup · fictional demo rehearsal"
      />
      <div className="setup-layout">
        <ol className="setup-steps">
          {setupSteps.map((s, i) => (
            <li
              key={s}
              className={i === step ? "current" : i < step ? "done" : ""}
            >
              <span>{i < step ? <Check size={16} /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div>
          <section className="panel setup-panel">
            <span className="eyebrow">Step {step + 1} of 6</span>
            <h2>{setupSteps[step]}</h2>
            {step === 0 && (
              <>
                <p>
                  Review the fictional property website and address, confirm the
                  profile, then continue. Public website extraction is not
                  connected.
                </p>
                <ProfileEditor
                  profile={data.profile}
                  mutate={mutate}
                  busy={busy}
                />
              </>
            )}
            {step === 1 && (
              <>
                <p>
                  Confirm that the research area and hotel priorities match the
                  intended sample market.
                </p>
                <dl className="stacked-facts">
                  <dt>Center</dt>
                  <dd>{data.profile.marketCenter}</dd>
                  <dt>Boundary</dt>
                  <dd>
                    {data.profile.radiusMiles} miles ·{" "}
                    {data.profile.includedPlaces.join(", ")}
                  </dd>
                  <dt>Excluded places</dt>
                  <dd>{data.profile.excludedPlaces.join(", ") || "None"}</dd>
                  <dt>Categories</dt>
                  <dd>
                    {data.profile.categories
                      .map((c) => categoryNames[c])
                      .join(", ")}
                  </dd>
                  <dt>Priorities</dt>
                  <dd>{data.profile.priorities.join(", ")}</dd>
                </dl>
                <a href="/demo/profile" className="text-link">
                  Edit profile and boundaries
                </a>
              </>
            )}
            {step === 2 && (
              <>
                <p>
                  This browser has an isolated demo administrator session. No
                  real customer has been invited or granted access.
                </p>
                <Notice>
                  Production activation requires verified identity, property
                  membership and entitlement contracts. Invitations and delivery
                  are not connected.
                </Notice>
                <p>
                  Draft recipients:{" "}
                  {data.profile.recipients.join(", ") || "None configured"}
                </p>
                <a href="/demo/profile" className="text-link">
                  Edit recipient preferences
                </a>
              </>
            )}
            {step === 3 && (
              <>
                <p>
                  The shared blueprint has two intended update cycles each week,
                  covering all three scouts together.
                </p>
                <div className="schedule-card">
                  <strong>{data.profile.scheduleDays.join(" & ")}</strong>
                  <p>
                    {data.profile.scheduleTime} · {data.profile.timezone}
                  </p>
                  <span className="tag neutral">
                    Inactive · preferences only
                  </span>
                </div>
                <p>
                  No live baseline, scheduler, provider or notification delivery
                  is enabled. Opening this page cannot trigger research.
                </p>
              </>
            )}
            {step === 4 && (
              <>
                <p>
                  Review the preloaded fictional blueprint before a demo
                  handoff. This step does not generate research.
                </p>
                <div className="review-summary">
                  <strong>{data.findings.length}</strong>
                  <span>fictional findings across three scouts</span>
                </div>
                <a href="/demo/blueprint" className="button secondary">
                  Review the blueprint
                </a>
                <Notice>
                  For a real property, baseline generation and human evidence
                  review remain blocked until the research engine, approved
                  budgets and external access are configured.
                </Notice>
              </>
            )}
            {step === 5 && (
              <>
                <div className="success-mark">
                  <Check size={25} />
                </div>
                <h3>Demo setup reviewed.</h3>
                <p>
                  Your sample profile, coverage and preferences are stored
                  locally. The customer interface and export workflows are ready
                  to explore.
                </p>
                <a href="/demo" className="button primary">
                  Open customer overview
                </a>
                <Notice>
                  Production handoff has not occurred. No service activation,
                  live research, invitation or email was performed.
                </Notice>
              </>
            )}
            {step < 5 && (
              <div className="setup-actions">
                <button
                  className="button secondary"
                  disabled={busy || step === 0}
                  onClick={() =>
                    void mutate({ action: "setup", step: step - 1 })
                  }
                >
                  Back
                </button>
                <button
                  className="button primary"
                  disabled={busy || !data.profile.confirmed}
                  onClick={() =>
                    void mutate({ action: "setup", step: step + 1 })
                  }
                >
                  {step === 4 ? "Complete demo review" : "Confirm & continue"}
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>
          <section className="admin-status">
            <h3>Service readiness</h3>
            <dl>
              <div>
                <dt>Entitlement</dt>
                <dd>Not connected</dd>
              </div>
              <div>
                <dt>Baseline / ongoing API spend</dt>
                <dd>Unmeasured / unmeasured</dd>
              </div>
              <div>
                <dt>Research budget</dt>
                <dd>$0 · research disabled</dd>
              </div>
              <div>
                <dt>Retry controls</dt>
                <dd>Live retries disabled; synthetic retries are bounded</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
