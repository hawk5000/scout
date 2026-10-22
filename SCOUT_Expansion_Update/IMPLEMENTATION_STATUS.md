# Pass A implementation status

Implemented locally; hosted acceptance in progress. No live providers, paid calls, schedules or notifications are enabled.

## Mapping to existing application
- `src/customer/market-contracts.ts`, `ingestion.ts`, `market-export.ts`: extend the existing customer findings engine with competitor/property context, evidence and deduplication. Existing prospecting contracts remain compatible.
- `src/customer/expansion.ts`, `expansion-contracts.ts`, `expansion-fixtures.ts`: persisted configuration, bounded fixture refresh jobs, budget accounting and immutable evidence-backed briefings.
- `cloudflare/migrations/0005_scout_expansion.sql`: additive configuration/job/brief storage; reuse customer properties, memberships, markets and audit.
- `cloudflare/customer/worker.ts`, `src/customer/store.ts`, `src/app/api/customer/expansion/route.ts`: existing SIL session and server-derived scope; no new authentication contract.
- `src/components/customer-expansion.tsx`, `customer-account.tsx`, `customer-market.tsx`: selected comp set, own-property identity, five research views and Briefing destination using existing finding controls.
- `tests/expansion.test.ts`: isolation, evidence, deduplication, material history, concurrency, recovery, budgets and snapshots using SQLite and isolated fixtures.

## Release boundaries
Use existing acceptance Worker/D1 and Vercel project only. Production fixture execution remains disabled. No customer data is seeded or replaced. Migration rollback means rolling back code while retaining additive tables and data; do not drop tables or restore over customer storage.

Verification and release results will be recorded at the completed milestone.

## Local milestone
- 96 tests passed, including 14 expansion persistence/orchestration cases.
- Production build and TypeScript passed; formatting passed.
- Compiled HTTP smoke: 111 assertions passed (no local browser testing).
- Fixtures have no network adapter, provider credentials or external sending path. Artificial fixture units are not prices and do not estimate hosting, support or live-provider costs.
- Existing public demo remains the original prospecting demo. Expansion acceptance uses the actual authenticated customer architecture on the isolated hosted fixture deployment.

## Hosted backend milestone
- Existing acceptance Worker/D1: 59 hosted assertions passed; complete/no-change/partial/failed outcomes, exact evidence references, concurrent joining, same-tenant and cross-tenant denial, viewer denial, durable snapshots after fresh sign-in. Four prior fixture findings and profile preserved.
- Additive migration applied to existing acceptance and production D1 databases. Production Worker `0aca1a8f-2a5c-4298-b0de-3c474c7100e8`; acceptance Worker `b07ad2b1-9050-4117-b271-da92542718b2`.
- Full pre/post baseline equality for all production properties, memberships, markets, finding states and staged imports. ABC Hotel and other customer records unchanged. Production EXPANSION_FIXTURES=false; acceptance true behind existing synthetic-only database marker and expiry.
- Vercel browser acceptance is next; not yet claimed complete.
