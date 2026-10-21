import path from "node:path";
import { existsSync } from "node:fs";
import { DemoRepository } from "../src/server/repository";
import { claimJob, processJob } from "../src/research/subscription";

if (
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.SCOUT_LIVE_RESEARCH === "true"
)
  throw Error("Fixture worker is local-only. Live activity is disabled.");
const file = path.join(process.cwd(), "local-data", "scout-demo.sqlite");
if (!existsSync(file))
  throw Error("Open a local fictional demo and queue a job first.");
const repository = new DemoRepository(file);
let count = 0;
try {
  // Explicit, finite drain. No daemon, cron, network client or delivery sender.
  for (; count < 20; count++) {
    const job = claimJob(repository.db);
    if (!job) break;
    processJob(repository.db, job);
  }
  console.log(
    `Fixture worker stopped after ${count} attempts. No live research or messages. Refresh Administrator setup to inspect outcomes.`,
  );
} finally {
  repository.close();
}
