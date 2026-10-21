"use client";
import { useState } from "react";
export function BriefingForm() {
  const [done, setDone] = useState(false);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const content = `SCOUT assisted setup brief\nHotel: ${f.get("hotel")}\nWebsite: ${f.get("website")}\nMarket: ${f.get("market")}\nWorking offer: $99 setup + $50/month per hotel\n\nPrepared locally. This is not an order and has not been submitted.\n`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "SCOUT-setup-brief.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDone(true);
  }
  return (
    <form className="brief-form" onSubmit={submit}>
      <h3>Start with your hotel.</h3>
      <p>
        Prepare an assisted-setup brief to keep. Nothing is submitted or charged
        in this build.
      </p>
      <label>
        Hotel name
        <input name="hotel" required maxLength={200} placeholder="Your hotel" />
      </label>
      <label>
        Hotel website
        <input
          name="website"
          type="url"
          required
          maxLength={300}
          placeholder="https://"
        />
      </label>
      <label>
        City / market
        <input
          name="market"
          required
          maxLength={200}
          placeholder="Your local market"
        />
      </label>
      <button className="button primary" type="submit">
        Download my setup brief
      </button>
      {done && <p role="status">Your brief is ready. No request was sent.</p>}
    </form>
  );
}
