"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
export function DemoEntry({
  label = "Explore the fictional demo",
}: {
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function enter() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/demo/session", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      window.location.assign("/demo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open demo.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button primary" onClick={enter} disabled={busy}>
        {busy ? "Opening demo…" : label}
        <ArrowRight size={17} />
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
