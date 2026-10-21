"use client";
import { useState } from "react";
import { CustomerMarket } from "./customer-market";
import { Brand } from "./ui";
import type { CustomerWorkspace } from "@/customer/contracts";
import { profileFromBasics } from "@/customer/profile-basics";
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
  async function save(form: HTMLFormElement) {
    setBusy(true);
    setMessage("");
    try {
      const profile = profileFromBasics(workspace.profile, new FormData(form));
      const r = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: workspace.revision,
          profile,
          coverage: workspace.coverage,
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
        <section>
          <p className="eyebrow">Hotel profile</p>
          <h1>{hotelName}</h1>
          <p>
            Keep {hotelName}’s details up to date so findings focus on the area
            around your hotel. Only hotel name is required.
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
              <legend>Hotel details</legend>
              <label>
                Hotel name
                <input
                  name="name"
                  autoComplete="organization"
                  required
                  maxLength={300}
                  defaultValue={profile?.name ?? workspace.propertyName}
                />
              </label>
              <label>
                Website (optional)
                <input
                  name="website"
                  type="url"
                  autoComplete="url"
                  placeholder="https://yourhotel.com"
                  maxLength={2048}
                  defaultValue={profile?.website ?? ""}
                />
              </label>
              <h2 className="profile-address-heading">Hotel address</h2>
              {profile?.address && !profile.postalAddress && (
                <p className="profile-existing-address">
                  Previously saved address: <strong>{profile.address}</strong>.
                  Add the full address below when ready.
                </p>
              )}
              <label>
                Street address
                <input
                  name="line1"
                  autoComplete="address-line1"
                  maxLength={150}
                  defaultValue={profile?.postalAddress?.line1 ?? ""}
                />
              </label>
              <label>
                Address line 2 (optional)
                <input
                  name="line2"
                  autoComplete="address-line2"
                  maxLength={150}
                  defaultValue={profile?.postalAddress?.line2 ?? ""}
                />
              </label>
              <div className="profile-address-grid">
                <label>
                  City
                  <input
                    name="city"
                    autoComplete="address-level2"
                    maxLength={100}
                    defaultValue={profile?.postalAddress?.city ?? ""}
                  />
                </label>
                <label>
                  State / province / region
                  <input
                    name="region"
                    autoComplete="address-level1"
                    maxLength={100}
                    defaultValue={profile?.postalAddress?.region ?? ""}
                  />
                </label>
                <label>
                  ZIP / postal code
                  <input
                    name="postalCode"
                    autoComplete="postal-code"
                    maxLength={30}
                    defaultValue={profile?.postalAddress?.postalCode ?? ""}
                  />
                </label>
                <label>
                  Country
                  <input
                    name="country"
                    autoComplete="country-name"
                    maxLength={100}
                    defaultValue={profile?.postalAddress?.country ?? ""}
                  />
                </label>
              </div>
              <button className="button primary">
                {busy ? "Saving…" : "Save hotel profile"}
              </button>
            </fieldset>
          </form>
          {workspace.role === "viewer" && (
            <p>Your account has read-only access.</p>
          )}
        </section>
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
              : "Local companies, projects and events that may bring business to your hotel. Save useful findings or export them to your sales tools."}
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
