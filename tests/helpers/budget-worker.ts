import { DatabaseSync } from "node:sqlite";
import { ResearchStore } from "../../src/research/store";
const [path, tenant, property, operation] = process.argv.slice(2);
const db = new DatabaseSync(path);
db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
try {
  new ResearchStore(db, { tenant_id: tenant, property_id: property }).reserve(
    "parallel-budget",
    operation,
    "project",
    "2026-10",
    300,
    { run: 300, month: 300 },
  );
  process.stdout.write("reserved");
} catch (error) {
  if (
    error instanceof Error &&
    error.message === "Synthetic budget limit reached."
  )
    process.stdout.write("blocked");
  else {
    process.stderr.write("Unexpected worker failure");
    process.exitCode = 1;
  }
} finally {
  db.close();
}
