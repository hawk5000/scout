import test from "node:test";
import assert from "node:assert/strict";
import { updateDescription } from "../src/customer/update-copy";
import type { Facts } from "../src/research/contracts";
const facts: Facts = {
  activity: "training",
  status: "Active",
  start: "2026-11-01",
  end: null,
  venue: null,
  contractor: null,
  organizations: [],
};
test("customer updates describe additions and changed facts without internal field names", () => {
  assert.equal(
    updateDescription({ before: null, after: facts }),
    "New finding added to your market blueprint.",
  );
  assert.equal(
    updateDescription({
      before: facts,
      after: { ...facts, end: "2026-12-01" },
    }),
    "End date updated.",
  );
  assert.equal(
    updateDescription({
      before: facts,
      after: { ...facts, start: null, organizations: ["Fictional company"] },
    }),
    "Start date updated. Organizations involved updated.",
  );
  assert.equal(
    updateDescription({ before: facts, after: { ...facts } }),
    "No significant changes.",
  );
  assert.equal(updateDescription(undefined), "Finding updated.");
  assert.equal(facts.end, null);
});
