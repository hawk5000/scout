# Research contract

## Scout playbooks

| Scout | Coverage | Candidate source families | Qualification questions |
|---|---|---|---|
| Corporate Demand | Offices, employers, facilities, expansions, training sites, visiting vendors and recurring travel potential | Company locations/news, economic-development organizations, official facility and campus announcements | Is the local presence verified? What evidence suggests visitors or traveling personnel? Is the activity current and relevant to this hotel? |
| Project & Crew | Construction, infrastructure, installations, renovations, temporary contracts | Planning/permit records, owner/agency project pages, procurement awards, contractor announcements | Is it proposed, awarded, active, delayed, canceled, or complete? Who is actually involved? Are outside workers evidenced or only inferred? |
| Group & Event | Tournaments, conferences, competitions, festivals, training and recurring gatherings | Organizer calendars, venue schedules, governing bodies, official event pages | Is this edition/date confirmed? Where is it? What supports overnight visitation? Who organizes it? |

Use geographic boundaries and hotel suitability confirmed during onboarding. Treat Seattle and Portland as possible pilot markets, not complete property briefs. Do not guess which hotels the user operates.

Prefer primary sources. Discover broadly, then fetch evidence for material claims. A search snippet alone is provisional; mark unavailable source verification. Record publication date, event dates, retrieval date, and last verified date separately. A recently crawled page does not establish a newly announced event. Do not imply all public websites permit unrestricted collection; respect access controls and applicable source restrictions.

## Minimum record

Persist a stable finding ID, canonical entity/project/event ID, applicable categories, title, factual summary, location, relevant dates and status, organizations, public contact details when verified, lodging-relevance inference with supporting rationale, unknowns, source URLs/publishers/dates, claim-to-source links, first-seen time, last-checked time, last-verified time, and version/change history. Store property-fit assessment and customer annotations separately from reusable public facts.

Display incomplete contact information honestly. A useful market finding may be delivered without a named lodging decision-maker. Never guess email patterns. Do not imply that a local employer necessarily buys rooms, that every crew travels, or that all event attendance produces room nights. Do not report bookings or generated revenue without customer-supplied evidence.

## Blueprint and updates

1. Establish a source registry and initial records across the three categories.
2. Normalize organization names, locations, project identifiers, event editions, and URLs.
3. Merge multiple articles about the same underlying activity; preserve source lineage.
4. Fetch high-value changing sources and discover new sources on a bounded schedule. Market memory reduces repeated synthesis, not the need to detect new information.
5. Compare factual fields with stored versions. Separate substantive changes from wording changes or syndicated copies.
6. Publish new relevant findings and material changes: contractor identified, award confirmed, date/venue changed, expansion announced, cancellation, or completion.
7. Suppress repeat notifications using a stable finding/version/property key. Preserve new facts even when no new alert is warranted.
8. Mark stale, canceled, completed, conflicting, or verification-needed records visibly. Never silently present an old blueprint as current after failed scans.

Keep recurring event editions distinct but linked. Distinguish similarly named projects in different locations. Deduplicate cross-category findings without losing legitimate relationships.

## Export contract

Provide selected findings and filtered blueprint exports. Start with CSV plus readable copy/print output; add other formats only as requested. Include evidence URLs, relevant dates, last verification, unknowns, and the distinction between facts and inference. Use stable IDs and safe CSV encoding; neutralize spreadsheet-formula injection from untrusted fields. Apply the same tenant and property access checks to exports as to on-screen results.
