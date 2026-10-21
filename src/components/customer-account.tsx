"use client";
import { useState } from "react";
import { Brand } from "./ui";
import { categories, categoryNames, type Profile } from "@/lib/contracts";
import type { CustomerWorkspace } from "@/customer/contracts";
export function CustomerLogin() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main id="main" className="access-page">
      <Brand />
      <h1>Your SCOUT account.</h1>
      <p>
        Sign in with your assigned SalesHospitality account. Your administrator
        must enable access to your hotel.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const form = new FormData(e.currentTarget);
          try {
            const response = await fetch("/api/customer/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: form.get("email"),
                password: form.get("password"),
              }),
            });
            const data = await response.json();
            if (!response.ok) throw Error(data.error);
            location.assign("/app");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Sign-in unavailable.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p role="status">{message}</p>
      <p>
        For account access or a password reset, contact your administrator. No
        email is sent from SCOUT.
      </p>
    </main>
  );
}
export function CustomerAccount({ initial }: { initial: CustomerWorkspace }) {
  const [workspace, setWorkspace] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch("/api/customer/logout", { method: "POST" });
      if (!r.ok) throw Error("Sign-out could not be confirmed. Please retry.");
      location.assign("/app");
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  }
  async function save(form: HTMLFormElement) {
    setBusy(true);
    setMessage("");
    const f = new FormData(form);
    const list = (name: string) =>
      String(f.get(name) || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    const profile: Profile = {
      name: String(f.get("name")),
      website: String(f.get("website")),
      address: String(f.get("address")),
      timezone: String(f.get("timezone")),
      confirmed: f.get("confirmed") === "on",
      marketCenter: String(f.get("marketCenter")),
      radiusMiles: Number(f.get("radiusMiles")),
      includedPlaces: list("includedPlaces"),
      excludedPlaces: list("excludedPlaces"),
      priorities: list("priorities"),
      exclusions: list("exclusions"),
      categories: categories.filter((c) => f.get(c) === "on"),
      recipients: workspace.profile?.recipients ?? [],
      scheduleDays: workspace.profile?.scheduleDays ?? ["Tuesday", "Friday"],
      scheduleTime: workspace.profile?.scheduleTime ?? "09:00",
    };
    try {
      const r = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: workspace.revision,
          profile,
          coverage: Object.fromEntries(
            categories.map((c) => [c, String(f.get(`coverage-${c}`) || "")]),
          ),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setWorkspace(data);
      setMessage("Hotel profile saved.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const profile = workspace.profile;
  return (
    <main id="main" className="customer-shell">
      <header className="customer-header">
        <Brand />
        <span>{workspace.propertyName}</span>
        <button className="button secondary" disabled={busy} onClick={logout}>
          Sign out
        </button>
      </header>
      <div className="demo-banner">
        <strong>Research is disabled</strong>
        <p>
          Hotel profile changes are saved to your account when you select Save.
          Live research, paid calls and notifications are off.
        </p>
      </div>
      <nav className="customer-nav" aria-label="Customer workspace">
        {[
          "overview",
          "blueprint",
          "corporate",
          "project",
          "event",
          "updates",
          "profile",
        ].map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => {
              setTab(t);
              setMessage("");
            }}
          >
            {categories.includes(t as (typeof categories)[number])
              ? categoryNames[t as (typeof categories)[number]]
              : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      <p role="status">{message}</p>
      {tab === "profile" ? (
        <section>
          <h1>Your hotel profile.</h1>
          <p>
            Set your hotel’s market boundaries and research priorities. Saving
            does not start research or schedule updates.
          </p>
          <form
            key={workspace.revision}
            className="customer-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save(e.currentTarget);
            }}
          >
            <fieldset disabled={busy || workspace.role === "viewer"}>
              <legend>Hotel and market</legend>
              {[
                ["name", "Hotel name", profile?.name ?? workspace.propertyName],
                ["website", "Website", profile?.website ?? ""],
                ["address", "Address", profile?.address ?? ""],
                ["timezone", "Timezone", profile?.timezone ?? ""],
                ["marketCenter", "Market center", profile?.marketCenter ?? ""],
              ].map(([name, label, value]) => (
                <label key={name}>
                  {label}
                  <input
                    name={name}
                    defaultValue={value}
                    required
                    maxLength={300}
                    placeholder={
                      name === "timezone" ? "America/Los_Angeles" : undefined
                    }
                  />
                </label>
              ))}
              <label>
                Radius in miles
                <input
                  name="radiusMiles"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={profile?.radiusMiles ?? 10}
                  required
                />
              </label>
              {(
                [
                  "includedPlaces",
                  "excludedPlaces",
                  "priorities",
                  "exclusions",
                ] as const
              ).map((name) => (
                <label key={name}>
                  {
                    {
                      includedPlaces: "Included places",
                      excludedPlaces: "Excluded places",
                      priorities: "Priorities",
                      exclusions: "Research exclusions",
                    }[name]
                  }{" "}
                  — one per line
                  <textarea
                    name={name}
                    defaultValue={profile?.[name].join("\n") ?? ""}
                    required={name === "includedPlaces"}
                  />
                </label>
              ))}
              {categories.map((c) => (
                <div key={c}>
                  <label>
                    <input
                      name={c}
                      type="checkbox"
                      defaultChecked={profile?.categories.includes(c) ?? true}
                    />
                    {categoryNames[c]}
                  </label>
                  <label>
                    Coverage instructions
                    <textarea
                      name={`coverage-${c}`}
                      maxLength={2000}
                      defaultValue={workspace.coverage[c]}
                    />
                  </label>
                </div>
              ))}
              <label>
                <input
                  type="checkbox"
                  name="confirmed"
                  defaultChecked={profile?.confirmed ?? false}
                />
                I have reviewed this hotel profile.
              </label>
              <button className="button primary">
                {busy ? "Saving…" : "Save hotel profile"}
              </button>
            </fieldset>
          </form>
          {workspace.role === "viewer" && (
            <p>Your account has read-only access.</p>
          )}
          <a className="text-link" href="/api/customer/export">
            Download hotel profile
          </a>
          <button
            className="button secondary"
            onClick={() => location.reload()}
          >
            Reload latest saved profile
          </button>
        </section>
      ) : (
        <section>
          <p className="eyebrow">SCOUT by SalesHospitality</p>
          <h1>
            {tab === "overview"
              ? "Your market workspace."
              : tab === "blueprint"
                ? "Your market blueprint."
                : tab === "updates"
                  ? "Your market updates."
                  : categoryNames[tab as (typeof categories)[number]]}
          </h1>
          <p>
            {profile
              ? "Your hotel profile is saved. Market research has not been activated."
              : "Start by confirming your hotel profile and market boundaries."}
          </p>
          <div className="empty-state">
            <h2>
              {tab === "updates"
                ? "No research runs yet."
                : "No researched findings yet."}
            </h2>
            <p>
              Corporate SCOUT, Project SCOUT and Event SCOUT are paused. This
              account contains no demo findings and no scheduled research.
            </p>
            {categories.includes(tab as (typeof categories)[number]) && (
              <p>
                {workspace.coverage[tab as (typeof categories)[number]] ||
                  "Coverage instructions have not been added."}
              </p>
            )}
            <button
              className="button primary"
              onClick={() => setTab("profile")}
            >
              Review hotel profile
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
