import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../cloudflare/acceptance-worker";
import { database, adapter } from "./helpers/customer-market";
test("Pass B acceptance entrypoint persists provider replay, no network, one ledger per durable job", async () => {
  const db = database();
  for (const f of ["0005_scout_expansion.sql", "0006_provider_preparation.sql"])
    db.exec(readFileSync(`cloudflare/migrations/${f}`, "utf8"));
  db.exec(
    "CREATE TABLE acceptance_marker(name TEXT PRIMARY KEY);INSERT INTO acceptance_marker VALUES('synthetic-only')",
  );
  const env = {
    DB: adapter(db),
    SERVICE_TOKEN: "s".repeat(32),
    FIXTURE_PASSWORD: "p".repeat(32),
    ACCEPTANCE_EXPIRES_AT: new Date(Date.now() + 60000).toISOString(),
    EXPANSION_FIXTURES: "true",
  };
  const previous = globalThis.fetch;
  globalThis.fetch = async () => {
    throw Error("Network forbidden");
  };
  try {
    const call = async (body: unknown) => {
      const response = await worker.fetch(
        new Request("https://fixture.example/customer", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.SERVICE_TOKEN}` },
          body: JSON.stringify(body),
        }),
        env,
      );
      assert.equal(response.status, 200);
      return response.json() as Promise<any>;
    };
    const login = await call({
      operation: "login",
      input: { email: "owner@fixture.example", password: env.FIXTURE_PASSWORD },
      networkKey: "pass-b",
    });
    const action = (input: unknown) =>
      call({ operation: "expansion", token: login.token, input });
    const identity = {
      name: "Fictional Hotel",
      address: "1 Fictional Lane",
      domain: "hotel.example",
      locality: "Fictional Bay",
      aliases: [],
      formerNames: [],
      brand: "",
    };
    await action({
      action: "configure",
      revision: 0,
      config: {
        own: identity,
        competitors: [{ ...identity, id: "fixture_comp", active: true }],
      },
    });
    let state = await action({
      action: "start",
      requestKey: "pass-b-hosted-fixture",
      scenario: "baseline",
    });
    const job = state.jobs[0].id;
    for (let i = 0; i < 6; i++)
      state = await action({ action: "advance", jobId: job });
    assert.equal(state.jobs[0].state, "complete");
    assert.equal(state.brief.coverage.length, 5);
    const count = () =>
      Number(
        (
          db
            .prepare("SELECT count(*) n FROM customer_provider_calls")
            .get() as { n: number }
        ).n,
      );
    assert.equal(count(), 16);
    await action({
      action: "start",
      requestKey: "pass-b-hosted-fixture",
      scenario: "baseline",
    });
    await action({ action: "advance", jobId: job });
    assert.equal(count(), 16);
    assert.deepEqual(
      db
        .prepare("SELECT DISTINCT job_id FROM customer_provider_calls")
        .all()
        .map((r) => r.job_id),
      [job],
    );
    assert.equal(state.paidCallsEnabled, false);
    assert.equal(state.scheduledResearchEnabled, false);
  } finally {
    globalThis.fetch = previous;
    db.close();
  }
});
