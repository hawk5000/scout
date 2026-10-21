"use client";
import { useState } from "react";
import { commercialSensitivity } from "@/lib/commercial";
const fields = [
  ["baselineResearchUsd", "Initial research cost ($)", 100000],
  ["onboardingMinutes", "Hands-on onboarding (minutes)", 10000],
  ["monthlyResearchUsd", "Monthly research cost ($)", 100000],
  ["monthlyHostingUsd", "Monthly hosting allocation ($)", 100000],
  ["supportMinutes", "Monthly support (minutes)", 10000],
  ["hourlyLaborUsd", "Labor rate ($/hour)", 10000],
] as const;
export function PilotReview() {
  const [result, setResult] = useState<ReturnType<
      typeof commercialSensitivity
    > | null>(null),
    [error, setError] = useState("");
  return (
    <section className="panel coverage-editor" style={{ marginBottom: 28 }}>
      <span className="eyebrow">PILOT REHEARSAL · PRODUCTION BLOCKED</span>
      <h2>Test the offer against your assumptions.</h2>
      <p>
        The working offer is $99 setup and $50/month per hotel. Enter
        assumptions to inspect contribution before other overhead. Blank fields
        remain unknown. No value here is a measured provider price or a profit
        claim.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          const data = new FormData(e.currentTarget);
          try {
            setResult(
              commercialSensitivity(
                Object.fromEntries(
                  fields.map(([key]) => [
                    key,
                    String(data.get(key) ?? "").trim() === ""
                      ? null
                      : Number(data.get(key)),
                  ]),
                ),
              ),
            );
          } catch {
            setError(
              "Use nonnegative values within the displayed input limits.",
            );
            setResult(null);
          }
        }}
      >
        <div className="form-grid">
          {fields.map(([key, label, max]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                type="number"
                min="0"
                max={max}
                step="any"
                placeholder="Unknown"
              />
            </label>
          ))}
        </div>
        <button className="button secondary" type="submit">
          Calculate assumption sensitivity
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status">
          <p>
            Setup contribution:{" "}
            {result.setupContributionUsd === null
              ? "Unknown"
              : `$${result.setupContributionUsd.toFixed(2)}`}{" "}
            · Monthly contribution:{" "}
            {result.monthlyContributionUsd === null
              ? "Unknown"
              : `$${result.monthlyContributionUsd.toFixed(2)}`}
          </p>
          <p className="fine-print">
            {result.label} Inputs stay in this page and are not saved.
          </p>
        </div>
      )}
      <h3>Repeat the two-market fixture rehearsal</h3>
      <p>
        Run <code>npm run pilot:fixtures</code> in the project folder. It uses
        disposable memory storage, writes labeled reports to{" "}
        <code>reports/synthetic-pilot</code>, and never changes this demo
        property. Seattle and Portland are fictional scenario labels, not
        researched markets.
      </p>
      <p>
        Human usefulness, correction time, onboarding effort and live accuracy
        remain unmeasured. The generated review template accepts explicit manual
        fixture-review observations. Cloud deployment, real
        identity/entitlement, approved research spending, verified pilot
        properties and browser acceptance remain launch gates.
      </p>
    </section>
  );
}
