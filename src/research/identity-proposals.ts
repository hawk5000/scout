import type { PublicIdentity } from "./blueprint-plan";
// Official public pages checked October 23, 2026. Suggestions only: never an
// authorization, automatic customer mutation, or a substitute for confirmation.
const proposals = [
  {
    name: "Home2 Suites by Hilton Portland Hillsboro",
    address:
      "9790 NE Tanasbourne Drive, Hillsboro, Oregon 97124, United States",
    website:
      "https://www.hilton.com/en/hotels/pdxllht-home2-suites-portland-hillsboro/",
    number: "9790",
    street: "tanasbourne",
  },
  {
    name: "Residence Inn by Marriott Portland Hillsboro",
    address:
      "10555 NE Tanasbourne Drive, Hillsboro, Oregon 97124, United States",
    website:
      "https://www.marriott.com/en-us/hotels/pdxhb-residence-inn-portland-hillsboro/overview/",
    number: "10555",
    street: "tanasbourne",
  },
  {
    name: "Holiday Inn Portland West - Hillsboro",
    address: "2575 NE Aloclek Drive, Hillsboro, Oregon 97124, United States",
    website:
      "https://www.ihg.com/holidayinn/hotels/us/en/hillsboro/hioho/hoteldetail",
    number: "2575",
    street: "aloclek",
  },
  {
    name: "Embassy Suites by Hilton Portland Hillsboro, Oregon",
    address:
      "9355 NE Tanasbourne Drive, Hillsboro, Oregon 97124, United States",
    website:
      "https://www.hilton.com/en-gb/hotels/pdxhtes-embassy-suites-portland-hillsboro-oregon/",
    number: "9355",
    street: "tanasbourne",
  },
];
export function identityProposalFor(address: string): PublicIdentity | null {
  const a = address.toLowerCase();
  const p = proposals.find(
    (p) =>
      new RegExp(`\\b${p.number}\\b`).test(a) &&
      a.includes(p.street) &&
      a.includes("hillsboro"),
  );
  return p
    ? {
        name: p.name,
        address: p.address,
        website: p.website,
        sourceUrl: p.website,
      }
    : null;
}
