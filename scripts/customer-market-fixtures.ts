import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  database,
  adapter,
  scope,
  batch,
  auth,
} from "../tests/helpers/customer-market";
import { MarketIngestion } from "../src/customer/ingestion";
import { CustomerStore } from "../src/customer/store";
// Only a newly-created temporary SQLite file. No env file, remote DB or network transport.
async function main() {
  const dir = mkdtempSync(join(tmpdir(), "scout-isolated-market-"));
  const db = database(join(dir, "fixture.sqlite"));
  try {
    const ingestion = new MarketIngestion(adapter(db));
    const initial = batch();
    await ingestion.ingest(scope, initial);
    await ingestion.ingest(scope, initial);
    await ingestion.ingest(scope, { ...batch(1, "fixture_quiet"), items: [] });
    const store = new CustomerStore(adapter(db), auth());
    const { token } = await store.login(
      "fixture@example.com",
      "synthetic-test-only",
      "fixture",
    );
    const w = await store.workspace(token);
    console.log(
      JSON.stringify(
        {
          mode: w.marketMode,
          findings: w.findings.length,
          runs: w.runs.length,
          revision: w.marketRevision,
          research: w.researchEnabled,
          paidCalls: w.paidCallsEnabled,
          notifications: w.notificationsEnabled,
          storage: "temporary isolated SQLite; removed after run",
        },
        null,
        2,
      ),
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
void main();
