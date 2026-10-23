"use client";
import { CustomerBlueprint } from "./customer-blueprint";
import { useEffect, useState } from "react";
import type { CustomerWorkspace } from "@/customer/contracts";
import { profileFromBasics } from "@/customer/profile-basics";
import type { ExpansionState } from "@/customer/expansion";
import type { ExpansionConfiguration } from "@/customer/expansion-contracts";

type HotelDraft = ExpansionConfiguration["competitors"][number];
const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
const domainFromWebsite = (website: string) => {
  if (!website.trim()) return "";
  try {
    return new URL(website).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};
const fullAddress = (row: HotelDraft) =>
  [row.address, row.locality].filter(Boolean).join(", ").slice(0, 300);

export function CustomerHotelProfile({
  initial,
  onWorkspace,
}: {
  initial: CustomerWorkspace;
  onWorkspace: (workspace: CustomerWorkspace) => void;
}) {
  const [configState, setConfigState] = useState<ExpansionState | null>(null);
  const [hotels, setHotels] = useState<HotelDraft[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const profile = initial.profile;

  useEffect(() => {
    let active = true;
    void fetch("/api/customer/expansion", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw Error(data.error ?? "Could not load hotel settings.");
        return data as ExpansionState;
      })
      .then((data) => {
        if (!active) return;
        setConfigState(data);
        setHotels(data.config.competitors.filter((hotel) => hotel.active));
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load hotel settings.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(form: HTMLFormElement) {
    if (!configState) {
      setMessage(
        "Hotel settings could not be loaded. Reload this page before saving.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    const data = new FormData(form);
    try {
      const nextProfile = profileFromBasics(profile, data);
      const profileResponse = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: initial.revision,
          profile: nextProfile,
          coverage: initial.coverage,
        }),
      });
      const updatedWorkspace = await profileResponse.json();
      if (!profileResponse.ok) throw Error(updatedWorkspace.error);
      onWorkspace(updatedWorkspace as CustomerWorkspace);

      const competitors = hotels.map((hotel, index) => {
        const address = String(data.get(`comp-${index}-address`) ?? "").trim();
        const locality = String(
          data.get(`comp-${index}-locality`) ?? "",
        ).trim();
        const website = String(data.get(`comp-${index}-website`) ?? "").trim();
        return {
          ...hotel,
          name: String(data.get(`comp-${index}-name`) ?? "").trim(),
          address,
          locality,
          domain: domainFromWebsite(website),
          aliases: lines(data.get(`comp-${index}-aliases`)),
          active: true,
        };
      });
      const postal = nextProfile.postalAddress;
      const ownAddress = postal
        ? [
            postal.line1,
            postal.line2,
            [postal.city, postal.region, postal.postalCode]
              .filter(Boolean)
              .join(" "),
            postal.country,
          ]
            .filter(Boolean)
            .join(", ")
            .slice(0, 300)
        : nextProfile.address.slice(0, 300);
      const config: ExpansionConfiguration = {
        own: {
          ...configState.config.own,
          name: nextProfile.name,
          address: ownAddress,
          locality: [postal?.city, postal?.region, postal?.country]
            .filter(Boolean)
            .join(", ")
            .slice(0, 300),
          domain: domainFromWebsite(nextProfile.website),
          aliases: lines(data.get("hotelAliases")),
          formerNames: lines(data.get("formerNames")),
        },
        ...(configState.config.paused === undefined
          ? {}
          : { paused: configState.config.paused }),
        competitors,
      };
      const configResponse = await fetch("/api/customer/expansion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "configure",
          revision: configState.revision,
          config,
        }),
      });
      const configResult = await configResponse.json();
      if (!configResponse.ok) {
        throw Error(
          `Hotel details saved, but the comp set could not be saved: ${configResult.error}`,
        );
      }
      const nextState = configResult as ExpansionState;
      setConfigState(nextState);
      setHotels(nextState.config.competitors.filter((hotel) => hotel.active));
      setMessage("Hotel profile and comp set saved. Research is still off.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Hotel profile could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  const editable = initial.role !== "viewer";
  const canAdd = hotels.length < 5;
  return (
    <section>
      <p className="eyebrow">Hotel profile</p>
      <h1>{profile?.name || initial.propertyName}</h1>
      <p>
        Add the hotel details and the competitors from your STR comp set. These
        details help SCOUT identify the right properties; saving them does not
        start research.
      </p>
      <CustomerBlueprint identityOnly />
      <form
        className="customer-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save(event.currentTarget);
        }}
      >
        <fieldset disabled={busy || loading || !editable}>
          <legend>Hotel details</legend>
          <label>
            Hotel name
            <input
              name="name"
              autoComplete="organization"
              required
              maxLength={300}
              defaultValue={profile?.name ?? initial.propertyName}
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
              Previously saved address: <strong>{profile.address}</strong>. Add
              the full address below when ready.
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
        </fieldset>

        <fieldset disabled={busy || loading || !editable}>
          <legend>Research area</legend>
          <label>
            Market or city to cover
            <input
              name="marketCenter"
              maxLength={300}
              placeholder="For example, Portland west side"
              defaultValue={profile?.marketCenter ?? ""}
            />
          </label>
          <label>
            Coverage radius in miles (optional)
            <input
              name="radiusMiles"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue={profile?.radiusMiles ?? ""}
            />
          </label>
          <label>
            Nearby places to include (one per line)
            <textarea
              name="includedPlaces"
              placeholder="Cities, districts or venues"
              defaultValue={profile?.includedPlaces.join("\n") ?? ""}
            />
          </label>
          <label>
            Nearby places to leave out (optional)
            <textarea
              name="excludedPlaces"
              defaultValue={profile?.excludedPlaces.join("\n") ?? ""}
            />
          </label>
        </fieldset>

        <fieldset disabled={busy || loading || !editable}>
          <legend>Other names for your hotel (optional)</legend>
          <label>
            Names or spellings guests may use (one per line)
            <textarea
              name="hotelAliases"
              defaultValue={configState?.config.own.aliases.join("\n") ?? ""}
            />
          </label>
          <label>
            Former hotel names (one per line)
            <textarea
              name="formerNames"
              defaultValue={
                configState?.config.own.formerNames.join("\n") ?? ""
              }
            />
          </label>
        </fieldset>

        <fieldset disabled={busy || loading || !editable}>
          <legend>STR comp set</legend>
          <p className="profile-help">
            Add up to five hotels from your STR report. SCOUT uses only the
            hotels you list here for competitor findings.
          </p>
          {hotels.map((hotel, index) => (
            <div className="comp-hotel-card" key={hotel.id}>
              <div className="comp-hotel-heading">
                <strong>Hotel {index + 1}</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setHotels((items) =>
                      items.filter((item) => item.id !== hotel.id),
                    )
                  }
                  aria-label={`Remove ${hotel.name || `hotel ${index + 1}`} from comp set`}
                >
                  Remove
                </button>
              </div>
              <label>
                Hotel name
                <input
                  name={`comp-${index}-name`}
                  required
                  maxLength={300}
                  defaultValue={hotel.name}
                />
              </label>
              <label>
                Full address
                <input
                  name={`comp-${index}-address`}
                  required
                  maxLength={300}
                  defaultValue={hotel.address}
                />
              </label>
              <label>
                City or market
                <input
                  name={`comp-${index}-locality`}
                  maxLength={300}
                  defaultValue={hotel.locality}
                />
              </label>
              <label>
                Official website (optional)
                <input
                  name={`comp-${index}-website`}
                  type="url"
                  maxLength={2048}
                  placeholder="https://hotel.com"
                  defaultValue={hotel.domain ? `https://${hotel.domain}` : ""}
                />
              </label>
              <label>
                Other names (optional, one per line)
                <textarea
                  name={`comp-${index}-aliases`}
                  defaultValue={hotel.aliases.join("\n")}
                />
              </label>
            </div>
          ))}
          {canAdd && (
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setHotels((items) => [
                  ...items,
                  {
                    id: `comp-${crypto.randomUUID()}`,
                    name: "",
                    address: "",
                    locality: "",
                    domain: "",
                    aliases: [],
                    formerNames: [],
                    brand: "",
                    active: true,
                  },
                ])
              }
            >
              Add a comp-set hotel
            </button>
          )}
          {!canAdd && (
            <p className="profile-help">
              You’ve added the maximum of five hotels.
            </p>
          )}
          {hotels.length === 0 && (
            <p className="profile-help">No competitor hotels added yet.</p>
          )}
        </fieldset>
        <button
          className="button primary"
          disabled={busy || loading || !editable || !configState}
        >
          {busy
            ? "Saving…"
            : loading
              ? "Loading hotel settings…"
              : "Save hotel profile"}
        </button>
      </form>
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
      {!editable && <p>Your account has read-only access.</p>}
    </section>
  );
}
