import test from "node:test";
import assert from "node:assert/strict";
import { DemoRepository } from "../src/server/repository";
import {
  latestMaterialUpdate,
  sortFindings,
  runFindingSummary,
} from "../src/lib/finding-presentation";
import { filterFindings, filtersSchema } from "../src/lib/contracts";
import { toBrief, toCsv } from "../src/lib/export";

test("Updated refers to the last material cycle, not a later quiet or partial cycle", () => {
  const repo = new DemoRepository(":memory:");
  try {
    const data = repo.read(repo.createSession());
    const changed = latestMaterialUpdate(
      [...data.runs].reverse(),
      data.findings,
    );
    assert.equal(changed.run?.id, "run-changes");
    assert.equal(changed.run?.at, "2026-10-16T15:00:00Z");
    assert.equal(changed.ids.size, 3);
    const filtered = filterFindings(
      data.findings,
      filtersSchema.parse({ state: "all" }),
    ).filter((f) => changed.ids.has(f.id));
    assert.equal(filtered.length, changed.ids.size);
    assert.equal(toCsv(filtered).split("\r\n").length, 4);
    assert.equal(
      latestMaterialUpdate(
        data.runs.filter((r) => !r.changedIds.length),
        data.findings,
      ).ids.size,
      0,
    );
    const baseline = data.runs.find((r) => r.type === "baseline")!;
    const f = data.findings.find((f) => changed.ids.has(f.id))!;
    assert.equal(runFindingSummary(f, baseline), f.versions[0].summary);
    assert.ok(!toBrief(f).includes("Finding ID:"));
    assert.ok(toCsv([f]).includes(f.id));
  } finally {
    repo.close();
  }
});

test("finding sorts put unknown dates and never-changed records last without mutating records", () => {
  const repo = new DemoRepository(":memory:");
  try {
    const data = repo.read(repo.createSession());
    const original = data.findings.map((f) => f.id);
    const changed = sortFindings(data.findings, "changed");
    assert.ok(
      changed
        .slice(0, 3)
        .every((f) => f.versions.some((v) => v.material && v.before !== null)),
    );
    const dated = sortFindings(
      [
        { ...data.findings[0], start: null },
        { ...data.findings[1], start: "2030-01-01" },
        { ...data.findings[2], start: "2029-01-01" },
      ],
      "date",
    );
    assert.deepEqual(
      dated.map((f) => f.start),
      ["2029-01-01", "2030-01-01", null],
    );
    assert.deepEqual(
      data.findings.map((f) => f.id),
      original,
    );
  } finally {
    repo.close();
  }
});
