import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const origin = "https://scout-findings-acceptance.parrieb.workers.dev";
const secrets = JSON.parse(
  readFileSync(".vercel/acceptance-secrets.json", "utf8"),
);
let checks = 0;
async function call(body: unknown, status = 200) {
  const r = await fetch(origin + "/customer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secrets.SERVICE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    redirect: "error",
  });
  const data = await r.json();
  assert.equal(
    r.status,
    status,
    `${(body as { operation: string }).operation}: ${data.error ?? "unexpected status"}`,
  );
  checks++;
  return data;
}
async function login(email: string) {
  return call({
    operation: "login",
    input: { email, password: secrets.FIXTURE_PASSWORD },
    networkKey: "expansion-hosted-acceptance",
  });
}
async function main() {
  const owner = await login("owner@fixture.example");
  const action = (input: unknown, status = 200) =>
    call({ operation: "expansion", token: owner.token, input }, status);
  const before = await call({ operation: "workspace", token: owner.token });
  let state = await action({ action: "read" });
  assert.equal(state.fixturesEnabled, true);
  const config = {
    own: {
      name: "Fictional Harbor Hotel",
      address: "10 Fictional Lane",
      locality: "Fictional Bay",
      domain: "harbor.example",
      aliases: ["Harbor Fictional Hotel"],
      formerNames: [],
      brand: "",
    },
    competitors: [
      {
        id: "fixture-ridge",
        name: "Fictional Ridge Hotel",
        address: "20 Fictional Lane",
        locality: "Fictional Bay",
        domain: "ridge.example",
        aliases: [],
        formerNames: [],
        brand: "",
        active: true,
      },
    ],
  };
  state = await action({
    action: "configure",
    revision: state.revision,
    config,
  });
  const prefix = crypto.randomUUID();
  async function finish(current: any) {
    for (let i = 0; i < 8; i++) {
      const job = current.jobs.find((j: any) =>
        ["queued", "running"].includes(j.state),
      );
      if (!job) return current;
      current = await action({ action: "advance", jobId: job.id });
    }
    throw Error("Job did not finish within bounded steps");
  }
  state = await finish(
    await action({
      action: "start",
      scenario: "baseline",
      requestKey: prefix + "_baseline",
    }),
  );
  assert.ok(["complete", "no-change"].includes(state.brief.status));
  const first = state.brief;
  assert.equal(first.coverage.length, 5);
  assert.ok(first.connections.length);
  for (const section of first.sections)
    for (const item of section.items) {
      const record = first.records.find((r: any) => r.id === item.findingId);
      assert.ok(record);
      assert.ok(
        item.evidenceIds.every((id: string) =>
          record.evidence.some((e: any) => e.id === id),
        ),
      );
      checks++;
    }
  const starts = await Promise.all([
    action({
      action: "start",
      scenario: "quiet",
      requestKey: prefix + "_quiet1",
    }),
    action({
      action: "start",
      scenario: "quiet",
      requestKey: prefix + "_quiet2",
    }),
  ]);
  assert.equal(starts[0].jobs[0].id, starts[1].jobs[0].id);
  state = await finish(starts[0]);
  assert.equal(state.brief.status, "no-change");
  assert.equal(state.budget.held, 0);
  state = await finish(
    await action({
      action: "start",
      scenario: "partial",
      requestKey: prefix + "_partial",
    }),
  );
  assert.equal(state.brief.status, "partial");
  assert.equal(
    state.brief.coverage.find((c: any) => c.category === "competitor").status,
    "failed",
  );
  const partialId = state.brief.id;
  state = await finish(
    await action({
      action: "start",
      scenario: "failed",
      requestKey: prefix + "_failed",
    }),
  );
  assert.equal(state.jobs[0].state, "failed");
  assert.equal(state.brief.id, partialId);
  assert.equal(state.budget.held, 0);
  state = await action({ action: "read", briefId: first.id });
  assert.deepEqual(state.brief, first);
  for (const email of ["neighbor@fixture.example", "other@fixture.example"]) {
    const user = await login(email);
    await call(
      {
        operation: "expansion",
        token: user.token,
        input: { action: "read", briefId: first.id },
      },
      404,
    );
    await call(
      {
        operation: "expansion",
        token: user.token,
        input: { action: "advance", jobId: first.jobId },
      },
      404,
    );
    await call({ operation: "logout", token: user.token });
  }
  const viewer = await login("viewer@fixture.example");
  await call(
    {
      operation: "expansion",
      token: viewer.token,
      input: { action: "configure", revision: state.revision, config },
    },
    403,
  );
  await call({ operation: "logout", token: viewer.token });
  const after = await call({ operation: "workspace", token: owner.token });
  assert.deepEqual(after.profile, before.profile);
  assert.deepEqual(after.coverage, before.coverage);
  assert.equal(after.revision, before.revision);
  for (const old of before.findings) {
    const current = after.findings.find((f: any) => f.id === old.id);
    assert.deepEqual(current, old);
  }
  assert.equal(after.researchEnabled, false);
  assert.equal(after.paidCallsEnabled, false);
  assert.equal(after.notificationsEnabled, false);
  await call({ operation: "logout", token: owner.token });
  const again = await login("owner@fixture.example");
  const persisted = await call({
    operation: "expansion",
    token: again.token,
    input: { action: "read", briefId: first.id },
  });
  assert.deepEqual(persisted.brief, first);
  await call({ operation: "logout", token: again.token });
  const result = {
    at: new Date().toISOString(),
    checks,
    complete: true,
    baselineBrief: first.id,
    partialBrief: partialId,
    existingFixtureFindingsPreserved: before.findings.length,
    liveResearch: false,
    paidCalls: false,
    notifications: false,
  };
  writeFileSync(
    ".vercel/expansion-hosted-results.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
}
main().catch(() => {
  console.error(
    "Hosted expansion acceptance failed. No credentials or response bodies printed.",
  );
  process.exitCode = 1;
});
