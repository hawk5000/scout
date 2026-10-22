import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyConfiguration,
  expansionConfiguration,
  type ExpansionConfiguration,
} from "../src/customer/expansion-contracts";

const hotel = (index: number) => ({
  id: `hotel-${index}`,
  name: `Hotel ${index}`,
  address: `${index} Main Street`,
  locality: "Sample City",
  domain: `hotel${index}.example`,
  aliases: [],
  formerNames: [],
  brand: "",
  active: true,
});

test("comp set accepts up to five named, addressed hotels", () => {
  const config: ExpansionConfiguration = {
    ...emptyConfiguration,
    competitors: [1, 2, 3, 4, 5].map(hotel),
  };
  assert.equal(expansionConfiguration.parse(config).competitors.length, 5);
  assert.throws(() =>
    expansionConfiguration.parse({
      ...config,
      competitors: [...config.competitors, hotel(6)],
    }),
  );
});

test("selected comp hotels need distinct names and a full address", () => {
  const duplicate = [hotel(1), { ...hotel(2), name: "hotel 1" }];
  assert.throws(() =>
    expansionConfiguration.parse({
      ...emptyConfiguration,
      competitors: duplicate,
    }),
  );
  assert.throws(() =>
    expansionConfiguration.parse({
      ...emptyConfiguration,
      competitors: [{ ...hotel(1), address: " " }],
    }),
  );
});
