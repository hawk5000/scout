import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const exec = promisify(execFile);
const config = "cloudflare/acceptance.wrangler.toml";
assert.match(
  readFileSync(config, "utf8"),
  /database_id = "ccef2c7a-8e1d-4b32-87ba-27ac15bd7a35"/,
);
async function sql(command: string, expected = true) {
  try {
    const result = await exec(
      process.execPath,
      [
        join(process.env.APPDATA!, "npm/node_modules/wrangler/bin/wrangler.js"),
        "d1",
        "execute",
        "scout-findings-acceptance",
        "--config",
        config,
        "--remote",
        "--command",
        command,
        "--json",
      ],
      { timeout: 60000 },
    );
    if (!expected) throw Error("Expected budget rejection");
    return JSON.parse(result.stdout);
  } catch (error) {
    if (expected || !error || typeof error !== "object" || !("code" in error))
      throw Error("Hosted ledger assertion failed");
    return null;
  }
}
async function main() {
  const guard = await sql(
    "SELECT count(*) n FROM customer_properties WHERE tenant_id NOT GLOB 'fixture_*' OR property_id NOT GLOB 'fixture_*'; SELECT count(*) n FROM acceptance_marker WHERE name='synthetic-only'",
  );
  assert.equal(guard[0].results[0].n, 0);
  assert.equal(guard[1].results[0].n, 1);
  const property = "fixture_budget_" + crypto.randomUUID().replaceAll("-", "");
  await sql(
    `INSERT INTO customer_provider_limits VALUES('fixture_tenant','${property}','2026-10',10000,10000,'2026-10-21-standard-v1')`,
  );
  const insert = (job: string, key: string, amount: number) =>
    `INSERT INTO customer_provider_calls VALUES('fixture_tenant','${property}','2026-10','${job}','${key}',${amount},${amount},'reserved')`;
  // Two overlapping reservations must not each consume the same remaining money.
  const races = await Promise.allSettled([
    sql(insert("one", "a", 6000)),
    sql(insert("two", "b", 6000)),
  ]);
  assert.equal(races.filter((r) => r.status === "fulfilled").length, 1);
  const rows = (
    await sql(
      `SELECT job_id,call_key FROM customer_provider_calls WHERE property_id='${property}'`,
    )
  )[0].results;
  assert.equal(rows.length, 1);
  await sql(insert(rows[0].job_id, rows[0].call_key, 6000), false);
  await sql(
    `UPDATE customer_provider_calls SET state='unknown' WHERE property_id='${property}'`,
  );
  await sql(insert("three", "c", 5000), false);
  await sql(insert("three", "d", 4000));
  await sql(
    `UPDATE customer_provider_calls SET state='known',accounted_micros=1000 WHERE property_id='${property}' AND call_key='d'`,
  );
  await sql(insert("four", "e", 3000));
  const summary = (
    await sql(
      `SELECT sum(accounted_micros) accounted,sum(CASE WHEN state='unknown' THEN accounted_micros ELSE 0 END) unknown,count(*) calls FROM customer_provider_calls WHERE property_id='${property}'`,
    )
  )[0].results[0];
  assert.deepEqual(summary, { accounted: 10000, unknown: 6000, calls: 3 });
  const adapter = await sql(
    "SELECT state,count(*) calls FROM customer_provider_calls WHERE property_id='fixture_hotel' GROUP BY state; SELECT count(DISTINCT job_id) jobs FROM customer_provider_calls WHERE property_id='fixture_hotel'",
  );
  const result = {
    at: new Date().toISOString(),
    isolatedAcceptance: true,
    concurrentCap: true,
    duplicateDenied: true,
    unknownHoldRetained: true,
    unusedReservationReconciled: true,
    syntheticBudgetProbe: summary,
    adapterStates: adapter[0].results,
    adapterJobs: adapter[1].results[0].jobs,
    actualProviderSpendUsd: 0,
  };
  writeFileSync(
    ".vercel/pass-b-ledger-results.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
}
main().catch(() => {
  console.error(
    "Hosted ledger acceptance failed; no credentials or private payloads printed.",
  );
  process.exitCode = 1;
});
