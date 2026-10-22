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


## Pass B isolated hosted acceptance completed — 2026-10-21 PDT

Pass B code is pushed on `codex/expansion-pass-b-acceptance` at `75eb113c4b94c9c726084ac899e770d2602d66b1`. Preview: https://scout-7pnbd7vfk-parrieb-9172s-projects.vercel.app/app, deployment `dpl_E9vrESJHeehJGJ1Nh1UtU2qQXAhw`, verified Ready at that exact revision. The existing acceptance Worker version is `9a1c6944-7517-450d-9855-9f2cacb1f103`. Migration 0006 was applied only to the existing acceptance D1. Acceptance expires 2026-10-22 23:00 UTC (4pm PDT).

### Verification
- Local milestone: 109 tests passed; TypeScript, production build and scoped formatting passed. The unchanged broker.ts repository-formatting issue remains unrelated.
- Hosted workflow: 59 checks passed, covering five-category prepared-provider replay, complete/no-change/partial/failed outcomes, duplicate concurrent requests, exact snapshot evidence references, tenant/property/role denial and fresh fixture-login persistence. Nine existing fixture finding histories, evidence IDs, first-seen dates and private states were preserved; profile and coverage revisions remained unchanged.
- Hosted monetary ledger: concurrent reservations respect the shared cap; duplicate calls are denied; unknown usage retains its full hold; known usage releases unused reservations. A unique synthetic ledger scope exercised a 10,000-micro-USD cap. Provider replay calls are associated with durable job IDs. These are accounting simulations; actual research/provider spend was $0.
- Vercel browser: desktop 1440px, mobile 390px and 320px. Verified Competitor/Property views, five-category refresh to a persisted no-change Briefing 12, source-linked details, search/no-results and detail closure, save, dismiss, restore, copy, and fresh-login persistence. Private fixture state was restored after testing. No horizontal overflow at either mobile width and no captured browser console errors.
- Browser briefing CSV contains nine findings with versions and source links. Authenticated Vercel text export returned 200 with attachment/source/coverage labels; cross-origin mutation returned 403; unavailable scoped snapshot returned 404; fixture login/logout succeeded.
- The old hosted test's whole-record equality assertion was replaced with immutable-history/evidence/private-state preservation assertions: fixture refresh legitimately updates receipt/check metadata. No customer-data preservation check was weakened.

### Production preservation and limits
Production was not promoted: it remains `9b788ef80786da1a6e7882da4cce0c9ff845708d` at https://scout-olive-ten.vercel.app/app. Read-only pre/post comparisons confirmed all three properties, three memberships, one market, finding states and import reviews unchanged (digest `03f67b9919ce1242ac25f81198f3dd6966c1fb98f1270b89129b888763a4ff17`). Production has zero Pass B provider tables and zero synthetic markets. ABC Hotel received no writes. No new services or credentials were provisioned. Live research, paid calls, schedules and notifications remain disabled.

No blocker remains for isolated Pass B acceptance. Synthetic tests do not verify live source access, quality, permissions, model interpretation or real charges. Next: review the existing release proposal and obtain explicit approval for hotel identity/comp set, source and storage rights, provider access, finite budgets and a bounded Pass C live pilot before any dispatcher activation or production promotion. Schedules and notifications require independent authorization.

Evidence: `docs/qa/expansion-pass-b/` screenshots; reusable checks in `scripts/hosted-pass-b-acceptance.ts` and `scripts/hosted-provider-ledger.ts`. Local sanitized machine results remain in ignored `.vercel/pass-b-hosted-results.json` and `.vercel/pass-b-ledger-results.json`. Screenshots show fictional fixtures only.


## Pass B production promotion — 2026-10-22 PDT

Promoted the accepted Pass B code to GitHub main at `ea26ca155152aa433c36569f051dddb0d54887c8`. Production URL: https://scout-olive-ten.vercel.app/app. Verified alias deployment `dpl_9rTgmYqLW1UVFBuHpCFdYerpd5h6` / https://scout-4jrlv8ajj-parrieb-9172s-projects.vercel.app is READY, production, the existing SCOUT project, and the exact commit. The Git push also generated a same-commit deployment; the explicitly staged production deployment was re-promoted and its alias verified afterward.

Existing production Worker deployed from a clean Git archive, version `1ac978ce-3330-4bbf-a381-0a2cccdf3ad8`. EXPANSION_FIXTURES=false and INGESTION_ENABLED=false; existing reviewed import access remains unchanged. The production build explicitly sets SCOUT_HOSTED_ACCEPTANCE=false. No replay provider is injected in production, live dispatch remains blocked, and research/paid-call/schedule/notification flags remain false. No provider credentials or live budgets were added.

Applied only additive `0006_provider_preparation.sql` using D1 execute --file. The prior 0005 schema already exists despite the migration command listing it as pending; it was not rerun or modified. Provider limits/calls are both empty. Zero synthetic production markets. Existing acceptance Worker/D1 remains separate and retains its original expiry.

Verified: 27 focused provider/expansion tests passed; Vercel production build and TypeScript passed; homepage and account route 200; unauthenticated findings/expansion 401; deployment error-log scan returned no entries. Read-only pre/post comparison confirms unchanged properties (3), memberships (3), market (1), finding states (0), and staged import reviews (0), digest `03f67b9919ce1242ac25f81198f3dd6966c1fb98f1270b89129b888763a4ff17`. No ABC Hotel profile or findings mutations were performed.

Authenticated production browser verification passed: browser-filled existing credentials completed a fresh SIL sign-in without reading or copying the password. ABC Hotel workspace opened, the persisted full address was present in Hotel profile, and Briefing loaded with LIVE_DISABLED, zero categories checked and no stored briefs. No new refresh was requested and no profile was saved. Post-login customer-data digest remained unchanged. Browser error log was empty. Screenshot retained locally at .vercel/pass-b-production-verified.png. No promotion blocker remains.

Live readiness is not claimed. Source permissions, exact comp set/identity, approved provider access and budgets, and separately authorized bounded Pass C research remain required before any live dispatcher work. Schedules and notifications remain independently disabled.

## Pass C plan prepared — 2026-10-22 PDT
See PASS_C_PILOT_PLAN.md: identity, comp set and exact source grants pending; proposed two manual jobs with $0.20 total cap; review-before-publication and safe live dispatcher still require implementation/approval. Planning only, no activation or production writes. Pass B production promotion remains complete. Research, paid calls, schedules and notifications remain disabled.


## Pass C dispatcher and review controls — local synthetic implementation, 2026-10-22 PDT

Implemented `src/research/pilot-dispatcher.ts`, `src/research/pilot-transport.ts` and additive migration `0007_pilot_dispatch.sql`. This pass is local only: migration not applied remotely, no production/customer reads or writes, no push/deployment, secrets or paid calls. ABC Hotel and unrelated local edits remain untouched.

The durable pilot dispatcher reuses PreparedExpansionProvider across all five categories, ProviderLedger, server-derived ExpansionScope, and ReviewedImports. Operator-owned policies are immutable and expiry-bounded; durable request keys prevent redispatch; one active job/property and at most two jobs/pilot are enforced in SQL. The second job waits for the baseline review decision. Job caps are at most 100,000 micro-USD and pilot caps at most 200,000; pilot totals join all months rather than resetting at rollover. Missing monthly policies fail closed. Unknown usage remains held. Expired/interrupted execution becomes blocked without an automatic retry or third job.

SIL/access revalidation is injected by the server caller, then session/member/property/editor-role checks run locally before requests; persisted pause and job lease/expiry are rechecked before each simulated call. Grants constrain exact hosts and paths. Transport preparation validates public IPv4 addresses, rejects mixed/private DNS answers, conservatively rejects all IPv6, passes approved addresses to a pinned connector contract, rejects redirects, bounds streamed bytes and propagates cancellation. Cancellation during DNS prevents a late connector open. There is intentionally no real network connector, credential lookup or production activation flag; the only supported connector mode remains synthetic. Actual socket pinning/TLS and Cloudflare networking are NOT validated by fixture tests.

Provider results stage one five-category review batch through the existing review queue; they never directly ingest into the customer market. Pending/rejected/stale/blocked reviews cannot publish. Existing content-hash approval and transactional ingestion triggers publish only explicitly approved content; review-first SQL guards prevent blocked pilot jobs from bypassing that path. The approvedSnapshot consumer returns the immutable approved review document, retaining exact evidence/finding versions without dispatching research. Existing customer UI/export/brief consumers continue to read published market records only; no new pilot UI or automatic brief publication endpoint was introduced.

Verification: **120 tests passed**, including **11 new Pass C tests**. TypeScript and production build passed; scoped formatting passed. Tests cover five-category real-adapter fixture flow, duplicate and concurrent requests, rejection, cross-property/real-customer denial, revoked access, job limits, cross-month accounting/unknown holds, expiry/lost lease, stale approval, snapshot immutability, host/path and private-DNS rejection, redirect/size rejection and cancellation before dispatch. The first snapshot test incorrectly expected nine fixture records; the isolated new baseline contains five, and the corrected assertion passed. Full suite log and build log are local ignored `.vercel/pass-c-local-tests.log` and `.vercel/pass-c-local-build.log`.

Remaining before live activation: owner identity/comp set/source-rights/provider/budget/run approvals in PASS_C_PILOT_PLAN.md; secure account setup; a real pinned-DNS/TLS connector validated in the intended runtime; explicit server/hosted operator wiring and isolated hosted acceptance of migration 0007 before production release. These are not enabled by this local work. All live research, paid calls, schedules and notifications remain disabled. Synthetic testing does not establish live source quality, provider access or commercial readiness.

Pass C hosted acceptance integration: added fixture-only `/pilot` acceptance route, synthetic provider connector and hosted workflow test. Migration 0007 is additive and acceptance-only. Hosted deployment pending.

## Pass C isolated hosted acceptance completed — 2026-10-22 PDT

The Pass C synthetic dispatcher and review controls were accepted on the existing isolated Vercel Preview and expiring acceptance Worker. Code is pushed to `codex/expansion-pass-b-acceptance` at `4c254a866d90d8e7ec46d25262cd28a9fa412459`. Vercel Preview `https://scout-a69xvzvzj-parrieb-9172s-projects.vercel.app/demo` is Ready at deployment `dpl_E6zVg2vqpcBnXkpbrkCY8sXcfGQV`; the browser smoke opened the clearly labeled fictional demo workspace and rendered its findings. The isolated Worker `https://scout-findings-acceptance.parrieb.workers.dev` is version `ffc0e58c-539a-431c-9202-a3718b556573`. Migration `0007_pilot_dispatch.sql` was applied only to the existing marked synthetic acceptance D1 (`ccef2c7a-8e1d-4b32-87ba-27ac15bd7a35`). Its fixed expiry remains `2026-10-22T23:00:00Z`; the acceptance database contains fixture scopes only.

Hosted Worker verification used the real dispatcher, provider ledger, import review path and customer workspace with recorded fictional source responses. Missing service auth and missing session scope were denied (403). Fixture owner sign-in succeeded. Five categories completed and were staged for review; a duplicate request joined the existing job. A pending snapshot was denied; explicit fixture approval published a versioned snapshot with evidence links (10 records, all linked). A second job remained review-gated; rejecting it left the published customer market revision unchanged (revision 65). A third job was denied at the two-job cap. Research, paid-call, schedule and notification flags were false throughout; no real provider network calls or paid calls occurred.

Final local verification: `npm test` **120 passed**, `npm run typecheck` passed, `npm run build` passed; the focused hosted/dispatcher tests passed **11/11**. A read-only production D1 comparison matched pre-acceptance SHA-256 `03f67b9919ce1242ac25f81198f3dd6966c1fb98f1270b89129b888763a4ff17` across properties (3), memberships (3), markets (1), finding states (0) and import reviews (0). ABC Hotel data was not changed. Production was not promoted; the active production Vercel and Worker deployments remain unchanged.

Synthetic hosted acceptance is complete. No blocker remains for this pass. Live dispatch remains disabled and is not production-ready: owner-approved identity/comp set, exact source grants and rights, provider access, approved finite budget and pilot authorization remain outstanding in `SCOUT_Expansion_Update/PASS_C_PILOT_PLAN.md`; the actual network connector must also be validated for DNS pinning and TLS in its deployment runtime before a live run. Schedules and notifications remain independently disabled.

## Pass C integration on the production application branch — 2026-10-22 PDT

The synthetic Pass C dispatcher/review implementation and current five-category product/demo code were merged into GitHub `main` at `d4939adf74e37e2fda4e52467346f54f8b9bc5fa`. Vercel's stable alias `https://scout-olive-ten.vercel.app` now resolves to the Ready production deployment `dpl_7c9f3wrrqXFgqQNDke6uK1G3VKH1`, whose GitHub source is `main` at `d4939ad`. Public browser acceptance covered the expanded demo routes, Blueprint search/filter, desktop and 390px/320px layouts, plus the `/app` sign-in route.

Local checks: 122 tests, TypeScript, production build and changed-code formatting passed. Repository-wide format check reports 99 files, including unchanged files and the changed global CSS; changed TypeScript/JavaScript passed scoped formatting. See `docs/PROJECT_STATUS.md`. This production app release did not deploy a Worker or apply migration 0007 to the customer D1. Pass C remains synthetic/review-gated; no live research, paid calls, scheduled runs or notifications were activated. ABC Hotel data was not written.

Release prevention: GitHub `main` now requires a pull request; force-push/deletion are blocked, the rule applies to administrators, and merged source branches are automatically deleted. Vercel remains Git-connected with `main` as the sole production branch. See `docs/RELEASE_PROCESS.md`.

The merged source branches `codex/expansion-pass-b-acceptance` and `codex/demo-aligned-fictional-market` were removed after confirming all their commits are in `main`. Old Vercel Preview records can remain in deployment history until retention; the stable alias is attached to the `main` Production deployment.
