import type { Brief } from "./expansion-contracts";
import { csvCell } from "../lib/export";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function sourceLink(url: string, label: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return escapeHtml(label);
    return `<a href="${escapeHtml(parsed.href)}">${escapeHtml(label)}</a>`;
  } catch {
    return escapeHtml(label);
  }
}

export function briefingText(b: Brief) {
  return [
    `SCOUT Briefing ${b.version} - ${b.status.toUpperCase()}`,
    b.mode === "synthetic"
      ? "FICTIONAL SYNTHETIC FIXTURE - no live research"
      : "Reviewed public-source research - approved for this hotel",
    `As of ${b.generatedAt}`,
    ...b.coverage.map(
      (o) =>
        `${o.category}: ${o.status}. ${o.message} Last success: ${o.lastSuccessAt ?? "None"}`,
    ),
    ...b.sections.flatMap((s) => [
      "",
      s.heading,
      ...s.items.map(
        (i) =>
          `${i.ongoing ? "Ongoing context: " : ""}${i.statement}\nImplication (inference): ${i.implication}\nUnknowns: ${i.unknowns.join("; ")}\nSources: ${b.records
            .find((r) => r.id === i.findingId)!
            .evidence.filter((e) => i.evidenceIds.includes(e.id))
            .map(
              (e) =>
                `${e.url} (published ${e.publishedAt ?? "unknown"}, retrieved ${e.retrievedAt})`,
            )
            .join("; ")}`,
      ),
    ]),
    ...b.connections.map((c) => c.explanation),
    "",
    ...b.unknowns,
    b.cost.provider === "fixture"
      ? `Actual charge: $0. Fixture units used: ${b.cost.usedFixtureUnits}.`
      : "Publication charge: $0. Research usage is recorded separately; no new provider call.",
  ].join("\n");
}

/** Self-contained report markup suitable for opening, printing or saving as PDF. */
export function briefingHtml(b: Brief) {
  const sections = b.sections
    .map(
      (section) => `<section>
        <h2>${escapeHtml(section.heading)}</h2>
        ${section.items
          .map((item) => {
            const record = b.records.find((r) => r.id === item.findingId);
            if (!record) return "";
            const evidence = record.evidence.filter((e) =>
              item.evidenceIds.includes(e.id),
            );
            return `<article class="finding">
              <p class="finding-meta">${item.ongoing ? "Ongoing context · " : ""}${escapeHtml(record.title)} · Finding version ${item.version}${record.factPublishedAt ? ` · Published ${escapeHtml(record.factPublishedAt)}` : ""}</p>
              <h3>${escapeHtml(item.statement)}</h3>
              <h4>Why it may matter</h4><p>${escapeHtml(item.implication)}</p>
              <h4>What remains unknown</h4><ul>${item.unknowns.map((unknown) => `<li>${escapeHtml(unknown)}</li>`).join("")}</ul>
              <h4>Evidence</h4><ul>${evidence
                .map(
                  (source) =>
                    `<li>${sourceLink(source.url, source.url)} <span class="muted">· published ${escapeHtml(source.publishedAt ?? "date unavailable")} · retrieved ${escapeHtml(source.retrievedAt)}</span></li>`,
                )
                .join("")}</ul>
            </article>`;
          })
          .join("")}
      </section>`,
    )
    .join("");
  const coverage = b.coverage
    .map(
      (item) =>
        `<tr><th scope="row">${escapeHtml(item.category)}</th><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.message)}</td><td>${escapeHtml(item.lastSuccessAt ?? "No previous successful check")}</td></tr>`,
    )
    .join("");
  const connections = b.connections.length
    ? `<section><h2>Related developments</h2><ul>${b.connections
        .map((connection) => {
          const titles = connection.findingIds
            .map((id) => b.records.find((record) => record.id === id)?.title)
            .filter((title): title is string => Boolean(title));
          return `<li><strong>${titles.map(escapeHtml).join(" + ")}</strong> — ${escapeHtml(connection.explanation)}</li>`;
        })
        .join("")}</ul></section>`
    : "";
  const unknowns = b.unknowns.length
    ? `<section><h2>Briefing-wide unknowns</h2><ul>${b.unknowns
        .map((unknown) => `<li>${escapeHtml(unknown)}</li>`)
        .join("")}</ul></section>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SCOUT Briefing ${b.version}</title>
<style>
:root{color-scheme:light;--forest:#173f32;--ink:#202a25;--muted:#657168;--line:#d8dfd8;--gold:#8a6a27;--paper:#fffefa}*{box-sizing:border-box}body{margin:0;background:#edf0eb;color:var(--ink);font:15px/1.58 Arial,Helvetica,sans-serif}.report{max-width:900px;margin:32px auto;padding:52px 64px;background:var(--paper);box-shadow:0 8px 32px #10251a1a}.brand{color:var(--forest);font:700 14px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}.brand span{display:block;margin-top:2px;color:var(--muted);font-size:10px;letter-spacing:.04em;text-transform:none}h1,h2,h3{line-height:1.2}h1{margin:.4rem 0;color:var(--forest);font:500 38px/1.12 Georgia,serif}h2{margin:2.2rem 0 1rem;padding-bottom:.45rem;border-bottom:2px solid var(--forest);color:var(--forest);font:500 25px Georgia,serif}h3{font-size:18px}h4{margin:1rem 0 .2rem;color:var(--forest);font-size:12px;letter-spacing:.04em;text-transform:uppercase}p{margin:.35rem 0 .7rem}.lede{max-width:680px;color:var(--muted)}.meta{display:flex;flex-wrap:wrap;gap:8px;margin:1.2rem 0;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.pill{padding:4px 9px;border-radius:99px;background:#eaf1ec;color:var(--forest);font-size:12px;font-weight:700}.notice{padding:12px 15px;border-left:4px solid var(--gold);background:#f5f0e2;color:#46391c;font-size:13px}.finding{margin:1rem 0;padding:20px 22px;border:1px solid var(--line);border-radius:8px;break-inside:avoid}.finding-meta,.muted{color:var(--muted);font-size:12px}.finding-meta{font-weight:700}.finding ul,section>ul{padding-left:1.3rem}a{color:#14523e;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}th{color:var(--forest)}.footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--muted);font-size:11px}@media(max-width:650px){.report{margin:0;padding:28px 20px;box-shadow:none}h1{font-size:32px}.meta{gap:6px}table{font-size:10px}th,td{padding:6px}}@media print{body{background:white;font-size:11pt}.report{max-width:none;margin:0;padding:12mm 14mm;box-shadow:none}h2{break-after:avoid}.finding{break-inside:avoid}a{color:inherit;text-decoration:none}a[href^="http"]::after{content:" (" attr(href) ")";font-size:9pt;overflow-wrap:anywhere}@page{margin:12mm}}
</style></head><body><main class="report">
<header><div class="brand">SCOUT<span>by SalesHospitality · Your hotel’s market research assistant</span></div>
<h1>Market briefing</h1><p class="lede">An evidence-linked view of developments that may matter to your hotel’s sales work.</p>
<div class="meta"><span class="pill">${escapeHtml(b.status)}</span><span>Briefing version ${b.version}</span><span>Prepared ${escapeHtml(new Date(b.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }))} UTC</span></div>
<p class="notice">${b.mode === "synthetic" ? "<strong>Fictional synthetic sample.</strong> This report uses isolated demo fixtures and is not the result of live research. Actual research charge: $0." : "<strong>Reviewed public-source research.</strong> Approved for this hotel. Publication made no provider call. Research usage is recorded separately."}</p></header>
<section><h2>Research coverage</h2><table><thead><tr><th>Area</th><th>Outcome</th><th>Coverage note</th><th>Last successful check</th></tr></thead><tbody>${coverage}</tbody></table></section>
${sections}${connections}${unknowns}
<footer class="footer">SCOUT Briefing ${b.version} · ${b.cost.provider === "fixture" ? `Fixture units used: ${b.cost.usedFixtureUnits}` : "Reviewed publication; no new provider call"} · Evidence links and dates are preserved from the stored snapshot.</footer>
</main></body></html>`;
}

export function briefingCsv(b: Brief) {
  return (
    "\ufeff" +
    [
      [
        "brief_version",
        "status",
        "as_of",
        "section",
        "finding_id",
        "finding_version",
        "ongoing_context",
        "observed_facts",
        "implication_inference",
        "unknowns",
        "sources",
        "mode",
      ],
      ...b.sections.flatMap((s) =>
        s.items.map((i) => [
          b.version,
          b.status,
          b.generatedAt,
          s.heading,
          i.findingId,
          i.version,
          i.ongoing,
          i.statement,
          i.implication,
          i.unknowns.join("; "),
          b.records
            .find((r) => r.id === i.findingId)!
            .evidence.filter((e) => i.evidenceIds.includes(e.id))
            .map((e) => e.url)
            .join("; "),
          b.mode === "synthetic"
            ? "FICTIONAL SYNTHETIC FIXTURE"
            : "REVIEWED PUBLIC SOURCES",
        ]),
      ),
    ]
      .map((row) => row.map((v) => csvCell(String(v))).join(","))
      .join("\r\n")
  );
}
