import { ingestionSchema, storedMarket } from "./market-contracts";
export function renderReviewReport(data: Record<string, unknown>) {
  const escape = (v: unknown) =>
    String(v ?? "Unknown").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  const batch = ingestionSchema.parse(data.batch),
    proposed = storedMarket.parse(data.proposed);
  const before = storedMarket.parse(data.before);
  const section = (label: string, v: unknown) =>
    `<h2>${label}</h2><pre>${escape(JSON.stringify(v, null, 2))}</pre>`;
  const run = proposed.runs.at(-1)!;
  const changed = new Set([...run.newIds, ...run.changedIds]);
  const cards = proposed.records
    .map((r) => {
      const old = before.records.find((b) => b.id === r.id),
        a = proposed.assessments[r.id];
      const facts = Object.entries(r.facts)
        .map(
          ([key, v]) =>
            `<tr><th>${escape(key)}</th><td>${escape(JSON.stringify(old?.facts[key as keyof typeof r.facts] ?? null))}</td><td>${escape(JSON.stringify(v))}</td></tr>`,
        )
        .join("");
      return `<article><h2>${escape(r.title)}</h2><p>${changed.has(r.id) ? (old ? "Material facts changed" : "New finding") : "No material fact change"} · ${escape(r.location)} · ${escape(r.categories.join(", "))}</p><p>${escape(r.summary)}</p><table><thead><tr><th>Fact</th><th>Current</th><th>Proposed</th></tr></thead><tbody>${facts}</tbody></table><h3>Lodging relevance — inference</h3><p>${escape(a.inference)}</p><p>${escape(a.rationale)}</p><h3>Unknowns</h3><ul>${a.unknowns.map((u) => `<li>${escape(u)}</li>`).join("")}</ul><h3>Evidence</h3>${r.evidence.map((e) => `<p>${escape(e.publisher)} — ${escape(e.url)}<br>Published: ${escape(e.publishedAt)} · Retrieved: ${escape(e.retrievedAt)}</p><ul>${e.claims.map((c) => `<li><strong>${escape(c.field)}</strong>: ${escape(c.quote)}</li>`).join("")}</ul>`).join("")}</article>`;
    })
    .join("");
  const {
    batch: _batch,
    before: _before,
    proposed: _proposed,
    ...summary
  } = data;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>SCOUT import review</title><style>body{font:16px/1.6 system-ui;background:#faf8f2;color:#182a23;max-width:1100px;margin:40px auto;padding:24px}pre,article{white-space:pre-wrap;overflow-wrap:anywhere;background:white;padding:20px;border:1px solid #ccd5ce;margin:20px 0}h1,h2{color:#164b38}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #ccd5ce;padding:8px}</style><h1>Review findings before publication</h1><p>This report cannot approve an import. Check source quotations and dates against your prepared evidence, distinguish facts from lodging inference, and review unknowns. SCOUT has not fetched or independently verified sources. Approval publishes the saved proposal only if its market revision still matches.</p>${section("Scope, decision and change summary", summary)}${cards}<details><summary>Complete submitted evidence and exact proposed snapshot</summary>${section("Submitted batch", batch)}${section("Current market at report time", before)}${section("Exact proposed market", proposed)}</details></html>`;
}
