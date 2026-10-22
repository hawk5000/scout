"use client";
import { useState } from "react";
import { CustomerExpansion } from "./customer-expansion";
import { CustomerMarket } from "./customer-market";
import { CustomerHotelProfile } from "./customer-hotel-profile";
import { Brand } from "./ui";
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
  const [tab, setTab] = useState("findings");
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
  const profile = workspace.profile;
  const hotelName = profile?.name || workspace.propertyName;
  const hotelLocation = profile?.postalAddress
    ? [
        profile.postalAddress.city,
        profile.postalAddress.region,
        profile.postalAddress.country,
      ]
        .filter(Boolean)
        .join(", ")
    : profile?.address;
  return (
    <main id="main" className="customer-shell">
      <header className="customer-header">
        <Brand />
        <div className="customer-hotel-identity" aria-label="Current hotel">
          <span className="customer-hotel-label">Your hotel</span>
          <strong>{hotelName}</strong>
          {hotelLocation && (
            <span className="customer-hotel-location">{hotelLocation}</span>
          )}
        </div>
        <button className="button secondary" disabled={busy} onClick={logout}>
          Sign out
        </button>
      </header>
      <p className="customer-service-status">
        Research is not running. Notifications are off.
      </p>
      <nav className="customer-nav" aria-label="Customer workspace">
        {[
          ["findings", "Findings"],
          ["updates", "Updates"],
          ["briefing", "Briefing"],
          ["research", "Research views"],
          ["profile", "Hotel profile"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => {
              setTab(value);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <p role="status">{message}</p>
      {tab === "profile" ? (
        <CustomerHotelProfile initial={workspace} onWorkspace={setWorkspace} />
      ) : tab === "briefing" || tab === "research" ? (
        <CustomerExpansion
          key={tab}
          destination={tab}
          workspace={workspace}
          onWorkspace={setWorkspace}
        />
      ) : (
        <section>
          <p className="eyebrow">
            {tab === "updates"
              ? "Your market updates"
              : "Your market blueprint"}
          </p>
          <h1>
            {tab === "updates"
              ? `Updates for ${hotelName}`
              : `Findings for ${hotelName}`}
          </h1>
          <p>
            {tab === "updates"
              ? "See what's new, what changed and which findings are worth another look."
              : "Companies, projects, events, selected competitors and public mentions of your hotel. Save useful findings or export them to your sales tools."}
          </p>
          <CustomerMarket
            key={tab}
            workspace={workspace}
            onChange={setWorkspace}
            updatesOnly={tab === "updates"}
          />
        </section>
      )}
    </main>
  );
}
