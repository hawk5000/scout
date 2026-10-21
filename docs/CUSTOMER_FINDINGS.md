# Customer findings persistence and ingestion

This foundation accepts prepared evidence into customer storage. It does not discover or fetch sources, run a model, schedule research, send notifications, or make paid calls. No production scope is enrolled by the migration.

## Storage and access

Apply `0003_customer_findings.sql` after `0002_customer_accounts.sql` before releasing the updated customer Worker. The new Worker reads these tables for authenticated workspaces, so skipping the migration will fail customer reads. Vercel must then release the matching customer findings contract and UI. No remote migration or release was performed in this build pass.

`customer_markets` holds a versioned property snapshot. `customer_ingestion_batches` retains idempotency keys, payload hashes and committed snapshots. `customer_finding_states` holds saved/dismissed state separately from imported facts. All keys include tenant and property. Membership and SIL validation still govern customer reads and writes; viewers cannot change finding state. Profile revisions and draft values are independent of market revisions.

An ingestion batch, snapshot revision and audit entry commit in one SQLite statement through triggers. An audit failure rolls back the batch. Exact retries are no-ops; changed payloads under an existing batch key, stale revisions and out-of-order observations are rejected. Finding-state changes also use revision checks and atomic audit triggers.

## Operator boundary

The Worker `/ingestion` endpoint is disabled unless all dedicated ingestion settings are present. It requires a separate secret of at least 32 characters, different from the customer service secret. Tenant, property and mode come from Worker configuration, never the request body. There is no browser ingestion route.

Required settings for a later authorized isolated trial:

- `INGESTION_ENABLED=true`
- `INGESTION_TOKEN` stored as a Worker secret
- `INGESTION_TENANT_ID`, `INGESTION_PROPERTY_ID` set to the verified, existing scoped property
- `INGESTION_DATA_MODE=synthetic` or `reviewed`, matching the enrolled market

Enrollment is an explicit insert into `customer_markets(tenant_id, property_id, data_mode)` for an existing property. Check and reuse an existing matching enrollment; never replace an existing document or change its mode. The database rejects changing modes. Do not enroll ABC Hotel for synthetic acceptance. Synthetic mode requires both identifiers to begin `fixture_`; reserve those identifiers for isolated fixtures. Use a separate acceptance database/Worker for hosted fixture tests. The offline harness creates its own temporary database and needs no credentials.

`reviewed` is a trusted operator's designation for a prepared import, not proof of independent verification by SCOUT. No real reviewed batch has been imported or approved in this pass. Production enrollment, source verification and operator review remain separate gates.

## Contract and merge behavior

`src/customer/market-contracts.ts` defines the strict import contract: batch key, expected revision, observation time, declared category coverage, completion status/warnings and up to 50 items. Each item carries the existing candidate facts schema, summary, separate lodging assessment/unknowns, source field claims and matching retrieval receipts with content hashes. Required field-claim coverage, dates and URLs are checked. Receipt hashes and supplied quotes are importer assertions; no source content is fetched or cryptographically compared with them here.

Synthetic source URLs must use HTTPS `.example` hosts. Reviewed sources reject fixture hosts, obvious private/local/IP destinations and credential-bearing URLs. These checks are not a network retrieval or DNS-rebinding defense: this endpoint never fetches URLs. A future fetcher needs its own SSRF controls and source-content validation.

Canonical activity identity and location deduplicate across categories; event editions remain distinct. Fresh retrieval times alone do not create changes. Only structured fact changes create versions. Older publications cannot replace newer accepted facts. Same-date conflicts preserve accepted facts and mark partial coverage; conflicting initial facts reject the batch. Source evidence remains attached, lodging inference/unknowns are separate, and quiet/incomplete cycles remain visible in run history.

The customer interface reads only authenticated stored records. It supports category/search/state filtering, date/change sorting, details, evidence, history, save/dismiss/restore, copy and scoped CSV export. Updated in this customer view means records with a material change anywhere in imported history; the view labels that period. It does not claim an active twice-weekly schedule.

## Bounds and limitations

Each snapshot is limited to 1 MB, 500 findings, 200 recorded cycles, and 100 evidence entries/versions per finding. Imports stop rather than silently discard history. Each batch retains a cumulative snapshot, so storage grows faster than the current document size. Before sustained production ingestion, implement and validate an archive/retention or normalized-storage strategy. The ingestion credential is fixed to one property per Worker configuration; multi-property dispatch and per-operator attribution are later work.

## Local acceptance

Run `npm run customer:fixtures` for a fresh, temporary SQLite fixture database: three findings, exact replay, quiet cycle, authenticated workspace read, disabled capability checks, then cleanup. It does not read production environment files or call SIL.

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:http`, and `npm run format:check`. Tests exercise durable reopen/logout/login, isolation, roles/revocation, retry/concurrency, atomic rollback, conflicts, editions, private state and export boundaries. Browser acceptance is reserved for a separately authorized Vercel deployment, not a local browser.
