import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../cloudflare/acceptance-worker";
import { database, adapter } from "./helpers/customer-market";
test("hosted Pass C acceptance endpoint uses synthetic providers and review workflow only", async () => {
  const db = database();
  for (const f of [
    "0004_reviewed_imports.sql",
    "0005_scout_expansion.sql",
    "0014_reviewed_brief_publication.sql",
    "0006_provider_preparation.sql",
    "0007_pilot_dispatch.sql",
  ])
    db.exec(readFileSync(`cloudflare/migrations/${f}`, "utf8"));
  db.exec(
    "CREATE TABLE acceptance_marker(name TEXT PRIMARY KEY);INSERT INTO acceptance_marker VALUES('synthetic-only')",
  );
  const env = {
    DB: adapter(db),
    SERVICE_TOKEN: "s".repeat(40),
    FIXTURE_PASSWORD: "p".repeat(40),
    ACCEPTANCE_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
    EXPANSION_FIXTURES: "true",
  };
  const call = async (path: string, body: unknown, authorized = true) =>
    worker.fetch(
      new Request(`https://fixture.example${path}`, {
        method: "POST",
        headers: {
          ...(authorized
            ? { Authorization: `Bearer ${env.SERVICE_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(body),
      }),
      env,
    );
  try {
    const login = await call("/customer", {
      operation: "login",
      input: { email: "owner@fixture.example", password: env.FIXTURE_PASSWORD },
      networkKey: "pass-c-hosted",
    });
    assert.equal(login.status, 200);
    const session = (await login.json()) as { token: string };
    const run = await call("/pilot", {
      operation: "run",
      token: session.token,
      requestKey: "hosted_baseline",
    });
    assert.equal(run.status, 200);
    const result = (await run.json()) as {
      id: string;
      state: string;
      review: string;
      outcomes: { category: string }[];
    };
    assert.equal(result.state, "pending-review");
    assert.equal(result.review, "pending");
    assert.equal(result.outcomes.length, 5);
    const reviewResponse = await call("/pilot", {
      operation: "review",
      token: session.token,
      reviewId: result.id,
    });
    assert.equal(reviewResponse.status, 200);
    const review = (await reviewResponse.json()) as {
      approvalHash: string;
      findings: number;
    };
    assert.ok(review.approvalHash);
    assert.ok(review.findings > 0);
    assert.equal(
      (db.prepare("SELECT revision FROM customer_markets").get() as any)
        .revision,
      0,
    );
    const approve = await call("/pilot", {
      operation: "review",
      token: session.token,
      reviewId: result.id,
      approvalHash: review.approvalHash,
      decision: "approved",
    });
    assert.equal(approve.status, 200);
    assert.equal(
      (db.prepare("SELECT revision FROM customer_markets").get() as any)
        .revision,
      1,
    );
    const replay = await call("/pilot", {
      operation: "run",
      token: session.token,
      requestKey: "hosted_baseline",
    });
    assert.equal(replay.status, 200);
    assert.equal(((await replay.json()) as { id: string }).id, result.id);
    const second = await call("/pilot", {
      operation: "run",
      token: session.token,
      requestKey: "hosted_followup",
    });
    assert.equal(second.status, 200);
    const secondResult = (await second.json()) as { id: string; state: string };
    assert.equal(secondResult.state, "pending-review");
    const secondReview = (await (
      await call("/pilot", {
        operation: "review",
        token: session.token,
        reviewId: secondResult.id,
      })
    ).json()) as { approvalHash: string };
    await call("/pilot", {
      operation: "review",
      token: session.token,
      reviewId: secondResult.id,
      approvalHash: secondReview.approvalHash,
      decision: "rejected",
    });
    const third = await call("/pilot", {
      operation: "run",
      token: session.token,
      requestKey: "hosted_third",
    });
    assert.equal(third.status, 403);
    const noService = await call(
      "/pilot",
      { operation: "status", token: session.token, jobId: result.id },
      false,
    );
    assert.equal(noService.status, 403);
    const tables = db
      .prepare("SELECT count(*) n FROM customer_provider_calls")
      .get() as { n: number };
    assert.ok(tables.n > 0);
    assert.equal(
      (
        (await (
          await call("/pilot", {
            operation: "status",
            token: session.token,
            jobId: result.id,
          })
        ).json()) as any
      ).paidCallsEnabled,
      false,
    );
  } finally {
    db.close();
  }
});
