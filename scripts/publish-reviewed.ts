// Explicit local operator command; Cloudflare CLI authentication stays outside source files.
// Input is an ignored JSON document: {database, scope, batch, unknowns, approvalNote}.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { ReviewedImports } from "../src/customer/reviewed-imports";
import { publishReviewedBrief } from "../src/customer/reviewed-brief";
import type { Database, Statement } from "../src/customer/store";

async function main() {
  const [file, confirm] = process.argv.slice(2);
  if (!file || confirm !== "--publish-owner-approved")
    throw new Error(
      "Provide an approved publication file and --publish-owner-approved.",
    );
  const input = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  if (
    !input.database ||
    input.scope?.dataMode !== "reviewed" ||
    !input.approvalNote
  )
    throw new Error(
      "Explicit reviewed scope, database and approval note required.",
    );
  const query = (sql: string, values: unknown[]) => {
    let index = 0;
    const bound = sql.replace(/\?/g, () => {
      const v = values[index++];
      return v === null
        ? "NULL"
        : typeof v === "number"
          ? String(v)
          : "'" + String(v).replace(/'/g, "''") + "'";
    });
    if (index !== values.length) throw new Error("Binding mismatch");
    const result = execFileSync(
      process.execPath,
      [
        resolve(
          process.env.SCOUT_WRANGLER_CLI ??
            "node_modules/wrangler/bin/wrangler.js",
        ),
        "d1",
        "execute",
        input.database,
        "--remote",
        "--config",
        "cloudflare/wrangler.toml",
        "--command",
        bound,
        "--json",
      ],
      { encoding: "utf8", maxBuffer: 8e6 },
    );
    const start = result.search(/\[\s*\{/);
    const parsed = JSON.parse(start >= 0 ? result.slice(start) : result);
    if (!parsed[0]?.success) throw new Error("D1 publication query failed");
    return parsed[0];
  };
  const db: Database = {
    prepare(sql) {
      let values: unknown[] = [];
      const s: Statement = {
        bind(...v) {
          values = v;
          return s;
        },
        async first<T>() {
          return (query(sql, values).results[0] ?? null) as T | null;
        },
        async run() {
          return query(sql, values);
        },
      };
      return s;
    },
  };
  const reviews = new ReviewedImports(db);
  const staged = await reviews.execute(input.scope, {
    operation: "stage",
    batch: input.batch,
  });
  if (staged.stale) throw new Error("Review is stale; no approval made.");
  await reviews.execute(input.scope, {
    operation: "decide",
    reviewId: staged.reviewId,
    approvalHash: staged.approvalHash,
    decision: "approved",
    note: input.approvalNote,
    evidenceReviewed: true,
    lodgingInferenceReviewed: true,
  });
  const brief = await publishReviewedBrief(
    db,
    input.scope,
    String(staged.reviewId),
    input.unknowns,
  );
  console.log(
    JSON.stringify({
      reviewId: staged.reviewId,
      briefId: brief.id,
      version: brief.version,
      findings: brief.records.length,
    }),
  );
}
main().catch(() => {
  console.error(
    "Publication stopped. Inspect scoped D1 status before retrying; no automatic retries or provider calls.",
  );
  process.exitCode = 1;
});
