import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { batch } from "../tests/helpers/customer-market";
const origin = "https://scout-findings-acceptance.parrieb.workers.dev";
const secrets = JSON.parse(
  readFileSync(".vercel/acceptance-secrets.json", "utf8"),
);
let checks = 0;
async function call(
  path: string,
  body: unknown,
  key = secrets.REVIEW_TOKEN,
  status = 200,
) {
  const r = await fetch(origin + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    redirect: "error",
  });
  const data = await r.json();
  assert.equal(
    r.status,
    status,
    `${path} ${(body as { operation?: string }).operation ?? ""} ${JSON.stringify(data.error ?? "")}`,
  );
  checks++;
  return data;
}
const decide = (r: any, decision = "approved") => ({
  operation: "decide",
  reviewId: r.reviewId,
  approvalHash: r.approvalHash,
  decision,
  note: "Synthetic hosted acceptance: source facts, dates, inference and unknowns reviewed.",
  evidenceReviewed: true,
  lodgingInferenceReviewed: true,
});
async function main() {
  const login = await call(
    "/customer",
    {
      operation: "login",
      input: {
        email: "owner@fixture.example",
        password: secrets.FIXTURE_PASSWORD,
      },
      networkKey: "reviewed-hosted-acceptance",
    },
    secrets.SERVICE_TOKEN,
  );
  const workspace = () =>
    call(
      "/customer",
      { operation: "workspace", token: login.token },
      secrets.SERVICE_TOKEN,
    );
  const before = await workspace();
  const key = "review_hosted_" + Date.now();
  const input = batch(before.marketRevision, key);
  input.observedAt = "2026-10-20T12:00:00.000Z";
  input.items = [input.items[0]];
  input.categories = ["corporate"];
  input.items[0].candidate.identity = key;
  input.items[0].candidate.name = "Fictional reviewed training campus";
  input.items[0].summary =
    "Synthetic hosted review acceptance; no real organization or lodging demand.";
  input.items[0].candidate.sources[0].publishedAt = input.observedAt.slice(
    0,
    10,
  );
  input.items[0].receipts[0].retrievedAt = input.observedAt;
  await call("/reviews", { operation: "list" }, secrets.SERVICE_TOKEN, 403);
  await call(
    "/reviews",
    { operation: "list", tenantId: "tenant_abc" },
    undefined,
    400,
  );
  await call("/reviews", {
    operation: "enroll",
    confirmPropertyId: "fixture_hotel",
  });
  await call("/reviews", {
    operation: "enroll",
    confirmPropertyId: "fixture_hotel",
  });
  const staged = await call("/reviews", { operation: "stage", batch: input });
  assert.equal(staged.status, "pending");
  assert.equal((await workspace()).findings.length, before.findings.length);
  checks += 2;
  assert.equal(
    (await call("/reviews", { operation: "stage", batch: input })).approvalHash,
    staged.approvalHash,
  );
  checks++;
  await call(
    "/reviews",
    { operation: "stage", batch: { ...input, warnings: ["changed content"] } },
    undefined,
    409,
  );
  await call(
    "/reviews",
    { ...decide(staged), approvalHash: "0".repeat(64) },
    undefined,
    409,
  );
  await call(
    "/reviews",
    { ...decide(staged), evidenceReviewed: false },
    undefined,
    400,
  );
  const rejectedInput = structuredClone(input);
  rejectedInput.batchKey = key + "_reject";
  rejectedInput.items[0].candidate.identity = key + "_reject";
  rejectedInput.items[0].candidate.name = "Fictional rejected finding";
  const rejected = await call("/reviews", {
    operation: "stage",
    batch: rejectedInput,
  });
  await call("/reviews", decide(rejected, "rejected"));
  const staleInput = structuredClone(input);
  staleInput.batchKey = key + "_stale";
  const stale = await call("/reviews", {
    operation: "stage",
    batch: staleInput,
  });
  const report = ".vercel/review-hosted-report.html";
  const cli = spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/reviewed-import.ts",
      "read",
      staged.reviewId,
      report,
    ],
    {
      env: {
        ...process.env,
        SCOUT_REVIEW_ORIGIN: origin,
        SCOUT_REVIEW_TOKEN: secrets.REVIEW_TOKEN,
      },
      encoding: "utf8",
    },
  );
  assert.equal(cli.status, 0, "Operator CLI read report");
  assert.ok(
    readFileSync(report, "utf8").includes("Fictional reviewed training campus"),
  );
  checks += 2;
  const approve = spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/reviewed-import.ts",
      "approve",
      staged.reviewId,
      staged.approvalHash,
      "Synthetic hosted acceptance: reviewed sources and lodging inference.",
    ],
    {
      env: {
        ...process.env,
        SCOUT_REVIEW_ORIGIN: origin,
        SCOUT_REVIEW_TOKEN: secrets.REVIEW_TOKEN,
      },
      encoding: "utf8",
    },
  );
  assert.equal(approve.status, 0, "Operator CLI approval");
  checks++;
  assert.equal((await call("/reviews", decide(staged))).replayed, true);
  checks++;
  await call("/reviews", decide(stale), undefined, 409);
  await call("/reviews", decide(stale, "rejected"));
  const after = await workspace();
  assert.equal(after.marketRevision, before.marketRevision + 1);
  assert.equal(after.findings.length, before.findings.length + 1);
  assert.deepEqual(after.profile, before.profile);
  checks += 3;
  const found = after.findings.find(
    (f: any) => f.title === "Fictional reviewed training campus",
  );
  assert.ok(found);
  assert.equal(found.dataMode, "synthetic");
  assert.equal(
    after.findings.some((f: any) => f.title === "Fictional rejected finding"),
    false,
  );
  checks += 3;
  for (const flag of [
    "researchEnabled",
    "paidCallsEnabled",
    "notificationsEnabled",
  ]) {
    assert.equal(after[flag], false);
    checks++;
  }
  for (const email of ["neighbor@fixture.example", "other@fixture.example"]) {
    const l = await call(
      "/customer",
      {
        operation: "login",
        input: { email, password: secrets.FIXTURE_PASSWORD },
        networkKey: "reviewed-hosted-acceptance",
      },
      secrets.SERVICE_TOKEN,
    );
    const w = await call(
      "/customer",
      { operation: "workspace", token: l.token },
      secrets.SERVICE_TOKEN,
    );
    assert.equal(w.findings.length, 0);
    checks++;
    await call(
      "/customer",
      { operation: "logout", token: l.token },
      secrets.SERVICE_TOKEN,
    );
  }
  await call("/ingestion", input, secrets.INGESTION_TOKEN, 403);
  await call(
    "/customer",
    { operation: "logout", token: login.token },
    secrets.SERVICE_TOKEN,
  );
  writeFileSync(
    ".vercel/review-hosted-result.json",
    JSON.stringify({
      checks,
      reviewId: staged.reviewId,
      approvalHash: staged.approvalHash,
      revision: after.marketRevision,
      findingId: found.id,
      title: found.title,
      report,
      origin,
    }),
  );
  console.log(
    JSON.stringify({
      checks,
      revision: after.marketRevision,
      findings: after.findings.length,
      report,
      reviewId: staged.reviewId,
    }),
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Acceptance failed");
  process.exitCode = 1;
});
