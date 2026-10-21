import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { batch } from "../tests/helpers/customer-market";
const secrets = JSON.parse(
  readFileSync(".vercel/acceptance-secrets.json", "utf8"),
);
const origin = "https://scout-findings-acceptance.parrieb.workers.dev";
let checks = 0;
async function call(
  path: string,
  body: unknown,
  token = secrets.SERVICE_TOKEN,
  expected = 200,
) {
  const response = await fetch(origin + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, expected, `${path} status`);
  checks++;
  return response.json() as Promise<any>;
}
const login = async (email = "owner@fixture.example") =>
  call("/customer", {
    operation: "login",
    input: { email, password: secrets.FIXTURE_PASSWORD },
    networkKey: "hosted-fixture-acceptance",
  });
async function main() {
  const base = batch(0, "hosted_baseline_20261021");
  await call("/ingestion", base, secrets.SERVICE_TOKEN, 403);
  await call("/ingestion", base, secrets.INGESTION_TOKEN);
  assert.equal(
    (await call("/ingestion", base, secrets.INGESTION_TOKEN)).replayed,
    true,
  );
  checks++;
  const quiet = batch(1, "hosted_quiet_20261021");
  await call("/ingestion", quiet, secrets.INGESTION_TOKEN);
  const changed = batch(2, "hosted_changed_20261021");
  changed.items[0].candidate.facts.end = "2026-12-01";
  changed.items[0].candidate.sources[0].publishedAt = "2026-10-12";
  changed.items[0].candidate.sources[0].claims.find(
    (c) => c.field === "end",
  )!.quote = "2026-12-01";
  changed.items[0].receipts[0].retrievedAt = changed.observedAt;
  await call("/ingestion", changed, secrets.INGESTION_TOKEN);
  const stale = batch(0, "hosted_stale_20261021");
  await call("/ingestion", stale, secrets.INGESTION_TOKEN, 409);
  await call(
    "/ingestion",
    { ...batch(3, "hosted_forged_20261021"), tenantId: "tenant_abc" },
    secrets.INGESTION_TOKEN,
    400,
  );
  const owner = await login();
  const token = owner.token;
  let ws = await call("/customer", { operation: "workspace", token });
  assert.equal(ws.findings.length, 3);
  assert.equal(ws.marketRevision, 3);
  assert.equal(ws.runs.length, 3);
  assert.equal(ws.findings[0].versions.length, 2);
  checks += 4;
  assert.equal(ws.researchEnabled, false);
  assert.equal(ws.paidCallsEnabled, false);
  assert.equal(ws.notificationsEnabled, false);
  checks++;
  const findingId = ws.findings[0].id;
  const input = {
    findingId,
    revision: ws.findings[0].stateRevision,
    saved: true,
    dismissed: true,
  };
  ws = await call("/customer", { operation: "finding-state", token, input });
  await call(
    "/customer",
    { operation: "finding-state", token, input },
    secrets.SERVICE_TOKEN,
    409,
  );
  for (const email of ["neighbor@fixture.example", "other@fixture.example"]) {
    const other = await login(email);
    const result = await call("/customer", {
      operation: "workspace",
      token: other.token,
    });
    assert.equal(result.findings.length, 0);
    checks++;
    await call(
      "/customer",
      { operation: "finding-state", token: other.token, input },
      secrets.SERVICE_TOKEN,
      404,
    );
    await call("/customer", { operation: "logout", token: other.token });
  }
  const viewer = await login("viewer@fixture.example");
  await call(
    "/customer",
    { operation: "finding-state", token: viewer.token, input },
    secrets.SERVICE_TOKEN,
    403,
  );
  await call("/customer", { operation: "logout", token: viewer.token });
  await call("/customer", { operation: "logout", token });
  await call(
    "/customer",
    { operation: "workspace", token },
    secrets.SERVICE_TOKEN,
    401,
  );
  const again = await login();
  ws = await call("/customer", { operation: "workspace", token: again.token });
  assert.equal(ws.findings[0].saved, true);
  assert.equal(ws.findings[0].dismissed, true);
  checks += 2;
  await call("/customer", {
    operation: "finding-state",
    token: again.token,
    input: {
      findingId,
      revision: ws.findings[0].stateRevision,
      saved: false,
      dismissed: false,
    },
  });
  await call("/customer", { operation: "logout", token: again.token });
  writeFileSync(
    ".vercel/hosted-worker-results.json",
    JSON.stringify({
      checks,
      findings: 3,
      cycles: 3,
      revision: 3,
      mode: "synthetic",
      productionTouched: false,
    }),
  );
  console.log({
    checks,
    findings: 3,
    cycles: 3,
    revision: 3,
    mode: "synthetic",
    productionTouched: false,
  });
}
void main();
