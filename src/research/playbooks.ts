import type { Category, Profile } from "../lib/contracts";
import type { Candidate } from "./contracts";
import { normalize } from "./retrieval";
export const playbooks = {
  corporate: {
    version: "corporate-v1",
    activities: ["facility", "expansion", "training"],
    sources: ["company announcement", "economic development"],
    inference:
      "Local presence does not establish room demand. Visiting personnel and overnight needs remain unconfirmed.",
  },
  project: {
    version: "project-v1",
    activities: ["construction"],
    sources: ["owner project page", "award notice", "contractor announcement"],
    inference:
      "Temporary work may involve traveling personnel, but workforce origin, rotation and accommodation plans remain unconfirmed.",
  },
  event: {
    version: "event-v1",
    activities: ["event"],
    sources: ["organizer calendar", "venue announcement"],
    inference:
      "A multi-day gathering may involve overnight visitors. Attendance, participant origins and hotel arrangements remain unconfirmed.",
  },
} as const;
export function withinScope(c: Candidate, profile: Profile, scout: Category) {
  const places = profile.includedPlaces.map(normalize);
  const exclusions = [...profile.exclusions, ...profile.excludedPlaces].map(
    normalize,
  );
  const haystack = normalize(
    [c.name, c.location, c.facts.activity, c.facts.venue ?? ""].join(" "),
  );
  return (
    profile.categories.includes(scout) &&
    c.categories.includes(scout) &&
    (playbooks[scout].activities as readonly string[]).includes(
      c.facts.activity,
    ) &&
    places.includes(normalize(c.location)) &&
    !exclusions.some((x) => x && haystack.includes(x))
  );
}
