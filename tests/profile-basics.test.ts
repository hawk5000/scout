import test from "node:test";
import assert from "node:assert/strict";
import { customerDraftProfile } from "../src/customer/contracts";
import { profileFromBasics } from "../src/customer/profile-basics";
import { CustomerStore } from "../src/customer/store";
import { database, adapter, auth } from "./helpers/customer-market";
const form = (values: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
};
test("simple profile edits preserve legacy address and all operator-managed settings", () => {
  const previous = customerDraftProfile.parse({
    name: "Fictional hotel",
    address: "Previously saved city, region",
    timezone: "America/Los_Angeles",
    radiusMiles: 10,
    categories: ["corporate", "project", "event"],
    marketCenter: "Approved center",
    includedPlaces: ["Approved place"],
    priorities: ["Approved priority"],
    confirmed: true,
  });
  const next = profileFromBasics(
    previous,
    form({ name: "Fictional renamed hotel", website: "https://hotel.example" }),
  );
  assert.deepEqual(
    { ...next, name: previous.name, website: previous.website },
    previous,
  );
  assert.equal(next.postalAddress, undefined);
  const draft = profileFromBasics(null, form({ name: "Name only" }));
  assert.equal(draft.name, "Name only");
  assert.equal(draft.address, "");
  assert.equal(draft.confirmed, false);
  assert.deepEqual(draft.scheduleDays, []);
});
test("market area fields save with a profile and can be cleared deliberately", () => {
  const previous = customerDraftProfile.parse({ name: "Hotel" });
  const saved = profileFromBasics(
    previous,
    form({
      name: "Hotel",
      marketCenter: "Portland west side",
      radiusMiles: "15",
      includedPlaces: "Hillsboro\nBeaverton",
      excludedPlaces: "Downtown Portland",
    }),
  );
  assert.equal(saved.marketCenter, "Portland west side");
  assert.equal(saved.radiusMiles, 15);
  assert.deepEqual(saved.includedPlaces, ["Hillsboro", "Beaverton"]);
  assert.deepEqual(saved.excludedPlaces, ["Downtown Portland"]);
  const cleared = profileFromBasics(
    saved,
    form({
      name: "Hotel",
      marketCenter: "",
      radiusMiles: "",
      includedPlaces: "",
      excludedPlaces: "",
    }),
  );
  assert.equal(cleared.marketCenter, "");
  assert.equal(cleared.radiusMiles, null);
  assert.deepEqual(cleared.includedPlaces, []);
  assert.deepEqual(cleared.excludedPlaces, []);
});
test("full address persists through customer sign-out/sign-in without modifying coverage or enabling research", async () => {
  const db = database();
  try {
    const store = new CustomerStore(adapter(db), auth());
    const login = await store.login(
      "fixture@example.com",
      "fixture-only",
      "profile-test",
    );
    const before = await store.workspace(login.token);
    const profile = profileFromBasics(
      before.profile,
      form({
        name: "Fictional profile test hotel",
        website: "https://hotel.example",
        line1: "123 Fictional Street",
        line2: "Building B",
        city: "Fictional City",
        region: "Test region",
        postalCode: "00000",
        country: "Test country",
      }),
    );
    const saved = await store.update(login.token, {
      revision: before.revision,
      profile,
      coverage: before.coverage,
    });
    assert.equal(saved.profile!.postalAddress!.line2, "Building B");
    assert.match(saved.profile!.address, /123 Fictional Street/);
    assert.deepEqual(saved.coverage, before.coverage);
    await store.logout(login.token);
    const again = await store.login(
      "fixture@example.com",
      "fixture-only",
      "profile-test",
    );
    const fresh = await store.workspace(again.token);
    assert.deepEqual(fresh.profile, profile);
    assert.equal(fresh.researchEnabled, false);
    assert.equal(fresh.paidCallsEnabled, false);
    assert.equal(fresh.notificationsEnabled, false);
    const cleared = profileFromBasics(
      fresh.profile,
      form({ name: profile.name }),
    );
    assert.equal(cleared.address, "");
    assert.equal(cleared.postalAddress!.city, "");
  } finally {
    db.close();
  }
});
test("structured address rejects extra keys and bounds input while allowing incomplete drafts", () => {
  assert.throws(() =>
    customerDraftProfile.parse({
      name: "Hotel",
      postalAddress: {
        line1: "",
        line2: "",
        city: "",
        region: "",
        postalCode: "",
        country: "",
        tenantId: "forged",
      },
    }),
  );
  assert.throws(() =>
    profileFromBasics(null, form({ name: "Hotel", line1: "x".repeat(151) })),
  );
  assert.throws(() =>
    profileFromBasics(
      null,
      form({ name: "Hotel", website: "javascript:alert(1)" }),
    ),
  );
  assert.equal(
    profileFromBasics(null, form({ name: "Hotel", city: "Draft city" }))
      .postalAddress!.city,
    "Draft city",
  );
});
