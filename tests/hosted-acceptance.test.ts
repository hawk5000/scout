import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare/acceptance-worker";
import { database, adapter, provision } from "./helpers/customer-market";
test("hosted acceptance fails closed without expiry, marker or fixture-only database; production entrypoint has no fallback", async () => {
  const db = database();
  const env = {
    DB: adapter(db),
    SERVICE_TOKEN: "s".repeat(32),
    FIXTURE_PASSWORD: "p".repeat(32),
    ACCEPTANCE_EXPIRES_AT: new Date(Date.now() + 60000).toISOString(),
  };
  const request = () =>
    new Request("https://acceptance.example/customer", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.SERVICE_TOKEN}` },
      body: JSON.stringify({
        operation: "login",
        input: {
          email: "owner@fixture.example",
          password: env.FIXTURE_PASSWORD,
        },
        networkKey: "test",
      }),
    });
  try {
    assert.equal(
      (
        await worker.fetch(request(), {
          ...env,
          ACCEPTANCE_EXPIRES_AT: "invalid",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await worker.fetch(request(), {
          ...env,
          ACCEPTANCE_EXPIRES_AT: "2000-01-01T00:00:00.000Z",
        })
      ).status,
      403,
    );
    assert.equal((await worker.fetch(request(), env)).status, 403);
    db.exec(
      "CREATE TABLE acceptance_marker(name TEXT PRIMARY KEY); INSERT INTO acceptance_marker VALUES('synthetic-only')",
    );
    assert.equal((await worker.fetch(request(), env)).status, 200);
    provision(db, "tenant_real", "property_real", "real_user");
    assert.equal((await worker.fetch(request(), env)).status, 403);
    const production = (await import("../cloudflare/customer/worker")).default;
    assert.equal((await production.fetch(request(), env)).status, 503);
  } finally {
    db.close();
  }
});
