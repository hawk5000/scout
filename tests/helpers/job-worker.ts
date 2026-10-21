import { DemoRepository } from "../../src/server/repository";
import { claimJob, processJob } from "../../src/research/subscription";
const repo = new DemoRepository(process.argv[2]);
const job = claimJob(repo.db);
if (job) {
  const success = processJob(repo.db, job, {
    checkpoint(stage) {
      if (stage === process.argv[3]) process.exit(73);
    },
  });
  console.log(success ? "completed" : "failed");
} else console.log("idle");
repo.close();
