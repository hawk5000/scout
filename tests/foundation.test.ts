import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DemoRepository, tokenHash } from "../src/server/repository";
import {
  assertSameOrigin,
  demoEnabled,
  rejectScopeOverride,
} from "../src/server/access";
import { demoProfile } from "../src/lib/fixtures";
import {
  filterFindings,
  filtersSchema,
  profileSchema,
  mutationSchema,
} from "../src/lib/contracts";
import { csvCell, csvColumns, toBrief, toCsv } from "../src/lib/export";

test("production and cloud access fail closed, even with demo flag", () => {
  assert.equal(demoEnabled({}), false);
  assert.equal(demoEnabled({ SCOUT_DEMO_ENABLED: "true" }), true);
  for (const env of [
    { VERCEL: "1" },
    { VERCEL_ENV: "production" },
    { VERCEL_ENV: "preview" },
  ])
    assert.equal(demoEnabled({ SCOUT_DEMO_ENABLED: "true", ...env }), false);
});
test("session identity is unguessable, expires, and cannot be supplied as property parameters", () => {
  const repo = new DemoRepository(":memory:");
  try {
    assert.throws(() => repo.read(""), /demo/);
    assert.throws(() => repo.read("a".repeat(64)), /expired/);
    const token = repo.createSession(Date.now() - 8 * 24 * 3600 * 1000);
    assert.throws(() => repo.read(token), /expired/);
    assert.throws(
      () => rejectScopeOverride(new URLSearchParams("tenant_id=other"), ["q"]),
      /Unsupported/,
    );
    assert.throws(() =>
      mutationSchema.parse({
        action: "state",
        findingId: "corporate-alder",
        saved: true,
        dismissed: false,
        propertyId: "other",
      }),
    );
  } finally {
    repo.close();
  }
});
test("private state, profile, coverage and exports stay isolated across tenants", () => {
  const repo = new DemoRepository(":memory:");
  try {
    const a = repo.createSession(),
      b = repo.createSession();
    assert.notEqual(a, b);
    repo.mutate(a, {
      action: "state",
      findingId: "corporate-alder",
      saved: true,
      dismissed: true,
    });
    repo.mutate(a, {
      action: "profile",
      profile: {
        ...demoProfile,
        name: "PRIVATE HOTEL A",
        priorities: ["PRIVATE PRIORITY"],
      },
    });
    repo.mutate(a, {
      action: "coverage",
      category: "corporate",
      notes: "PRIVATE COVERAGE",
      paused: false,
    });
    const wa = repo.read(a),
      wb = repo.read(b);
    assert.equal(wa.findings[0].saved, true);
    assert.equal(wb.findings[0].saved, false);
    assert.equal(wb.findings[0].dismissed, false);
    assert.equal(wb.profile.name, demoProfile.name);
    assert.notEqual(wb.coverage.corporate.notes, "PRIVATE COVERAGE");
    assert.equal(toCsv(wb.findings).includes("PRIVATE"), false);
    assert.throws(
      () =>
        repo.mutate(b, {
          action: "state",
          findingId: "other-property-finding",
          saved: true,
          dismissed: false,
        }),
      /not found/,
    );
    assert.equal(
      repo.db
        .prepare("SELECT token_hash FROM sessions WHERE token_hash=?")
        .get(a),
      undefined,
    );
    assert.ok(
      repo.db
        .prepare("SELECT token_hash FROM sessions WHERE token_hash=?")
        .get(tokenHash(a)),
    );
  } finally {
    repo.close();
  }
});
test("private property state stays isolated for two properties inside the same tenant", () => {
  const repo = new DemoRepository(":memory:");
  try {
    const a = repo.createSession();
    const c = repo.db
      .prepare("SELECT tenant_id FROM sessions WHERE token_hash=?")
      .get(tokenHash(a)) as { tenant_id: string };
    repo.db
      .prepare("INSERT INTO properties VALUES(?,?,?,?,0)")
      .run(
        c.tenant_id,
        "second-property",
        JSON.stringify(demoProfile),
        JSON.stringify(repo.read(a).coverage),
      );
    const second = "b".repeat(64);
    repo.db
      .prepare("INSERT INTO sessions VALUES(?,?,?,?,?)")
      .run(
        tokenHash(second),
        c.tenant_id,
        "second-property",
        Date.now() + 100000,
        "demo_admin",
      );
    assert.equal(repo.read(second).findings.length, 0);
    assert.throws(
      () =>
        repo.mutate(second, {
          action: "state",
          findingId: "corporate-alder",
          saved: true,
          dismissed: false,
        }),
      /not found/,
    );
  } finally {
    repo.close();
  }
});
test("viewer cannot mutate administrator-only profile or coverage", () => {
  const repo = new DemoRepository(":memory:");
  try {
    const token = repo.createSession(Date.now(), "demo_viewer");
    assert.equal(repo.read(token).findings.length, 9);
    assert.throws(
      () => repo.mutate(token, { action: "profile", profile: demoProfile }),
      /administrator/,
    );
    assert.throws(
      () =>
        repo.mutate(token, {
          action: "coverage",
          category: "event",
          notes: "Change",
          paused: false,
        }),
      /administrator/,
    );
  } finally {
    repo.close();
  }
});
test("SQLite changes survive close and reopen; revocation deletes private data", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "scout-test-"));
  const file = path.join(dir, "demo.sqlite");
  try {
    let repo = new DemoRepository(file);
    const token = repo.createSession();
    repo.mutate(token, {
      action: "state",
      findingId: "event-harbor",
      saved: true,
      dismissed: false,
    });
    repo.mutate(token, { action: "setup", step: 1 });
    repo.close();
    repo = new DemoRepository(file);
    assert.equal(
      repo.read(token).findings.find((f) => f.id === "event-harbor")!.saved,
      true,
    );
    assert.equal(repo.read(token).setupStep, 1);
    repo.revoke(token);
    assert.throws(() => repo.read(token), /expired/);
    assert.equal(
      repo.db.prepare("SELECT COUNT(*) AS n FROM assessments").get()!.n,
      0,
    );
    assert.equal(
      repo.db.prepare("SELECT COUNT(*) AS n FROM public_findings").get()!.n,
      9,
    );
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("profile rejects invalid geography, URLs, timezones, duplicate days and client scope", () => {
  for (const patch of [
    { radiusMiles: 0 },
    { timezone: "Not/AZone" },
    { website: "javascript:alert(1)" },
    { scheduleDays: ["Tuesday", "Tuesday"] },
    { scheduleTime: "28:00" },
    { categories: [] },
    { tenant_id: "forged" },
    { recipients: ["bad-email"] },
  ])
    assert.equal(
      profileSchema.safeParse({ ...demoProfile, ...patch }).success,
      false,
    );
  assert.equal(profileSchema.safeParse(demoProfile).success, true);
});
test("setup requires confirmation and sequential review", () => {
  const repo = new DemoRepository(":memory:");
  try {
    const token = repo.createSession();
    assert.throws(
      () => repo.mutate(token, { action: "setup", step: 5 }),
      /preceding/,
    );
    repo.mutate(token, {
      action: "profile",
      profile: { ...demoProfile, confirmed: false },
    });
    assert.throws(
      () => repo.mutate(token, { action: "setup", step: 1 }),
      /Confirm/,
    );
  } finally {
    repo.close();
  }
});
test("search and filters preserve dataset meaning; dismiss is reversible", () => {
  const repo = new DemoRepository(":memory:");
  try {
    const token = repo.createSession();
    const filters = filtersSchema.parse({ q: "Juniper", category: "project" });
    assert.deepEqual(
      filterFindings(repo.read(token).findings, filters).map((f) => f.id),
      ["project-northbank"],
    );
    repo.mutate(token, {
      action: "state",
      findingId: "project-northbank",
      saved: true,
      dismissed: true,
    });
    assert.equal(filterFindings(repo.read(token).findings, filters).length, 0);
    assert.equal(
      filterFindings(repo.read(token).findings, {
        ...filters,
        state: "dismissed",
      }).length,
      1,
    );
    repo.mutate(token, {
      action: "state",
      findingId: "project-northbank",
      saved: true,
      dismissed: false,
    });
    assert.equal(filterFindings(repo.read(token).findings, filters).length, 1);
  } finally {
    repo.close();
  }
});
test("CSV neutralizes formulas, preserves quotes/newlines, dates, evidence and unknowns", () => {
  for (const s of [
    "=SUM(1,1)",
    "+cmd",
    "-42",
    "@formula",
    " \t=1",
    "\r=1",
    "\ufeff=1",
  ])
    assert.ok(csvCell(s).startsWith("\"'"));
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  const repo = new DemoRepository(":memory:");
  try {
    const findings = repo.read(repo.createSession()).findings;
    const csv = toCsv(
      filterFindings(findings, filtersSchema.parse({ category: "event" })),
    );
    assert.ok(csv.startsWith("\ufeff" + csvColumns.join(",")));
    assert.equal((csv.match(/FICTIONAL DEMO/g) || []).length, 3);
    assert.ok(csv.includes("2027-02-12"));
    assert.ok(csv.includes("https://sources.example/event-harbor"));
    assert.ok(csv.includes("Attendance"));
    assert.ok(!csv.includes("corporate-alder"));
    assert.ok(toBrief(findings[0]).includes("Never — fictional data"));
  } finally {
    repo.close();
  }
});
test("origin enforcement rejects missing/cross-site requests", () => {
  const url = "http://localhost:3000/api/demo/workspace";
  assert.throws(() => assertSameOrigin(new Request(url)), /Cross-origin/);
  assert.throws(
    () =>
      assertSameOrigin(
        new Request(url, { headers: { origin: "https://attacker.example" } }),
      ),
    /Cross-origin/,
  );
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request(url, {
        headers: {
          origin: "http://localhost:3000",
          "sec-fetch-site": "same-origin",
        },
      }),
    ),
  );
});
test("D1 foundation migration parses and enforces composite property/run and delivery uniqueness", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    db.exec(
      readFileSync(
        path.join(process.cwd(), "cloudflare/migrations/0001_foundation.sql"),
        "utf8",
      ),
    );
    db.exec(
      "INSERT INTO tenants VALUES('t1','A'); INSERT INTO tenants VALUES('t2','B'); INSERT INTO properties VALUES('t1','p1','{}',1,0); INSERT INTO properties VALUES('t2','p2','{}',1,0);",
    );
    assert.throws(
      () => db.exec("INSERT INTO memberships VALUES('u','t1','p2','admin')"),
      /FOREIGN KEY/,
    );
    db.exec(
      "INSERT INTO research_runs(tenant_id,property_id,id,cycle_key,type,status,coverage_json,counts_json,warnings_json) VALUES('t1','p1','r1','cycle1','update','queued','{}','{}','[]')",
    );
    assert.throws(
      () =>
        db.exec(
          "INSERT INTO research_runs(tenant_id,property_id,id,cycle_key,type,status,coverage_json,counts_json,warnings_json) VALUES('t1','p1','r2','cycle1','update','queued','{}','{}','[]')",
        ),
      /UNIQUE/,
    );
    assert.throws(
      () =>
        db.exec(
          "INSERT INTO usage_ledger(tenant_id,property_id,run_id,entry_id,scout) VALUES('t2','p2','r1','e1','event')",
        ),
      /FOREIGN KEY/,
    );
    db.exec(
      "INSERT INTO market_entities(id,canonical_key,category,normalized_name,location_json) VALUES('e1','event-2027','event','Sample','{}'); INSERT INTO findings VALUES('f1','e1','{}','2026-10-01','2026-10-01',NULL); INSERT INTO finding_versions VALUES('f1',1,'change1',NULL,'{}',1,'New edition','[]','2026-10-01'); INSERT INTO deliveries VALUES('t1','p1','r1','key1','recipient@example.test','f1',1,'pending',0)",
    );
    assert.throws(
      () =>
        db.exec(
          "INSERT INTO deliveries VALUES('t1','p1','r1','key2','recipient@example.test','f1',1,'pending',0)",
        ),
      /UNIQUE/,
    );
  } finally {
    db.close();
  }
});
test("origin enforcement accepts the actual Host but rejects forwarded-host spoofing", () => {
  const url = "http://localhost:3000/api/demo/session";
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request(url, {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  assert.throws(
    () =>
      assertSameOrigin(
        new Request(url, {
          headers: {
            host: "127.0.0.1:3000",
            "x-forwarded-host": "attacker.example",
            origin: "http://attacker.example",
          },
        }),
      ),
    /Cross-origin/,
  );
});
