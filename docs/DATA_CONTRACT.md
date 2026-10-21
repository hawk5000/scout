# Data contracts to implement

Use typed schemas and safe migrations. Exact table names may follow repository conventions.

| Entity | Required information |
|---|---|
| Tenant / Property | Stable IDs, authorized access mapping, property name/address/timezone, confirmed profile, market geography, categories/exclusions, activation |
| Market entity | Canonical organization/project/event ID, normalized name/location, linked organizations, event edition/project identifiers |
| Finding | Stable ID, entity ID, categories, factual summary, location, dates, project/event status, source-backed organizations, public contacts when verified |
| Evidence | Stable source ID, URL, publisher, retrieved timestamp, publication/event dates when known, last verified timestamp, supported claim, verification status |
| Property assessment | Tenant/property/finding IDs, relevance rationale, labeled lodging inference, unknowns, assessment version |
| Private state | Authorized property/user scope, finding ID, saved/dismissed flags; no sales pipeline |
| Finding version / Change | Previous/new fact values, materiality reason, evidence IDs, timestamps, stable change ID |
| Research run | Tenant/property, baseline/update type, cycle key, status, checkpoint, coverage, counts, warnings, timestamps, usage and budget reservations |
| Delivery | Property/run/recipient scope, unique notification key, status, attempts; no prospect outreach |
| Usage ledger | Property/run/scout, provider/model/rate-card version, input/cache/output/reasoning usage, tool calls, estimated reservation, actual cost |

Record facts separately from lodging inferences. Do not require fabricated attendance or room-night estimates. Unknown values stay null/explicitly unknown. Publication time, event time, first seen, last checked and last verified are distinct.

Expose data through server-authorized property context. Reusable public facts do not grant access to another hotel's fit assessment or annotations. Apply identical restrictions to exports and job results.

CSV columns: finding_id, category, name, factual_summary, location, relevant_start, relevant_end, status, organizations, public_contact, lodging_relevance_inference, unknowns, source_urls, last_verified_at, change_summary. Escape separators/newlines and neutralize formula injection. A filtered export reflects the same filters as the UI.
