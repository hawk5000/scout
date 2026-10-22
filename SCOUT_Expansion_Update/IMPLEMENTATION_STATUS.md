# Pass A implementation status

Pass A complete, pushed and deployed; hosted acceptance results are recorded below. No live providers, paid calls, schedules or notifications are enabled.

## Mapping to existing application
- `src/customer/market-contracts.ts`, `ingestion.ts`, `market-export.ts`: extend the existing customer findings engine with competitor/property context, evidence and deduplication. Existing prospecting contracts remain compatible.
- `src/customer/expansion.ts`, `expansion-contracts.ts`, `expansion-fixtures.ts`: persisted configuration, bounded fixture refresh jobs, budget accounting and immutable evidence-backed briefings.
- `cloudflare/migrations/0005_scout_expansion.sql`: additive configuration/job/brief storage; reuse customer properties, memberships, markets and audit.
- `cloudflare/customer/worker.ts`, `src/customer/store.ts`, `src/app/api/customer/expansion/route.ts`: existing SIL session and server-derived scope; no new authentication contract.
- `src/components/customer-expansion.tsx`, `customer-account.tsx`, `customer-market.tsx`: selected comp set, own-property identity, five research views and Briefing destination using existing finding controls.
- `tests/expansion.test.ts`: isolation, evidence, deduplication, material history, concurrency, recovery, budgets and snapshots using SQLite and isolated fixtures.

## Release boundaries
Use existing acceptance Worker/D1 and Vercel project only. Production fixture execution remains disabled. No customer data is seeded or replaced. Migration rollback means rolling back code while retaining additive tables and data; do not drop tables or restore over customer storage.

Verification and release results are recorded below.

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
- Vercel browser acceptance completed; see the final milestone below.


## Pass A hosted acceptance completed - 2026-10-21 PDT

Implemented and released as code commits `36e76ff`, `c34c312` (in-page briefing exports) and `8ce568a` (preserve scoped 404/413 responses). Production application: https://scout-olive-ten.vercel.app/app. Final isolated acceptance deployment: https://scout-d0mw84q32-parrieb-9172s-projects.vercel.app/app (`dpl_6oXgdr9cKf58dxFFYdKoN4K8zb5t`). Its existing acceptance expiry remains 2026-10-22 23:00 UTC; no new services were provisioned.

### Verified
- Local: 96 tests passed, including 14 expansion tests; TypeScript, production build, formatting; compiled HTTP smoke 111 assertions. Build/TypeScript rerun only for the two confirmed hosted QA fixes.
- Existing acceptance Worker/D1: 59 hosted checks passed across five-category ingestion/synthesis, exact evidence versions, duplicate request joining, partial and failed coverage, quiet refresh, private scope/role denial and fresh fixture login persistence. Existing four fixture findings and profile preserved.
- Vercel browser: desktop 1440px, 390px and 320px. Competitor and Property views, original Corporate/Project/Event views, configuration save, search/no-results, filters, detail closure, save/dismiss/restore/unsave, finding copy and CSV, refresh-to-briefing completion, quiet/no-change brief, historical partial brief, mobile briefing copy and source links. No horizontal overflow or clipped controls at checked widths. URLs use reserved `.example` fixture sources; they are intentionally not live websites.
- Browser-downloaded finding CSV: one property mention with identity/sentiment/source columns. Browser-downloaded briefing CSV: nine findings with versions and source URLs. Text export content/disposition verified through the authenticated Vercel HTTP route; repeated browser text downloads were not confirmed on disk in this Chrome session. Copy and CSV are the verified browser export paths.
- Vercel HTTP: authenticated text export 200 with sources/coverage; cross-origin mutation 403; unavailable scoped briefing 404; unauthenticated expansion access 401. Fresh fixture sign-in and logout succeeded.
- Production browser: existing real SIL-backed ABC Hotel session opens the new Briefing destination. Availability check returns `LIVE_DISABLED` / blocked, zero categories checked. No fresh customer password entry was needed or claimed in this pass.
- Production D1 pre/post equality: all existing properties (3), memberships (3), market (1), finding states (0) and staged imports (0) unchanged. One new blocked availability job records zero spent/reserved units; no briefs and no synthetic markets exist in production. Worker fixture gate remains false. Research, paid calls, scheduled research and notifications remain disabled.

### Acceptance coverage and limits
All fixture-compatible acceptance scenarios are covered by local tests and/or hosted checks: explicit active comp set, similar-name and brand-wide matching, syndication/URL variants, publication versus discovery dates, linked event observations, cancellation history, mixed sentiment, inaccessible sources, snapshot references, no-change/partial/failed/blocked results, concurrency, budgets, fenced retry recovery, pause/revocation, tenant/property isolation and durable private data. Cancellation/material-change and budget-boundary/recovery checks are deterministic local database tests; do not misrepresent them as real-source production checks.

Screenshots are in `docs/qa/expansion-pass-a/`: competitor-desktop.png, property-desktop.png, briefing-desktop.png, briefing-390.png, briefing-320.png and property-320.png. They show isolated fictional data only.

### Exact remaining dependencies / next pass
No Pass A implementation blocker remains. Production research is deliberately blocked pending approved source providers/access rights, an owner-approved live hotel identity and selected comp set, finite per-refresh/monthly/on-demand budgets, current documented provider/model rates, freshness and required/optional coverage policy, and explicit authorization for bounded live validation. Hosting/infrastructure/support costs are not measured by artificial fixture units. Synthetic checks do not establish live accuracy, provider coverage or commercial readiness.

Stop after Pass A. Pass B source-adapter preparation and Pass C live validation have not been started. Roll back application/Worker code if needed while retaining the additive tables; never drop expansion data or restore over customer storage as a rollback shortcut.


## 2026-10-21 — Expansion Pass B: local provider preparation

Implemented the documented Brave Web Search request/response adapter and OpenAI Responses structured extraction candidate (`gpt-6-luna`), public text/HTML retrieval boundary, exact-host credential serializers, source normalization/receipt validation and conservative cost accounting. Official documentation and current list pricing were checked during this pass. See `SCOUT_Expansion_Update/PROVIDER_READINESS.md` and `config/pass-b-release-proposal.json` for source-by-source limitations, citations and the inert release proposal.

The prepared provider runs discovery → retrieval → extraction through the existing five-category ingestion, identity checks and immutable briefing snapshots using isolated synthetic API-shaped responses. Provider failures become honest persisted category failures; ambiguous identities are excluded from confident brief claims. Publication is unknown/null in the first integrated adapter rather than invented from crawl timestamps. Source quotes are validated, but semantic interpretation and live quality remain unverified. Existing original fixture scenarios remain available and deployed construction is unchanged.

Added local-only additive migration `0006_provider_preparation.sql` and a fixture-scoped micro-USD ledger: atomic property/month/job caps, duplicate call denial, matching rate version, expiry check (2026-11-20 UTC), actual token reconciliation, full hold for unknown usage. Artificial Pass A units are not represented as real money. Default transport is hard-disabled, without an environment activation switch or credential lookup; no new endpoint can invoke paid research.

Verification at final milestone:
- `npm test`: **108 passed**, including **12 new provider tests**. Covers disabled zero-dispatch/reservation, shared concurrent caps, idempotency, unknown costs, rate expiry/version, scoped budget denial, source access/redirect/size failures, stale evidence, fabricated quotations, identity downgrade, credential-host confinement, five-category persisted briefing integration and failed-coverage persistence.
- `npm run typecheck`: passed. Final production build: passed (includes TypeScript).
- `npm run test:http`: **111 assertions passed** against compiled HTTP routes; no local browser used.
- Formatting of all changed TypeScript/tests passed; `git diff --check` passed. Repository-wide `format:check` reports a pre-existing formatting issue in unchanged `src/customer/broker.ts`; left unrelated code untouched.
- One adapter integration failure identified discovery/receipt canonical URL disagreement; fixed and targeted tests passed before final milestone.
- No remote database commands or customer writes, no new credentials, no deployment, no research/model calls, no schedules or notifications. ABC Hotel data was not touched. Existing user images/unrelated normalization changes were preserved.

Not verified: real provider credentials/access, actual source permissions, HTTP/DNS egress, model semantic quality, live provider costs and deployed Pass B acceptance. No deployment or browser acceptance was attempted for this local preparation request. The application remains on the previously deployed Pass A release.

Approval needed before Pass C: owner-approved ABC Hotel identity/domain and exact selected comp set; explicit primary-source grants and storage rights; provider/model access; finite per-refresh/monthly/on-demand limits and freshness/coverage policy; a separately authorized scoped dispatcher release and bounded baseline/update quality pilot. Proposed provider envelope is $0.046515/refresh, with proposed caps $0.10/refresh and $2/month (10 on-demand refreshes); excludes infrastructure, support, tax and licensed data. These are not approved spending or customer-plan changes. Review/social access remains unavailable, not zero mentions.

Next pass: after these approvals, bind the provider to a durable live job with server-derived SIL scope, per-call entitlement/pause/lease checks and DNS-safe bounded network transport; apply the additive ledger migration to existing D1, deploy the scoped release, and conduct explicitly authorized Pass C baseline/update validation. No live dispatcher is enabled by this preparation. Schedules and notifications remain independently disabled. Do not claim live readiness from synthetic tests.


## Pass B hosted acceptance preparation — 2026-10-21 PDT

The existing expiring acceptance Worker now injects a synthetic recorded-response provider into the real expansion orchestrator. Its provider ledger is keyed to the durable job ID. Production imports no replay provider; existing customer gates remain unchanged. The additive 0006 ledger migration is intended only for the existing acceptance D1 during this pass. A new entrypoint test completes all five categories with network access forbidden, checks 16 recorded calls, and confirms duplicate advances spend nothing extra. Local milestone: 109 tests passed, TypeScript and production build passed. Hosted verification remains pending until recorded below. Branch: codex/expansion-pass-b-acceptance; no production promotion is intended.
