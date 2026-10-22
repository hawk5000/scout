# Data and integration requirements
These are logical contracts, not ready-to-run SQL. Map them to the inspected schema and add forward-compatible migrations. Do not create a second findings engine or rename existing IDs.

| Record | Required logical fields |
|---|---|
| Comp-set membership | tenant_id, property_id, competitor_id, display_name, address/locality, canonical_domain, aliases, active, created/updated_at, version |
| Property identity | existing property ID plus official domain, aliases, locality/address and match context |
| Observation | stable ID, tenant/property, category, subject ID/type, observed facts, relevance inference, unknowns, activity status, evidence IDs, first_seen, last_checked, material_change_at, version |
| Mention extension | source mention/review ID when supplied, canonical URL, publication time nullable, discovered time, match confidence/reason, sentiment label/reason |
| Evidence | stable ID, source URL/title, source class, retrieved_at, published_at nullable, content fingerprint, permitted excerpt/summary, retrieval status, provenance |
| Refresh job | property/category scope, initiator, idempotency key, queued/started/finished times, state, per-category outcomes, error codes, budget reservation, usage |
| Brief | ID, tenant/property, generated_at, refresh_job_id, snapshot version references, coverage/as-of times, status, narrative sections, claim-to-evidence links, actual/estimated costs |
| Audit | actor, property, action, object ID, time and sanitized outcome |

## Identity and deduplication
Use canonical source IDs/URLs and subject+event identities; fingerprint content for material changes. Do not dedupe all reviews by text alone. Keep repeated annual events distinct. Cross-category related observations share links, not duplicate alert counts. Changing the comp set changes future coverage; preserve prior history with membership dates.

## Persistence and concurrency
Use the existing Cloudflare Worker/D1 path and migrations. Make ingestion idempotent, preserve saved/dismissed states across research updates, and use optimistic versioning for profile/comp-set edits. Deduplication, budget reservations and job ownership require atomic enforcement. Recover interrupted jobs without duplicating costs, evidence or briefing records.

## Authorization
Every read, edit, refresh, brief, export and job-status endpoint must validate tenant/property access on the server. Reuse existing administrator/customer roles and SIL product activation. An enabled product means externally paid entitlement; no Stripe or parallel passwords. Never expose admin credentials to the browser. Do not weaken checks to make a demo work.

## API behavior (adapt names to existing routes)
Provide scoped operations for comp-set read/update, competitor/property findings, refresh request, refresh status, latest brief, historical brief and export. Return structured setup/budget/coverage errors. Require idempotency for refresh submission and protect mutations from cross-origin misuse using established application mechanisms.

## Migration and data safety
Additive changes first, with rollback instructions that preserve data. Never seed ABC Hotel or customer accounts with fixtures. No automatic import of demo browser storage into cloud customer records. Source permissions govern any cross-property reuse; private notes, states and briefs remain private. Keep synthetic tests in explicit isolated test identities.
