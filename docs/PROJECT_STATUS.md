# Project status

## 2026-10-22 — Hotel profile comp-set and research-area inputs

Implemented the signed-in Hotel Profile fields needed to identify the hotel's public mentions and its selected STR comp set. Owners can save the existing hotel name, website and structured postal address alongside a market center, optional radius, included/excluded places, hotel aliases/former names, and up to five explicitly named competitor hotels with address, locality, official website and aliases. The profile uses the existing authenticated workspace update and expansion-configuration endpoints; existing competitor identity history is retained by the server when a hotel is removed from the active set. It does not infer competitors or start research.

Added server contract checks for a maximum of five active competitors, required name/address per selected hotel and distinct names. Existing profile values remain intact when older callers omit the new market-area fields; the signed-in form can intentionally clear them. Profile and comp-set writes are separate existing scoped operations, so if the second write fails the UI says the hotel details saved but the comp set did not.

Validation: `npm run typecheck` passed; `npm test` passed (126 tests, including property/profile persistence, expansion tenant/role/scope guards, comp-set count/name/address validation and market-area edits); `npm run build` passed; Prettier passed on every changed code and style file. The repository-wide `npm run format:check` remains red because 113 existing files are not formatted, including untouched files; no repo-wide reformat was applied. No D1/Worker or customer records were changed. ABC Hotel's stored profile and findings remain untouched. Research, paid calls, scheduled research and notifications remain disabled. The profile now has the fields needed to collect an owner-supplied comp set, but no competitors were added on ABC Hotel's behalf; source coverage and live provider readiness are still separate open work.

## 2026-10-22 — Pass C live-run readiness inspection

The owner authorized one manual live cycle within the documented pilot per-job ceiling (interpreted as a maximum of $0.10 for this cycle). No live run was started because the existing production setup is not ready to dispatch real sources. Read-only production inspection found the ABC Hotel profile at 3133 NE Shute Road, Hillsboro, Oregon 97124, with a blank website/domain, no confirmed public identity, and no saved expansion identity or competitor configuration. No competitors or exact source grants are selected. The `reviewed` market is empty (revision 0, zero records). I requested the official hotel identity/domain, address/market confirmation and exact selected competitors from the owner.

The deployed provider path is preparation-only: `PreparedExpansionProvider`, `BoundedSources`, `PilotTransport` and `PilotDispatcher` are synthetic-only; there is no real pinned-DNS/TLS connector, live dispatcher route or provider credential lookup. Production D1 has migration 0006 provider-ledger tables but no ABC Hotel provider limit/call rows; migration 0007 pilot-policy/job tables are absent. The production Worker secret-name listing contains SIL/customer/review credentials but no Brave Search or OpenAI provider credential. The Vercel production environment listing contains only SCOUT-to-Worker settings, not provider keys. A read-only query found one prior blocked availability job with zero spent and reserved fixture units. No customer profile, market, findings, provider budget, flags or schedules were changed.

Actual research API calls: **0**. Direct research API spend in this inspection: **$0 measured**. Infrastructure/support cost was not measured. No findings or Briefing were produced or published, and the authorized one-cycle budget was not consumed. Before a real run, confirm public hotel identity and competitors, approve exact source hosts/paths and rights, configure existing Brave/OpenAI accounts securely, and implement/release a real connector plus the pilot migration/dispatch controls. Keep all cycles manual and notifications off. No research-quality conclusion can be drawn from synthetic fixtures or this blocked readiness check.

## 2026-10-22 — Hotel Mentions and Briefing user-flow QA

Reviewed the stable fictional demo from a hotel-user perspective. Hotel Mentions clearly showed the hotel's identity context, a single mixed-tone example, its illustrative date, practical relevance and unknowns; saving and copying worked. The source tile's arrow looked like an outbound link but did not open anything, and the findings CSV always used a generic Market Blueprint filename. The public Briefing sample linked findings to details, but offered no copy/export/print controls even though the customer Briefing supports exports.

Fixed the source tile so it opens the finding's evidence details, added section-specific CSV filenames, delayed object-URL cleanup until after downloads start, and ensured Saved export excludes dismissed records. Added copy and row-per-source CSV export to the briefing sample, plus print/save-as-PDF controls. The print layout hides workspace navigation and includes dated source URLs and synthetic-data caveats. Added tests for briefing text/CSV evidence coverage. Local validation: `npm test` **123 passed**, typecheck and production build passed. Live research, paid calls, schedules and notifications remain disabled. Merged to `main` in PR #5 (release commit `452eeeb`) and verified on the stable Vercel demo `https://scout-olive-ten.vercel.app` after the production deployment reported Ready. Hosted acceptance confirmed the Hotel Mentions evidence link and details, save/copy/dismiss/restore behavior and context-specific CSV filename/content; the briefing copy and source-linked CSV download worked, and print preview hid navigation and transient notices while including dated source URLs. Both pages fit at 390px and 320px without horizontal overflow. Browser console reported no errors or warnings. Hosted checks used only synthetic public-demo data; no customer account or ABC Hotel data was modified.

## 2026-10-22 — Briefing export formatting

Added a self-contained, print-ready HTML export for stored SCOUT Briefing snapshots. The report presents a clear title and version/status metadata, synthetic-data disclosure, coverage outcomes, finding statements, practical implications, unknowns, source links with published/retrieved dates, related developments and print styles for saving to PDF. Source text is HTML-escaped and only HTTP(S) evidence URLs become links. Existing CSV and plain-text exports remain available. The customer Briefing screen now offers “Download formatted report”; open the downloaded HTML in a browser to print or save as PDF.

Verification: `npm test` passed (122/122); `npm run typecheck` passed; `npm run build` passed. The export is generated from an already stored briefing and does not trigger a research refresh. All content is still synthetic fixture data, with no live research, paid APIs, schedules or notifications enabled. Merged to protected `main` in PR #2, code revision `a7a10ea6a5a2641b6e4ced97bd914005c166bd49`. At code-release verification, Vercel production deployment `dpl_7SobnerfqMRbUpUujVj9H4w2axSB` was Ready and held the stable alias `https://scout-olive-ten.vercel.app`. Browser check confirmed the stable `/app` sign-in route is live; an authenticated customer session was not available, so downloading the private customer briefing was not browser-verified. Next: verify the download/print flow from an owner-authenticated session.

Current status (2026-10-21): **Customer accounts and findings persistence foundation are deployed to production. ABC Hotel profile and membership are preserved. Fresh owner-entered SIL sign-in and profile persistence are verified.** Live research, paid calls, notifications and direct ingestion remain disabled. Reviewed-import operator access is enabled only for ABC Hotel.

## Initial handoff — historical

Status: build handoff prepared; application implementation not started.
Approved brand: SCOUT by SalesHospitality.
Agents: Corporate SCOUT, Project SCOUT, Event SCOUT.

Provided: product/build/UI/research/architecture/cost specifications, acceptance criteria, local skill, research playbooks, start/continue prompts and inactive configuration templates.
Not provided: running application, installed packages, production schema deployment, live API credentials, SIL connection, scheduled jobs, pilot results or verified unit economics.

Next: run prompts/START_BUILD.txt in local Codex.

## Builder handoff format
After each pass append: files/features implemented; tests and results; live versus fixture behavior; remaining blockers; next pass. Preserve earlier entries. Do not claim deployment, paid research or customer outcomes without evidence.

## 2026-10-21 — Build Pass 1 completed

### Root and retained material

Located the existing nested project at `C:\Users\Admin\Documents\Playground\SCOUT\SCOUT`. It was specification-only. Built the app in that root; retained the supplied AGENTS, START_HERE, product/build/research/UI/architecture/data/cost/acceptance/integration documents, prompts, examples and build skill. No adjacent application or SIL repository was changed. No repository was created, committed, published or pushed.

### Implemented

- Next.js 16.4.2 / React 19.3.1 / TypeScript 5.9.3, Zod validation, Lucide icons and npm lockfile. Current versions were checked against npm; Node 24.x is required for the local SQLite adapter. See `package.json`, `package-lock.json`, `next.config.ts`.
- Public site: approved SCOUT brand and tagline, service explanation, three scouts, sample deliverable, assisted setup steps, working $99 setup + $50/month per-hotel offer, clear scope/limits, and a functioning local setup-brief download form. The form does not submit a request, take payment or activate a service.
- Customer Overview, Market Blueprint, finding details, Corporate/Project/Event SCOUT pages with Findings/Coverage/Run history tabs, Updates, Exports, Hotel Profile and guided Administrator setup.
- Search by name/summary/location/organization; filters for scout, active/saved/dismissed/all records and evidence status. Save, dismiss and restore persist. Copy/print readable briefs; selected and filtered CSV downloads include stable IDs, evidence URLs, dates, unknowns, fact/inference separation and fictional labels. Spreadsheet-formula injection is neutralized.
- Nine fictional findings, three per scout, with canonical identifiers, evidence examples, dates, organizations, null unverified contacts, lodging inferences, unknowns and version histories. Sample canceled/completed, stale, verification-needed, quiet and partial states are explicit.
- Validated profile, market center/radius/places, categories, priorities/exclusions, timezone, recipient and twice-weekly schedule preferences. Coverage edits and pause preferences persist; changing them never starts research.
- Six-step administrator rehearsal: profile confirmation, boundaries, access/recipients, cycles, preloaded blueprint review and demo handoff. All live entitlement, generation and delivery limitations are visible. Setup requires sequential progress and profile confirmation.
- Local SQLite persistence. Random seven-day demo session, hashed server token, HttpOnly/SameSite cookie, property-private state/profile/assessment/coverage and scoped run records. Server resolves tenant/property from the session, rejects scope overrides, checks origin on mutations and sends no-store private responses. Demo exit revokes and deletes private state. Expired private properties are cleaned on new-session creation.
- Production access fails closed. `/api/workspace` returns 503; `/app` is an activation gate. The demo repository is unavailable on any Vercel environment even if the demo flag is set. No mock production identity, SIL contract, endpoint or credential fallback exists.
- Prepared D1 migration for tenants/properties/memberships, canonical entities, findings/evidence/versions, private assessments/state, research runs, usage and deliveries. Composite foreign keys and uniqueness constraints establish later persistence/idempotency contracts. No migration was applied remotely.
- Responsive styles, mobile navigation and stacked findings, visible focus, semantic forms, status feedback, keyboard-operated agent tabs and print styles. `design/overview-concept.png` records the design direction. Rendered acceptance is still pending.

### Tested and results

| Check | Result |
|---|---|
| `npm test` | **13/13 passed**: production/demo gating, expired/unknown sessions, tenant isolation, same-tenant property isolation, admin authorization, restart persistence/deletion, profile validation, sequential setup, filters/restore, CSV/brief integrity, origin/Host handling, D1 migration and relational/idempotency constraints |
| `npm run typecheck` | **Passed**, strict TypeScript |
| `npm run format:check` | **Passed** |
| `npm run build` | **Passed**, optimized Next.js production build; all pages/routes compiled |
| `npm run test:http` | **49 assertions passed** against the compiled app: public/customer route responses, demo-disabled and production denial, authenticated session flow, two-session isolation, mutations, invalid payloads/scopes, origin rejection, selected/filtered CSV and session revocation |
| npm audit | **0 reported vulnerabilities** at installation and production-dependency check |
| Browser acceptance | **Not performed**. Intentionally reserved for an authorized Vercel deployment per project preference |

An initial build caught a test environment typing mismatch, and the first compiled HTTP smoke caught a loopback-host origin mismatch. Both were corrected and the final relevant checks passed. Node 24 emits its expected experimental SQLite API warning; it does not fail the build or tests.

### Fictional, inactive or unverified

- Every hotel, organization, project, event, evidence URL and run is fictional. Reserved `.example` URLs are source examples, not verified evidence. `lastVerifiedAt` is null. No dates or results are presented as live research.
- No provider/research adapter, live source retrieval, source-rights verification, geocoding, distance calculation, entity matching engine, substantive-change detector or measured evidence quality yet. Fixtures demonstrate the expected shapes and views only.
- No actual baseline generation, scheduled jobs, paid calls, budget reservation/reconciliation engine, queue concurrency, retries or notifications. Draft schedules/pause preferences are stored but cannot activate work. Delivery uniqueness is tested as a database constraint, not as a live delivery system.
- No real identity, SIL entitlement, customer invitation or live tenant access. No cloud storage, Worker, queue, account resource or deployment has been connected. D1 migration behavior was tested in local SQLite, not remote D1.
- Copy, print, downloads, responsive layout and keyboard interactions are implemented but not browser-accepted. The HTTP tests validate route/data behavior, not rendered visual fidelity or real browser gestures.
- No real hotel onboarding, pilot, bookings, revenue, customer adoption, API costs, onboarding time or unit economics measured. The price remains the agreed working commercial offer.

### Specific later dependencies

1. **Authorized Vercel project/deployment and preview access** for browser acceptance. The local SQLite demo cannot be used as Vercel persistent storage; an isolated persistent preview demo adapter must be provided first.
2. **Verified SIL/authentication/entitlement contracts and an authorized test identity** before customer production access. No SIL integration was guessed or fabricated.
3. **Approved Cloudflare account/resources and provisioning/deployment authorization** before binding Worker/D1/queue services or applying migrations. No resource IDs are known or embedded.
4. **Approved research provider/model/tool selection, secure credentials, current rate card and spend limits** before any live provider calls. Fixture-only engine work is unblocked without these.
5. **Actual pilot hotel profiles, confirmed market boundaries and research authorization** before Seattle/Portland work.
6. **Authorized sender/recipient/provider and delivery authorization** before notifications.

### Next pass

**Build Pass 2 — research engine, synthetic/recorded fixtures first.** Implement schema-validated provider candidates, bounded safe source retrieval, claim/evidence lineage, canonical matching across sources, distinct event editions, versioned material-change detection, quiet/partial/failure behavior and actual usage/budget accounting. Add deduplication, injection/SSRF, concurrency/reservation and interrupted-run tests. Keep live calls disabled until explicit authorization, valid configuration and hard budgets exist. Durable scheduled delivery and verified SIL integration remain Pass 3.

### Launch and review

From the nested project root: `npm run dev:demo`, then open `http://127.0.0.1:3000`. For the compiled build: `npm run build` then `npm run start:demo`. Both demo launchers bind to loopback. See `README.md`, `cloudflare/README.md`, `docs/PASS_1_ACCEPTANCE.md` and `docs/DESIGN.md` for the handoff and deferred preview checklist.

No cloud provisioning, deployment, publishing, notifications or research API charges were performed during this pass.

## 2026-10-21 — Build Pass 2 completed with synthetic fixtures

### Implemented

- Reused the Pass 1 application, session/tenant/property checks, SQLite persistence and UI. Added the engine under `src/research/` without adding dependencies, credentials, live endpoints or cloud resources. Original specifications, prompts, configuration examples and build skill remain retained.
- Synthetic-only provider adapter and versioned Corporate/Project/Event playbooks share one bounded cycle. Strict schemas reject unknown/forged fields, malformed dates/editions, unsupported categories and invalid usage. Confirmed places, categories and exclusions filter candidates; radius/geocoding and semantic interpretation of free-text preferences remain unimplemented.
- Offline source registry retrieval with an explicit HTTPS fixture-host allowlist, per-hop redirect validation, source/size/time limits, normalized URLs and content fingerprints. This adapter has no network capability. Retrieved text is inert evidence and cannot issue instructions, choose tenant scope or execute tools.
- Source-supported identity, publication metadata and material fact claims are checked against retrieved fixture text. Preserve source URLs, separate publication/retrieval/check dates, claim-to-source links, before/after versions and evidence IDs. All evidence remains fictional with null live verification dates; contacts and room demand remain unknown.
- Deterministic canonical matching, five-source and five-candidate deduplication, cross-category membership, separate event editions linked by a family key, and protection against merging similarly named activities in different places. Material changes are based on structured facts, not wording or refreshed crawl dates. Old reports cannot roll back accepted facts.
- Quiet, partial, attention, stale, canceled/completed, source-outage and conflicting-source behavior. Conflicts preserve accepted facts and source lineage; unresolved initial conflicts are withheld with review source links in run history. Last accepted records survive failures and cutoffs.
- Property-scoped persistent `synthetic_records`, `synthetic_runs`, `synthetic_usage` and `synthetic_changes` tables. Findings, private state, versions, change keys, checkpoints and usage survive restarts. Existing demo exit/expiry cleanup includes these tables. The change index never sends notifications.
- Atomic pre-attempt reservations, per-run/property-month ceilings, versioned artificial credit rates, validated simulated input/cache/output/reasoning/search/tool counts, exactly-once reconciliation and retained unknown/interrupted reservations. Month boundaries use property timezones. Completed cycle keys are idempotent; conflicting key reuse and overlapping property runs fail closed. A true two-process race verifies only one reservation can spend the final shared budget.
- Bounded retries and attempts; unknown usage remains held for review. These are synthetic accounting tests, not measured API prices or spend. Real research policy remains disabled with zero live dollar budgets.
- Authenticated, same-origin, administrator-only `POST /api/demo/research` accepts only a named scenario and cycle key. Client-supplied tenant/property, provider, source URL and budget overrides are not accepted. Disabled demo and production/Vercel gates remain intact.
- Administrator **Synthetic research workbench** runs baseline, update, quiet, outage, conflict, cancellation, next-edition, malformed, injection, budget-cutoff, retry and interrupted cases. Outputs appear in the existing Blueprint/details, Updates, agent history and exports. Save/dismiss works on engine records. Viewing, filtering and exporting do not run the engine. Run history shows per-scout coverage and clearly labeled synthetic usage/holds; Overview reflects the latest result rather than always claiming a quiet cycle.

### Tests and results

| Check | Result |
|---|---|
| `npm test` | **31/31 passed**: 13 original foundation cases plus 18 research-engine cases |
| Research acceptance | Five-source/candidate merge, material vs quiet updates, historical preservation, distinct event editions/locations, cancellation/completion, conflicts and initial conflict review, outages/staleness, strict schemas and evidence support, inert source injection, source URL/redirect/size/runtime limits, geographic/category constraints, role/tenant isolation, persistence/deletion, usage reconciliation, retries, cutoffs, interruptions and actual multi-process budget contention passed |
| `npm run typecheck` | **Passed** |
| `npm run format:check` | **Passed** |
| `npm run build` | **Passed**, including the new synthetic research API route |
| `npm run test:http` | **68 assertions passed** against the compiled app. Includes replay disabled/unauthorized/forged/cross-origin rejection, baseline/update/quiet, idempotency and key conflict, property-isolated outputs, selected exports and save state, and reads/exports without new runs or usage |
| Browser acceptance | **Not performed**; reserved for an authorized Vercel deployment as requested |

The first type check identified overly narrow literal types on configurable retrieval test limits. The limit parameter was explicitly typed, and all final checks passed. Node 24 continues to emit the expected experimental SQLite warning; it does not fail the checks. No dependencies or provider SDKs were added.

### Still synthetic, disabled or unverified

- Every fixture source, provider output, claim, identity, usage count and rate-card credit is synthetic. Fixture success does not establish live research quality, semantic fact accuracy, actual provider costs, profitability or customer outcomes. Actual charged USD is zero; no paid calls occurred.
- Only the offline adapter exists. No DNS/network fetcher or external provider is installed. URL/SSRF tests demonstrate fail-closed offline restrictions; production DNS rebinding, IP pinning, redirect transport, permissions and source-rights handling remain future live-retrieval requirements.
- Entity matching is conservative and deterministic; broader alias/fuzzy resolution and real-world evidence quality require later validation. No geocoding, calculated distances, attendance or room-night estimates, inferred emails, semantic coverage editing or external contact enrichment was introduced.
- Manual fixture replay is explicitly separate from inactive live schedule/pause preferences. No recurring jobs, source rechecks, activation, live retry control, asynchronous queue, notification outbox or delivery exists. Pure bounded fixture computation runs locally in the request; real long-running research must move to durable jobs.
- Checkpoints and held reservations persist, but automatic crash/lease recovery is not implemented. A genuinely interrupted active run blocks subsequent runs until reviewed; synthetic interruption finishes in attention state while preserving its hold. Reconciliation primitives are tested; no automatic release of unknown usage is allowed.
- Live SIL identity/entitlement, customer access, Cloudflare resources/D1 execution and authorized Vercel preview are still absent. Production remains closed. New UI controls, clipboard/download behavior, keyboard and responsive rendering are compiled but not browser-accepted.
- No provisioning, deployment, publishing, notification, live research, paid API call or live pilot was performed. Existing live policy flags and zero budgets were not changed.

### Specific external dependencies for later work

The Pass 1 blockers still apply: verified server-side identity/SIL entitlement contracts and authorized test identity; selected/authorized Cloudflare and Vercel resources; provider/model/tool approval plus securely configured credentials, verified prices and hard spend authorization; real confirmed pilot properties; and explicit delivery sender/recipient/provider authorization. None blocks fixture-based Pass 3 implementation, but each relevant dependency blocks its live activation. Deployed browser acceptance additionally needs isolated persistent preview storage because the local SQLite demo intentionally denies Vercel execution.

### Next pass

**Build Pass 3 — subscription delivery foundation.** Start fixture-first with durable asynchronous baseline/update jobs, lease/checkpoint recovery, bounded retries, activation/pause and entitlement adapter boundaries, two shared weekly cycle keys, actual/provider usage reconciliation interfaces, and idempotent delivery preparation. Test overlap, crashes, replay, held reservations and duplicate-delivery prevention. Keep live scheduling, provider calls and sending disabled unless separately authorized and configured. Do not infer authorization to deploy, provision or send from this completed pass.

### Review instructions

Run `npm run dev:demo` from `C:\Users\Admin\Documents\Playground\SCOUT\SCOUT`. Enter the fictional demo, open **Administrator setup → Synthetic research workbench**, and run **baseline → update → quiet**. Review the new records in Market Blueprint and the coverage/usage in Updates. The original nine samples remain; the synthetic baseline adds three separate fictional activities. See `docs/PASS_2_ACCEPTANCE.md` for scenarios, module boundaries, cost math, limits and deferred live checks.


## 2026-10-21 — Build Pass 3 completed with synthetic fixtures

### Implemented

- Reused the existing application, offline engine, profile, scoped repository, credit ledger and UI. Added strict subscription command/view contracts, administrator API and **Subscription & delivery rehearsal** controls. Original specifications and previous status entries are retained.
- Durable property-scoped `fixture_subscriptions`, `fixture_jobs` and `fixture_deliveries`. Enqueue requests return without research; `npm run worker:fixtures` runs the separate finite local worker, at most 20 attempts, then exits. No daemon, cron or deployment was installed.
- One idempotent initial blueprint job per property. Explicit due-slot evaluation uses two configured weekdays, hotel time and IANA timezone, with shared local-week/slot keys for all enabled scouts. Repeated checks and DST repeated hours do not duplicate jobs. Manual fixture updates and quiet checks are distinguished from due slots. No past-day backfill occurs.
- Fictional activation, pause and entitlement revocation. Activation requires a confirmed profile and at least one unpaused scout; existing demo defaults remain paused. Worker claims and execution/delivery recheck activation, entitlement, confirmation, session expiry and property existence. Category pauses apply at execution. Real SIL entitlement remains unconnected and production access remains closed.
- Atomic claiming, unique property running-job constraint, 60-second owner leases, stale-worker fencing and three-claim retry ceiling. Jobs checkpoint queued -> research-committed -> delivery-prepared. Expired third attempts fail without resetting history. Paused jobs remain pending and resume within their remaining retry limit.
- Fixture research, findings, versions, changes, usage and the research checkpoint commit atomically. Actual child-process termination before commit rolls back offline computation; termination after commit resumes delivery without replaying research. This guarantee is limited to pure in-memory fixtures and does not establish safe recovery for paid external calls.
- Configurable artificial per-job/property-month credit ceilings, bounded by global limits. Reconciled usage and unknown holds count toward caps. Direct engine calls respect configured ceilings and activation, and cannot overlap queued/running jobs. Actual charged USD remains zero; provider pricing and live spend are unmeasured.
- Idempotent private delivery preparation using current recipients, finding quality and dismissal state, with unique property/recipient/change keys. Quiet cycles prepare nothing. Recipients are deduplicated; pause/revocation suppresses previews. No sender or transport exists and no preview is marked sent. Demo deletion cascades to jobs, usage and previews.
- Refreshable admin job history shows processing state, retries, checkpoints, errors and research outcome separately, so a processed partial cycle is not presented as complete coverage. Blueprint, Updates, exports and per-agent histories show committed results. Profile/workbench copy clarifies fixture behavior.
- Added `docs/PASS_3_ACCEPTANCE.md` with review steps, scheduling/recovery semantics, limits and production dependencies. Updated README and Cloudflare handoff. No dependency or SDK was added; the existing lockfile remains valid.

### Tests and results

| Check | Result |
|---|---|
| `npm test` | **39/39 passed**: previous 31 cases plus eight subscription/lifecycle integration cases |
| Process-level verification | Two independent workers race safely; actual child-process termination after reservation, after a completed scout and after research commit recovers to one run, 84 artificial credits and three unique previews |
| Lifecycle/security | Paused/revoked/expired access, stale leases, retry ceiling, baseline/update ordering, idempotent enqueue, strict scope/role checks, same-tenant property isolation, deletion, credit caps/holds, category pauses, recipient changes/dismissals and quiet-cycle duplicate prevention passed |
| Calendar | Two shared weekly keys, pre-time/day restrictions, hotel timezone and repeated DST hour checks passed |
| `npm run typecheck` | **Passed** |
| `npm run format:check` | **Passed** |
| `npm run build` | **Passed**, including `/api/demo/subscription` |
| `npm run test:http` | **85 assertions passed** against compiled loopback servers, including subscription disabled/anonymous/cross-origin/forged-scope rejection, activation, asynchronous/idempotent enqueue, property isolation and pause gates |
| Browser acceptance | **Not performed**; reserved for an authorized Vercel deployment |

Initial new tests exposed the deliberately paused demo defaults; activation now explains the required agent-page unpause action. A test fixture's empty coverage note was corrected to meet the existing validation contract. Final checks passed. Node 24 emits its expected experimental SQLite warning.

### Still synthetic, disabled or unverified

- Every job, source, provider output, usage quantity, rate-card credit and entitlement is fictional. No paid API, live research, notification, deployment, cloud provisioning or repository publication occurred. Real policy flags and zero live budgets were not changed.
- Due-slot evaluation and the worker require explicit local actions. No live or recurring scheduler is installed. Jobs snapshot the enqueue profile; category pause and delivery recipient state are rechecked later. Changing profile timezone changes local calendar interpretation.
- A job can finish processing with Partial/Needs attention research coverage; that result is shown separately. Unknown synthetic provider outcomes retain holds. Legacy orphaned Pass 2 active runs are not automatically reset. Retry-exhausted jobs remain failed for inspection rather than retrying forever.
- Atomic rollback/recomputation is safe only for the offline fixture adapter. A live adapter needs durable operation receipts, verified provider idempotency/status lookup, unknown-outcome accounting, real rate cards and distributed queue/lease integration. Local SQLite behavior is not proof of Cloudflare D1/Queues behavior.
- Delivery rows are disabled previews, not sent notifications. No provider, sender, send API or recipient authorization is configured. Adding recipients after a completed job does not backfill previous changes; suppressed previews are not automatically restored on resume.
- Earlier live research, geography/semantic interpretation, authentication, preview storage, responsive/browser and commercial-validation limitations still apply. The production route remains fail-closed; fixture activation cannot grant production access.

### Specific external dependencies and next build pass

**Build Pass 4 — authorized pilot and launch validation.** Before live work, obtain verified server identity/membership and SIL entitlement contracts plus test identity; authorized Vercel/Cloudflare resources and isolated durable preview storage; approved provider/model and securely supplied credentials with current prices and explicit hard spend authorization; confirmed Seattle/Portland pilot hotel details; and explicit notification provider/sender/recipient authorization. No IDs, endpoints or credentials were invented.

After those dependencies and authorizations exist, implement real adapters and receipt-based recovery, validate the deployed responsive interface, and measure successive pilot cycles for evidence quality, duplicate/material-update rates, actual API spend, correction/support effort and onboarding time. Reassess the $99 setup/$50 monthly hypothesis using those measurements. This completed fixture pass does not authorize activation, spending, deployment or sending.

### Local review

From `C:\Users\Admin\Documents\Playground\SCOUT\SCOUT`, run `npm run dev:demo`. Enter the fictional demo, unpause the desired scouts, then use **Administrator setup -> Subscription & delivery rehearsal** to activate and queue the blueprint. Run `npm run worker:fixtures` in another terminal and refresh status. Repeat with synthetic update and quiet-check jobs. Add fictional recipients in Hotel Profile for disabled delivery previews. Detailed steps and limitations: `docs/PASS_3_ACCEPTANCE.md`.


## 2026-10-21 — Build Pass 4 completed using synthetic fixtures

### Implemented

- Adapted the requested pilot/launch pass to the user's explicit synthetic-only scope. Retained all original specifications and historical status entries. No real hotel/property was inferred from the Seattle/Portland market names.
- Added `npm run pilot:fixtures`: a repeatable isolated two-market campaign using the existing repository, subscription jobs, shared scout engine, evidence checks, ledger and disabled delivery preparation. Disposable in-memory storage never opens or mutates the normal demo database.
- Added distinct fictional Seattle/Portland profiles, activity identities and source fixtures. Each runs one baseline and four shared Tuesday/Friday update slots over a virtual two-week calendar: material update, quiet, source outage and cancellation/completion. Repeated slot enqueue checks idempotency. Internal recorded provider responses exercise those outcomes without adding any browser provider override or network transport.
- Generated `reports/synthetic-pilot/REPORT.md`, `results.json`, two labeled blueprint CSVs and a blank human-review JSON template. Reports include record duplication denominators, material changes, coverage outcomes, evidence/unknown contracts, baseline versus recurring credits, disabled preview counts and launch gates. No token or tenant/property identity is exported.
- Added strict optional manual fixture-review ingestion with bounded file size, nonnegative onboarding/correction times, bounded usefulness counts and notes. No human review was fabricated; live accuracy and coverage stay null. Review observations are explicitly synthetic and cannot grant production readiness.
- Added an administrator commercial-assumption calculator. It separates setup and monthly contribution, preserves unknown inputs, shows negative contribution and states excluded overhead. No provider cost, margin, profitability or customer outcome is inferred from artificial credits.
- Added public `/sample` and `/sample/export` pages with an explicit three-scout bundled-fiction allowlist. The sample separates facts, lodging inference, unknowns, evidence dates and version context. It reads no private workspace/pilot data and initiates no research. Added the sample link and removed the stale Build Pass 1 footer. No invented source was labeled verified.
- Added `docs/PASS_4_ACCEPTANCE.md`, updated README and retained the lockfile without new dependencies or provider SDKs.

### Measured fixture outcomes

| Per fictional market | Seattle | Portland |
|---|---:|---:|
| Baseline / shared update jobs | 1 / 4 | 1 / 4 |
| Final unique records | 3 | 3 |
| Duplicate records / final records | 0 / 3 | 0 / 3 |
| Material version changes across updates | 6 | 6 |
| Disabled delivery previews | 9 | 9 |
| Baseline artificial credits | 84 | 84 |
| Four updates' artificial credits | 336 | 336 |
| Actual charged USD | $0 | $0 |

Both campaigns passed. Quiet cycles produced zero changes/previews. Source outages showed Partial coverage while preserving the accepted contractor; later cancellation/completion produced version changes. All sources remained fictional, last-verified dates remained null, and lodging unknowns stayed visible. These small deterministic fixture outcomes do not measure real market completeness, factual accuracy, same-market reuse or commercial viability.

### Tests and results

| Check | Result |
|---|---|
| `npm run pilot:fixtures` | **Passed**, report bundle generated for both virtual campaigns |
| `npm test` | **43/43 passed**, including four new pilot/review/commercial/public-sample cases; previous scope, evidence, budget, lease and real child-process recovery cases still pass |
| `npm run typecheck` | **Passed** |
| `npm run format:check` | **Passed** |
| `npm run build` | **Passed**, including new sample and download routes |
| `npm run test:http` | **89 assertions passed**, including public sample/download with demo disabled and existing access, mutation, async enqueue and isolation checks |
| Browser acceptance | **Not performed**; reserved for an authorized Vercel deployment as requested |

Node 24's expected experimental SQLite warning remains. No dependency installation or lockfile change was necessary. No local browser test was substituted for deployed acceptance.

### Simulated, unverified and disabled

- Every market profile, organization, event, source, cycle date and usage unit in this rehearsal is fictional. Virtual dates are not dates of real research. The source registry is entirely offline and actual charges are zero.
- Human usefulness, evidence accuracy, geographic completeness, onboarding/correction/support effort and profitable delivery remain unmeasured. The optional review input is available, but no human observations were supplied in this pass.
- Public samples remain fictional rather than verified live findings. The commercial calculator computes assumptions only; absent inputs do not become zero-cost profitability claims.
- Production authentication/SIL entitlement, persistent cloud storage/queues, external provider receipts/idempotency, and live research transport remain unimplemented/unverified as previously documented. Fixture transaction recovery cannot be used as proof of external paid-call recovery.
- No real pilot, deployment, provisioning, publication, paid API call or notification occurred. Sending has no transport. Production access remains fail-closed, live budgets/flags unchanged, and no recurring scheduler was installed.

### External dependencies and next pass

The four local fixture passes are complete. **Next: an explicitly authorized integration and live-pilot release pass**, not automatic launch. It requires verified identity/membership/SIL entitlement contracts and test identity; authorized Vercel/Cloudflare resources and isolated durable preview storage; approved research provider/model, securely supplied credentials, current pricing and explicit hard spending limits; confirmed Seattle/Portland hotel briefs; human quality and effort review; and separately authorized notification provider/sender/recipients. Browser acceptance additionally requires the authorized deployed preview. None of these contracts, IDs, endpoints or credentials was fabricated.

After those gates are satisfied, implement real adapters and receipt-based recovery, run authorized successive live cycles, validate responsive/browser workflows, and review actual costs and human effort against the working $99 setup/$50 monthly offer. The present fixture pass does not establish production readiness or grant permission for those actions.

### Local review

Run `npm run pilot:fixtures` from the project root and open `reports/synthetic-pilot/REPORT.md`. Run `npm run dev:demo` to review `/sample`, its downloadable CSV and **Administrator setup -> Test the offer against your assumptions**. For optional manual fixture review, copy `review-template.json` to a separate file, enter actual fixture-review observations, and run `npm run pilot:fixtures -- --review-file <your-file.json>`. Detailed semantics and launch gates are in `docs/PASS_4_ACCEPTANCE.md`.


## 2026-10-21 — Deployed QA fixes

- Public header/hero and production access-page actions now lead to the working fictional sample. Each scout example links directly to its sample section. Removed the sample page's unavailable workspace CTA.
- Mobile navigation wraps visibly instead of hiding the sample and section links. Removed duplicated SCOUT branding from sample metadata.
- Disabled hosted demo routes render a server-side availability message and sample link, without starting client workspace requests or offering a failing session button. Removed local CLI instructions from visitor-facing copy. Explicit local demo access remains supported; API production and Vercel gates remain unchanged.
- Local validation passed: 43 tests, 91 compiled HTTP assertions, typecheck, format check and production build. Hosted browser recheck follows the authorized GitHub push and is reported in the task completion.
- Live research, paid calls and notification delivery remain disabled. This update improves the public sample experience; it does not enable a hosted customer workspace or establish production readiness.


## 2026-10-21 — Full isolated demo for Vercel

- Implemented a dedicated public synthetic sandbox instead of enabling the unsafe filesystem adapter on Vercel. Each request creates a fresh in-memory repository with a server-generated tenant/property scope; only validated fixture commands are accepted. No customer identity, credentials, existing property scope, database path, provider or live endpoint is accepted from the browser.
- Added browser-local action history and snapshots, seven-day expiry, explicit deletion and Web Locks for cross-tab mutation ordering. Reloads retain changes; different browser profiles/incognito contexts have separate state. Same-profile tabs intentionally share it. No cross-device account or hosted durable database is claimed.
- Connected the entire workspace to this transport: Overview, searchable/filterable Blueprint, details, save/dismiss/restore, copy, CSV export, all three agents, coverage, profile, guided setup, Updates and research scenarios. Public entry buttons now start the full fictional demo. The sample page remains available.
- Added an in-browser action to process one queued fixture job. Hosted activation, baseline, updates, quiet cycles, credit accounting and disabled delivery previews work without local commands. This manual sandbox computation is not a hosted durable worker or automatic scheduler. Existing local worker APIs and Vercel gates remain intact.
- Added strict body/command/time limits: 256 KB, 128 changes, 12 research/worker actions, bounded engine execution. No network research/model tools or sending transport exists. Reads/filter/export use the saved browser snapshot; writes replay bounded pure fixture history to reconstruct state. This approach is unsuitable for paid or side-effecting provider calls.
- Added `docs/HOSTED_DEMO.md` and updated README. Real customer information must not be entered; browser persistence is not a production access model.
- Local verification: **47/47 tests passed**, including sandbox reconstruction, isolation, retained save state, idempotent jobs, quiet updates, pause/entitlement gates, expiry, strict identity/provider rejection and ceilings. **100 compiled HTTP assertions passed**, including same-origin, oversized input, no-store and fresh-request isolation. Typecheck, formatting and production build passed. Hosted browser acceptance follows the authorized push.
- No new package, credential, cloud database or paid API resource was introduced. Production `/api/workspace` still returns 503. Live research, paid calls and notification delivery remain disabled. Hosted deployment is authorized for this requested demo update; it does not activate the production service.

### Deployed acceptance completed

- GitHub commit `ee2b9dd` deployed successfully to `https://scout-olive-ten.vercel.app/`. Browser acceptance ran against that deployed app, not a local browser server.
- Passed: full demo entry and Overview; Blueprint search/scout filtering; finding save, dismiss, restore, reload persistence and actual clipboard copy; filtered CSV download; profile edits; independent-browser isolation; Corporate/Project/Event coverage edits and run history; fictional subscription activation; queued baseline, meaningful update and quiet check processing; guided setup; Updates; exit/deletion and fresh entry.
- Passed responsive navigation and no outer-page overflow at 390px and 320px. Concurrent saves in two same-profile tabs retained both changes after reload. No browser console errors or uncaught page errors occurred in the full acceptance run.
- Confirmed all six generated delivery previews remained `prepared-disabled`, actual charged usage remained zero, and production `/api/workspace` plus legacy hosted `/api/demo/workspace` returned 503. No live research, paid API calls or notifications were enabled or performed.
- Remaining limits: synthetic data only; browser-profile-local storage with seven-day expiry and bounded history; manual fixture processing, no automatic hosted scheduler; no customer authentication, durable cloud customer storage or verified SIL/provider integration. This is a working hosted demo, not production customer readiness.
- Next pass: only after explicit authorization and verified external contracts, implement real identity/entitlement and durable customer storage, then separately authorize research and delivery integrations. No external dependency blocks the completed synthetic demo.

## 2026-10-21 — Customer account and persistent data foundation (local implementation)

### Inspected and reused

- Inspected the current sibling SIL canonical access/persistence standards, customer-portal schemas, generic customer-auth login/session-status routes, credential/session validation service, app auth registry and service authentication. Inspected Hotel Review Desk's trusted server SIL client pattern. No sibling checkout was modified.
- SIL has verified generic server-to-server login and session revalidation contracts, but **SCOUT is absent from the inspected app registry/config/schema**. No SCOUT app key, scoped service credential, property mapping or customer grant was invented. Authentication/password administration remains SIL-owned.

### Implemented

- Dedicated customer Worker and D1 binding adapter, separate from demo storage. Typed login/read/update/logout operations; no arbitrary SQL transport or research/send operations. Added migration `0002_customer_accounts.sql` for private properties, local memberships, hashed sessions, optimistic revisions, audit triggers and durable login limits.
- Verified SIL HTTP adapter validates app/scope/version, denies password-change-required access and rechecks SIL on every authenticated operation. A random eight-hour opaque session is stored only as a hash in D1; Next issues a Secure/HttpOnly/SameSite=Strict host cookie. Local revocation, role/property access changes, expiry and logout invalidate sessions. Temporary SIL/database failures deny access without switching to fixtures.
- Next server-only broker and same-origin, bounded JSON login/logout/workspace routes; strict scope rejection; private/no-store responses and authenticated profile JSON export. Server derives scope from the session. Viewer is read-only; editor/admin can update profile/coverage. Concurrent edits return a conflict instead of overwriting. Database-trigger auditing is atomic with profile changes.
- Customer `/app` sign-in and workspace UI: hotel/profile setup, market boundaries, coverage for all three scouts, Overview/Blueprint/Updates empty states, revision/conflict feedback, reload/export and sign-out. Customer accounts start empty; there is no synthetic data import or pretend live research history. Existing demo remains isolated.
- Added offline operator SQL preparation for verified local assignments, revocation and confirmed property erasure. It cannot create SIL identities or entitlements and does not execute SQL. Documented configuration, release/recovery checks and exact external blockers in `docs/CUSTOMER_FOUNDATION.md`; supplied disabled configuration templates without resource IDs or credentials.

### Tested

- **58/58 tests passed**, including eleven customer foundation tests: persistent SQLite reopen through the D1 statement interface, cross-tenant/same-tenant property isolation, viewer denial, concurrent/stale saves, audit rollback, local/SIL revocation, role changes, expiry/logout, durable login throttling, strict verified SIL request/response contracts, typed Worker positive/negative flow, and offline provisioning/revocation/erasure isolation.
- **108 compiled HTTP assertions passed** for existing demo regressions plus customer-disabled, no-cookie, no-store, origin and forged-scope rejection. An initial origin-normalization mismatch was corrected; final checks passed.
- Typecheck, formatting and optimized Next production build passed. Customer Worker bundled for the browser/Worker target using the installed esbuild dependency; no Node-only runtime dependency was introduced into the Worker.
- Tests use disposable SQLite and stub SIL contract responses. No local browser test was performed; no real SIL account call, production database mutation, migration, cloud provisioning, push or deployment occurred in this pass.

### Still blocked or unverified

1. SIL owner must register SCOUT, confirm the canonical app key and scoped service-principal route permissions, and assign verified users/properties/entitlements/mappings/defaults. Existing generic routes alone do not prove SCOUT login is supported. No other app's grant may be reused.
2. Authorized dedicated SCOUT D1/Worker resources, approved migration execution, HTTPS route, and securely supplied Vercel/Worker secrets are required. Local SQL compatibility and a bundle check are not remote D1/Worker acceptance.
3. Real account login/revocation and cross-device persistence, deployed cookie/UI behavior, operational monitoring, approved retention policy and an isolated backup/restore rehearsal remain release gates. Configured authenticated Next-to-Worker behavior needs the approved deployment; disabled Next routes and Worker/service flows were tested separately locally.
4. This phase persists customer profiles and coverage only. Real findings ingestion/assessment/state persistence, evidence integration and research subscription delivery remain separate work; customer findings stay empty. Primary account creation, resets and property default administration remain SIL-owned.

### Disabled and next pass

Live research, paid provider calls and notifications remain disabled by customer contracts and the Worker operation allowlist. No schedulers, model tools, sending transports, billing integration or cloud research jobs were added. Customer activation defaults false on both hosts, and no live resource configuration exists.

Next: an explicitly authorized SIL registration and infrastructure integration pass. Confirm upstream contracts and scoped grants, configure the dedicated Worker/D1 deployment, apply reviewed migrations, prepare verified local memberships and run deployed authenticated acceptance and recovery checks. Keep research, paid calls and notifications disabled during that pass. The account/data foundation is implemented locally, **not activated or certified production-ready**.


## 2026-10-21 — SIL registration and dedicated Worker/D1 integration

- Registered SCOUT in SIL using canonical customer login/session contracts, explicit property mappings/direct entitlements, and an auth-only service principal scoped to two internal QA hotels. Existing service credentials, registrations and customer accounts were preserved. SIL commit `8b8baea` is pushed and deployed.
- Created dedicated `scout-customer-production` D1, applied migrations 0001/0002, deployed `scout-customer-foundation`, and configured private Vercel/Worker secrets. Both internal accounts passed actual SIL and Worker workspace checks. No research/provider/notification bindings or schedulers exist.
- Fixed Cloudflare redirect compatibility and D1 trigger-inclusive mutation counts; writes now use RETURNING rows for reliable success/conflict detection.
- SIL validation: 2,226 tests passed, 12 existing skips, typecheck and production webpack build passed. SIL lint command reports no configured ESLint check. SCOUT local and deployed acceptance results will be recorded after this release check.
- Account foundation commit `ebd6591` is pushed and deployed to Vercel. Research, paid calls and notifications remain disabled. No real market findings are populated.

### Deployed acceptance results

- **Passed on Vercel:** public customer sign-in link; invalid account denial; both real SIL-authenticated internal accounts; Secure/HttpOnly/SameSite=Strict host cookie; empty customer findings and disabled capability flags. No browser request contacted SIL or the Worker directly.
- **Passed:** profile/coverage save and reload; the same account in an independent browser sees the saved profile; a second tenant remains empty. Three scout pages show saved coverage and paused/empty research, Updates shows no runs, authenticated profile download works.
- **Passed:** forged tenant/property inputs and cross-origin writes denied; concurrent same-revision writes produce one success and one 409 conflict; logout invalidates replay of the old cookie.
- **Passed:** temporary SIL entitlement revocation blocks an active session and restoring the grant does not resurrect it. Viewer role disables UI edits and returns 403 for direct writes while allowing read/export; restoring editor membership invalidates old sessions and permits a fresh login. Only the two newly provisioned internal QA scopes were used; both were restored to their intended grants/roles.
- **Passed:** 390px and 320px customer layout without outer overflow; no uncaught browser errors. Visual review found cramped status-banner typography, corrected with a dedicated customer notice style.
- **Passed full existing hosted-demo regression:** entry, search/filter, save/dismiss/restore, reload, copy, CSV, profile isolation, all agents, fixture jobs/baseline/update/quiet cycle, guided setup, mobile navigation and demo deletion. No browser console errors; delivery previews stayed disabled and actual research charges stayed zero.
- **SCOUT checks:** 59 tests passed (including redirect rejection), typecheck, format check, production build and 108 compiled HTTP assertions passed. No new dependency or lockfile change was required.
- **Recovery evidence:** dedicated remote D1 export restored into a new isolated local SQLite file; two properties, one saved profile, revision 1 and integrity_check=ok. Export/restore artifacts remain private and ignored. This is not a remote D1 recovery rehearsal or an RTO guarantee.

### Remaining boundaries and next pass

The account/persistent-profile foundation is activated for two clearly labeled internal acceptance hotels. This is not an unrestricted customer launch. New real customer accounts require verified SIL onboarding, explicit principal scope, mappings/entitlement and restrictive SCOUT membership. No existing customer account or password was changed.

Customer findings ingestion, evidence storage integration, researched finding save/dismiss/export, live research and twice-weekly execution are not activated. Research, paid API calls and notifications remain disabled; no scheduler, provider or sender binding was created. The public synthetic demo remains separate.

Next: onboard an approved real hotel through the verified SIL/local membership process; establish retention, operational monitoring and backup policy; rehearse recovery into an isolated remote target. Any real research integration or notification work requires a separate explicit authorization and provider/cost gates. The SIL/Worker/D1 dependency blockers from the local pass are resolved; commercial/live-research readiness is not claimed.

### Final redeployment recheck

- Vercel application revision `c1bf890` and SIL revision `304029a` are Ready. After redeploying both SCOUT Vercel and its Worker, the existing session still read the saved profile and coverage at revision 2. A fresh browser login, persistent profile read and logout also passed. Direct unauthenticated Worker access returned 403.
- Remote D1 read-only verification confirmed two properties, one saved profile, revision 2 and two corresponding workspace audit records. Final 320px/390px screenshots confirmed the corrected customer notice and no overflow.
- Repeated acceptance sign-ins reached the intended per-account rate limit (429). The test waited for the normal 15-minute window to expire; no limit was reset or bypassed. Fresh sign-in then succeeded.
- The SQLite test adapter now reproduces D1 trigger-inclusive change counts, and Worker tests explicitly reject a non-SCOUT app key. Final regression: 59 tests, typecheck and formatting passed. This final follow-up changes tests/documentation only; deployed runtime remains the verified account foundation.


## 2026-10-21 — ABC Hotel local onboarding

- Verified the supplied ABC Hotel tenant/property/user/email against live SIL: active tenant, property and user, GM property access, enabled SCOUT entitlement and active mapping. The SCOUT service scope now passes SIL validation. No SIL configuration or credential was changed by this pass.
- Used customer:prepare-access to generate reviewed local assignment SQL. Added a conflict-ignore guard to the operator SQL for the exact membership key, preserving existing roles, activation flags and profile data. Applied it to dedicated SCOUT D1 and replayed it: second application wrote zero rows; one active ABC Hotel property and one active editor membership exist.
- Actual deployed sign-in succeeded using the credentials already entered by the owner in Chrome; the UI opened ABC Hotel and displayed its customer workspace with research disabled. No credential value was inspected, copied, reset or persisted. Deployed app revision remains 977794b; no runtime code fix or deployment was needed.
- Persistence acceptance is pending owner-supplied required profile details (website, address, timezone, market center and included places). Profile form is open for entry. Do not substitute invented hotel details or claim save/sign-out/sign-in persistence until the full browser sequence is complete.
- Live research, paid calls and notifications remain disabled.

## 2026-10-21 — Name-only customer draft profile

- Added a separate customer draft schema: Hotel name is the only required profile field. Blank optional website/address/timezone/market fields, empty lists and a null radius are retained honestly; no research schedule or market radius is invented. Supplied website/timezone/radius values remain validated. The complete research-brief schema remains unchanged.
- Customer form now requires only name and explains draft saving. Worker and Vercel use the same draft contract. Existing complete profiles remain compatible; auth, role, revision and tenant isolation checks are unchanged.
- Local verification: 60 tests passed, including name-only save/logout/login persistence, invalid optional values and complete-profile compatibility. Typecheck, production build and 108 HTTP assertions passed. Deployed ABC Hotel save/re-login verification follows deployment.
- Live research, paid calls and notifications remain disabled.

### Draft deployment and ABC Hotel acceptance

- Pushed/deployed SCOUT revision cecfa24; Worker version fbe72237-89dc-4c7a-a70b-2997a2b68c03. The initial local Next build worker exited unexpectedly during page collection; an unchanged rerun passed, followed by all 108 HTTP assertions. Vercel deployment is Ready.
- On the deployed ABC Hotel session, saved only Hotel name = ABC Hotel, leaving optional fields empty. UI confirmed Hotel profile saved; remote D1 confirmed revision 1, name ABC Hotel, blank website and null radius. Signed out successfully and returned to the login form.
- Final production persistence check PASSED: owner entered the existing SIL password directly in Chrome and signed in again. The authenticated UI opened ABC Hotel, stated the profile was saved, and Profile showed Hotel name ABC Hotel with all optional fields still blank. This completes actual save -> sign-out -> fresh sign-in -> profile read verification. No password was requested in chat, read, reset, or stored by the operator. Research, paid calls and notifications remain disabled.

## 2026-10-21 — Focused UI refinement and approved branding

- Added proportionate WebP logo/icon and PNG favicon/Apple derivatives from the approved root JPEGs. Originals are preserved. The main image's visible checkerboard is baked into its opaque JPEG, and the icon has a white background; neither was removed or cropped. Shared branding covers public, demo and customer/sign-in surfaces.
- Compact overview coverage/status, full-width findings and linked counts. Updated means the most recent recorded material-change update; its actual date is shown separately from the latest quiet/incomplete cycle. Filters, saved/dismissed access, date/change sorting and explicit filtered-export IDs preserve result membership.
- Added concise relevance/inference lines, readable text badges, ordered detail sections, collapsed version history and direct named change links. Internal record/source IDs remain stored and available in CSV/audits, but are removed from detail/brief presentation. Existing customer data/auth boundaries are unchanged; customer findings remain empty.
- Demo notice now states the implemented seven-day lifetime (from demo creation, not sliding), with an accessible disclosure. Research/sending remain disabled; administrator technical controls are retained.
- Local checks: 62 tests passed, TypeScript passed, format check passed, production build passed, 108 compiled HTTP assertions passed. One new assertion initially matched an ID embedded in a legitimate evidence URL; corrected it to check removal of the internal ID label while preserving evidence links.
- Deployed desktop/390px/320px acceptance and screenshots pending the UI deployment. No Worker/schema/auth changes or new dependencies. Live research, paid calls, scheduling and notifications remain disabled.

### Deployed UI acceptance

- Published UI revisions `12a1666`, `83267e3`, and `289e904` to the existing GitHub main branch and Vercel production app: https://scout-olive-ten.vercel.app/. All deployments completed successfully. Two visual corrections followed the first deployed check: UTF-8 separators/disclosure padding and removal of a duplicate observation in Sources. TypeScript and production build passed after the encoding correction; TypeScript and Vercel production build passed for the final source-text correction.
- **Passed desktop, 390px and 320px:** overview, findings and detail layouts; no outer page overflow. All three agent pages and Updates also fit at 320px. Mobile navigation opens/closes correctly. Keyboard arrow navigation switches tabs and focus; demo/version disclosures open and close by keyboard. No browser console errors were observed.
- **Passed summary/filter consistency:** overview 9 all-record findings -> 9 rows; 2 needing verification -> 2 rows; 3 materially changed in the October 16 sample update -> 3 Updated rows. October 20 is separately labeled a completed quiet check with zero new/changed findings. The partial October 13 cycle is explicitly incomplete coverage. Updated links to the matching historical entry.
- **Passed actions:** search, evidence filters, relevant-date sorting (unknowns last), material-change sorting, Save, Saved tab, Dismiss, Dismissed view, Restore, Copy and row selection. Restored the test finding to its original unsaved/not-dismissed state. Updated filtered CSV was downloaded and inspected: exactly Alder Research Campus, Northbank Bridge Renewal and Harbor Youth Invitational, all labeled FICTIONAL DEMO. Selected CSV contained only Alder Research Campus. Existing print action remains wired; an actual printer/PDF output was not tested.
- **Passed details/agents:** ordered facts -> inference/visible unknowns -> dates -> sources; observation appears once; version history starts collapsed; internal ID labels removed while source URLs remain. Update entries link full finding names with recorded version summaries. Each agent has working Findings/Coverage/Run history tabs and three category findings without the redundant Scout column.
- **Passed branding:** main image at its 3:2 ratio on public header/sidebar/sign-in, compact square icon on mobile. Sign-in checked in an isolated guest session without touching the owner's credentials. All five deployed image derivatives returned 200 with expected dimensions; favicon and Apple metadata point to the new assets. Public offer remains $99 setup + $50/month.
- **Customer regression:** existing authenticated Chrome session opened ABC Hotel, displayed its saved-profile status and no demo findings, and retained the disabled research notice. Compact customer header fits 320px. No customer writes, sign-out, auth/storage changes, Worker deployment, live research, paid calls, scheduling or notifications occurred during this UI pass.
- Screenshots saved locally at `C:/Users/Admin/AppData/Local/Temp/scout-deployed-qa/ui-refinement/`: overview-desktop.png, findings-desktop.png, detail-desktop.png, plus 390px/320px counterparts and sign-in.png.
- No functional blocker for this UI pass remains. Artwork limitation: the approved main JPEG includes an opaque checkerboard and light text; the supplied appearance was preserved exactly. A genuinely transparent/vector original would be needed to remove that background cleanly. Original root JPEGs remain untouched and unstaged; web-ready copies are committed.
- Next implementation remains the separately scoped real-findings persistence/ingestion foundation described above. This release improves presentation and does not activate customer research or establish production research readiness.

## 2026-10-21 — Real-findings persistence and ingestion foundation (local)

- Added opt-in D1-compatible customer market, ingestion batch and private finding-state tables in `0003_customer_findings.sql`. Migration enrolls no properties and does not alter profile data. Scoped snapshots retain findings, evidence/claims/retrieval receipts, material versions, separate lodging inference/unknowns and run history. Batch commit and audit are atomic; exact retries do not duplicate findings or changes, and stale/concurrent writes fail safely.
- Added a disabled-by-default, separately authenticated Worker ingestion endpoint with server-configured tenant/property scope. Synthetic imports require isolated `fixture_` scopes and `.example` sources; mode changes are blocked. No provider, source fetcher, research schedule or notification is connected. No configuration was activated.
- Customer workspace now renders persisted findings across Blueprint, agent and Updates views, with evidence/history, filtering/sorting, durable save/dismiss/restore, copy and tenant-scoped CSV. Existing draft profile and SIL authorization boundaries remain in place. Unenrolled customers continue to receive an empty findings list.
- Added `npm run customer:fixtures` and `docs/CUSTOMER_FINDINGS.md` with operator boundaries, migration/release order and honest storage/trust limitations. Fixture harness created three findings and two cycles at revision 2 in a disposable local database; research, paid calls and notifications all remained false.
- **Verification passed:** 69 automated tests, TypeScript, production build, formatting and 111 compiled HTTP assertions. New cases cover file-backed persistence after logout/reopen/login, same-tenant property and cross-tenant isolation, viewer/revocation restrictions, concurrent revision writes, repeat-safe imports, audit rollback, quiet cycles, old/conflicting facts, distinct event editions, cross-category deduplication, source/input bounds and scoped export. Two new test-fixture mistakes (omitted primary category and an invalid status spelling) were corrected; final tests pass. No browser was used locally.
- **ABC Hotel preserved:** no production database, profile, membership, SIL configuration or session was changed. An isolated local ABC-named sentinel profile verified migration/import noninterference; this is not a new production sign-in verification. No synthetic rows were imported into ABC Hotel.
- **Not yet released or verified:** no push/deployment/remote migration in this pass. Cloudflare D1 runtime execution and Vercel browser acceptance of these new changes remain unverified. Source receipts/quotes are trusted importer assertions, not independently verified research; no real findings are claimed. Snapshots are bounded (1 MB / 500 findings / 200 cycles / 100 evidence entries and versions per finding), and batches retain cumulative snapshots; retention/scaling work is required before sustained ingestion.
- **Next pass:** authorize an isolated hosted acceptance release: migrate a separate fixture D1 database, deploy the matching Worker and Vercel build, then verify synthetic customer sign-in, import replay, Blueprint/evidence/CSV, private save/dismiss persistence and isolation. Keep ABC Hotel unenrolled for synthetic imports. After hosted acceptance, build the reviewed-source preparation/approval workflow and retention policy before separately approving real customer imports. Live research, paid calls and notifications remain disabled throughout.

## 2026-10-21 — Findings-first demo UI release

- Published UI commits `97d3ed8` and `de4d419` to GitHub main; Vercel production deployment `scout-cqm4ii6ws-parrieb-9172s-projects.vercel.app` is Ready and aliased to scout-olive-ten.vercel.app. Only demo presentation and shared CSS were released; the pending customer findings persistence implementation remains local and uncommitted.
- Demo now lands on Market Findings with Findings, Saved, What’s changed and Hotel Profile navigation. Research coverage/setup remains available under a secondary disclosure. Search is immediately available; Filters & sort is collapsed to keep findings visible on mobile.
- Responsive finding cards show full date ranges, activity status, observed facts, hotel relevance labeled as inference, explicit unknowns, latest material change and last check. Detail dates precede relevance; record metadata follows the main detail content. Default current/upcoming view excludes Completed/Canceled; those remain in an explicit historical view, Saved and changed views.
- Local verification: 69 automated tests, TypeScript, formatting, production build and 111 compiled HTTP assertions passed. First local build encountered a Windows Next worker heap failure; unchanged rerun passed. The mobile filter refinement also passed typecheck/build and the Vercel production build.
- Deployed desktop and emulated 390px/320px QA: readable cards and detail, no page horizontal overflow, mobile navigation and Saved route, search, category filtering, historical activity, changed results, Save/Unsave, Dismiss/Restore and Copy passed. Demo record preferences restored. Historical view showed Old Mill Refit and Riverlight Weekend; category Events showed two current findings and one historical canceled finding; Recently changed showed the three expected records.
- CSV download verified from disk: filtered export contained Alder Research Campus, Northbank Bridge Renewal and Harbor Youth Invitational 2027; selected export contained only Alder Research Campus. Every row is labeled FICTIONAL DEMO. Browser download-event capture timed out, but the actual downloaded CSV files were independently inspected successfully. No browser console errors observed.
- Screenshots: C:/Users/Admin/AppData/Local/Temp/scout-findings-desktop.png and scout-findings-mobile.png. Mobile checks used viewport emulation, not physical devices; viewport restored afterward. Print output and fresh customer authentication were not tested in this UI pass.
- ABC Hotel: no customer data, memberships, sessions, SIL settings, Worker resources or migrations changed. Live research, paid calls and notifications remain disabled. Next backend pass remains isolated hosted acceptance of the separately prepared ingestion foundation.

## 2026-10-21 — Isolated hosted findings acceptance completed

- Pushed the foundation on `codex/hosted-findings-acceptance`, commits `c0f3156` and `bb8ab9f`. Production main remains `de4d419`. No merge/promotion, production Worker deployment or production D1 migration occurred; ABC Hotel's data, membership, credentials and SIL settings were untouched.
- Created isolated D1 `scout-findings-acceptance` (`ccef2c7a-8e1d-4b32-87ba-27ac15bd7a35`) and Worker `scout-findings-acceptance.parrieb.workers.dev`. Applied only customer migrations 0002/0003 and fixture provisioning there. 3 fixture properties and 4 memberships; repeat provisioning wrote zero rows; no nonfixture properties exist.
- Final Vercel preview: https://scout-8bggx7sxb-parrieb-9172s-projects.vercel.app/app , source `bb8ab9f`. Deployment-scoped overrides use only the acceptance Worker. Synthetic auth is in a separate Worker entrypoint, never a production fallback; login clearly warns against real passwords. Authentication transport is simulated, not a successful real SIL test.
- **Passed:** 70 local automated tests, typecheck, formatting, production build and 111 compiled HTTP assertions. Repeated Windows build worker failures were resolved by bounding Next build workers to two; local and Vercel builds then passed. Initial hosted harness assertion used the wrong capability field names and was corrected; the actual contract's three disabled capability flags were verified.
- **Passed hosted Worker:** 38 assertions for baseline, exact replay, quiet cycle, material version, stale/forged scope rejection, saved/dismissed persistence, same-tenant neighboring property isolation, cross-tenant isolation, viewer rejection and logout invalidation. Remote D1 confirms market revision 3, three findings, three cycles and three ingestion audit events.
- **Passed browser acceptance:** actual synthetic sign-in through Vercel, three persisted findings, evidence with old/new claims and dates, quiet/material update history, search, Save, Saved view, profile save, sign-out, Worker redeploy and fresh sign-in. Saved flag and profile value `Fictional hosted acceptance — persisted` remained present. Direct D1 corroborated profile revision 1 and saved-state revision 3. Browser session signed out at completion.
- **Confirmed fix:** direct attachment navigation encountered Chrome ERR_BLOCKED_BY_CLIENT. Customer CSV now uses authenticated fetch/download and displays failures in place. Final downloaded CSV was inspected: exactly one filtered corporate finding, updated end date 2026-12-01, FICTIONAL SYNTHETIC FIXTURE label. Copy confirmed the labeled brief in clipboard. 390px evidence view had no horizontal overflow; no console errors observed on final preview. Temporary browser viewport restored. Screenshots: C:/Users/Admin/AppData/Local/Temp/scout-hosted-acceptance-saved.png, scout-hosted-acceptance-profile.png, scout-hosted-acceptance-mobile.png.
- **Closed test ingestion:** deployed Worker version `8e66e36f-45ac-4e8b-942a-73a9ee07986a` with INGESTION_ENABLED=false; credentialed POST returns 403. Subsequent session/read confirmed durable data and researchEnabled=false, paidCallsEnabled=false, notificationsEnabled=false. Acceptance access expires October 22, 2026 at 4:00 PM PDT, after which requests fail closed. No scheduled cleanup or notifications were created; retained resources contain only synthetic fixtures.
- **Next pass:** reviewed-source preparation and approval, retention/scaling design, then a separately authorized production migration and real SIL/customer acceptance. This pass proves isolated hosted persistence/ingestion, not live research quality or production activation. Customer account UI parity with the findings-first demo remains a distinct presentation task.


## 2026-10-21 — Findings foundation production promotion

- Promoted tested findings foundation to main, application revision `0bf43af`. Production Vercel deployment `dpl_CeKcuKfqENZYyUQwi1Di4WWeXhyd` (`scout-1lkyg3wr0-parrieb-9172s-projects.vercel.app`) is Ready and aliased to `scout-olive-ten.vercel.app`. This is a production build using existing production configuration, not promotion of the synthetic preview.
- Applied only pending additive migration `0003_customer_findings.sql` to production D1. Deployed production entrypoint `customer/worker.ts`, Worker version `bb0e32ed-c4a0-4f9f-81a5-91a77fb1a763`. Explicit `INGESTION_ENABLED=false`; actual POST /ingestion returns 403, Ingestion is disabled.
- Production environment uses real SIL-backed production Worker; SCOUT_HOSTED_ACCEPTANCE is absent. No synthetic provisioning ran. New market and ingestion tables contain zero rows; ABC Hotel is not enrolled for ingestion. Synthetic acceptance data remains in its separate database/Worker.
- Verified ABC mapping tenant_abc / property_abc_abc_hotel with existing membership. Before/after migration profile, coverage, membership and revision were identical. Existing authenticated browser session opened ABC Hotel workspace. Saved the existing approved profile without editing any fields; UI confirmed saved and D1 revision advanced 2 to 3. Profile JSON, coverage JSON and membership remain byte-for-byte identical to baseline.
- Fresh checks: 70/70 tests, TypeScript, production build passed. Production browser shows no researched findings and all research/paid-call/notification controls off.
- Signed out for a fresh real SIL login. Owner password entry is required in Chrome; fresh sign-in and post-login profile display remain pending, not claimed complete. No password reset or SIL configuration change.
- Next: finish owner-entered sign-in and confirm revision 3 profile; then separately authorize reviewed-data enrollment/import when actual source-backed findings are available. Live research, paid calls and notifications remain off.


## 2026-10-21 — Production ABC Hotel acceptance completed

- Owner entered the existing SIL password directly in Chrome. Fresh production sign-in opened ABC Hotel workspace at https://scout-olive-ten.vercel.app/app on the production release following `da96448` (documentation only after application revision `0bf43af`). No credentials were read or copied.
- D1 audit confirms profile save revision 3 at 22:49:01.480Z, sign-out at 22:49:08.921Z, and new session at 22:51:33.662Z. This verifies a fresh session after sign-out, rather than reuse of the earlier session.
- Browser Profile after login shows ABC Hotel, Hillsboro, Oregon, America/Los_Angeles and radius 10. D1 revision remains 3; full profile JSON, coverage JSON and membership are unchanged from the pre-promotion baseline. Tenant/property mapping remains tenant_abc / property_abc_abc_hotel.
- Production contains zero customer markets; no synthetic findings were inserted. Live research, paid calls, notifications and ingestion remain disabled. Real findings require a separately approved reviewed-data enrollment/import pass; no sign-in or persistence blocker remains for this acceptance.
- Production promotion checks remain 70 tests passing, typecheck/build passing. Formatting passed after normalizing checkout-only Windows line endings; no source diff resulted.


## 2026-10-21 — Reviewed findings import and approval workflow (local)

Implemented an operator workflow using `npm run customer:review` and the gated Worker `/reviews` endpoint: explicit repeat-safe enrollment, immutable staging, scoped/paginated review list, readable offline HTML evidence/change report, hash-bound approval or rejection, reviewer notes/attestations and audit history. Separate fixed-scope secret and configured actor; no customer role changes. Production config keeps REVIEW_ENABLED=false. Direct reviewed ingestion is blocked so real imports cannot bypass approval.

Migration `0004_reviewed_imports.sql` is additive and enrolls nobody. Approval, ingestion, market update and audit commit atomically through SQLite triggers; retries cannot double-publish, concurrent decisions are protected, stale market revisions require a fresh proposal, and failed audits roll back publication. Pending/rejected proposals never enter the customer Blueprint. Review data is bounded to 100 immutable rows per property and returns a clear retention-limit error. Source quotes, dates, assessments and unknowns are retained; reports escape untrusted text and use no scripts or remote assets.

Validation: 78/78 tests passed (8 new workflow tests), TypeScript passed, formatting passed, production build passed, compiled HTTP smoke passed all 111 assertions, CLI help executed successfully. Tests use only isolated in-memory/temporary SQLite fixtures, including fictional public-shaped URLs for reviewed-mode contract tests; no sources were fetched. Covered approval/retry/race, rejection, immutable content/hash mismatch, stale revisions, scope isolation, disabled/wrong credential gates, caller actor/scope forgery, repeat enrollment, rollback, reopen persistence, private-state preservation, reviewed bypass prevention, retention error and report escaping.

Existing ABC Hotel production data, SIL configuration and membership were not touched. No migration, Worker deploy, Vercel deploy or Git push was performed in this build pass. Existing production sign-in/persistence verification from the preceding pass remains recorded above; this pass does not claim hosted verification of the new workflow. Live research, paid calls and notifications remain disabled.

Remaining: apply migration/deploy in an authorized isolated hosted acceptance pass, test operator CLI/report and customer Blueprint end-to-end there, then activate an accountable operator credential with verified fixed ABC scope and reviewed-mode enrollment. Prepare actual source-backed evidence and explicitly approve it before publication. No real evidence or approvals were fabricated. Per-human operator login/two-person approval, automated source verification and archival storage are not implemented; see docs/REVIEWED_IMPORTS.md for the bounded operator-service contract and release runbook.


## 2026-10-21 — Reviewed-import isolated hosted acceptance

- Published feature branch `codex/reviewed-import-acceptance`, implementation commit `1748e41`. Deployed clean archived source to Vercel preview https://scout-qetynj336-parrieb-9172s-projects.vercel.app/app (`dpl_6URLbKSadHzWPitsLH5poqnKXwAA`, Ready). Deployment-only overrides use the separate acceptance Worker and explicit fictional-auth banner; no production project environment changes or main push.
- Applied 0004 only to `scout-findings-acceptance` D1 (`ccef2c7a-8e1d-4b32-87ba-27ac15bd7a35`). Verified its properties are exclusively fixture scopes. Installed a separate review secret without printing it; review scope fixed to fixture_tenant / fixture_hotel, synthetic mode. No real source URLs were fetched.
- 45 hosted assertions passed via `scripts/hosted-review-acceptance.ts`, including actual CLI report generation and CLI approval. Pending invisibility, changed hash/payload rejection, missing attestation rejection, rejection, stale revision denial, repeat approval, repeat enrollment, private profile preservation, neighbor/cross-tenant isolation and disabled capability flags passed. The first test attempt correctly rejected a future observation; fixture timestamps were changed to a fixed historical observation and the suite passed. No application bypass was introduced.
- D1 confirms three staged proposals, one approved, two rejected and exactly one approval audit. Fixture market advanced 3 to 4 with one new finding (four total); rejected finding absent. Existing fixture profile remains unchanged.
- Closed both REVIEW_ENABLED and INGESTION_ENABLED after testing; deployed acceptance Worker `ecb4d08f-5d31-4700-8724-339564ec9123`. Credentialed requests to both routes return 403 disabled. Customer fixture access remains bounded by the existing October 22, 2026 23:00 UTC expiry, with no automatic renewal or notifications.
- Browser verification on the Vercel preview: fixture sign-in, published finding detail with dates/evidence/unknowns, search, saved state and actual one-row CSV download passed. CSV preserves the finding identity and FICTIONAL SYNTHETIC FIXTURE label. Mobile width 390 has no horizontal overflow. Copy showed success, but the browser clipboard readback did not confirm this particular finding title; exact clipboard contents are not claimed verified in this pass.
- Local regression: 78 tests, TypeScript and formatting passed again. Hosted production build passed; preceding implementation pass compiled HTTP smoke passed 111 assertions. No local browser testing.
- Read-only before/after production comparison: ABC Hotel remains at profile revision 3; complete profile row, membership rows and empty market enrollment are identical. Production Worker, production database schema and real SIL accounts were not changed.
- Next release gate: separately promote the workflow/migration to production, establish verified fixed-scope operator configuration and reviewed enrollment, then review and approve actual source-backed evidence. This pass validates synthetic transport/storage/approval, not real source quality or live research. Live research, paid calls and notifications remain disabled.

Final browser persistence check passed: after sign-out and fresh fixture sign-in, the approved campus finding remained visible and Saved, with Unsave shown in details. Its private state is saved=1, dismissed=0, revision=1; market revision remains 4. The finding also survived the acceptance Worker redeployment that closed operator access. The preview is left open for review; only fictional credentials/data are present.


## 2026-10-21 — Reviewed-import production activation for ABC Hotel

- Promoted to main and deployed application revision `56a9c73`, Vercel production `dpl_DMECEHyD2wv9NTxbd1xXBuySHWc3` (Ready, https://scout-4fcj7fdva-parrieb-9172s-projects.vercel.app), aliased to https://scout-olive-ten.vercel.app. Used normal production environment, not the synthetic preview or its overrides.
- Applied only pending additive 0004_reviewed_imports.sql to production D1. Deployed production customer/worker.ts version `662c6f2b-4813-4904-9444-a52821c76515`. REVIEW_ENABLED=true with fixed tenant_abc / property_abc_abc_hotel, reviewed mode, operator service identity scout-abc-review-operator. INGESTION_ENABLED=false.
- Existing SIL session-status response was validated against exact tenant/property/user/app/credential version and sessionValid=true, mustChangePassword=false before activation. Existing active editor membership remains unchanged. No password reset, customer role expansion or SIL configuration change.
- Installed an independent Worker review secret, distinct from customer/fixture secrets; never printed or committed. Local ignored credential file is restricted to the current Windows operator. Credential remains an operator-service credential, not separate human SIL operator login or two-person approval.
- Actual production CLI enrollment succeeded twice and reused a single reviewed market at revision 0. CLI list returned empty queue. Customer service credential rejected by review endpoint (403); forged tenant input rejected (400); direct ingestion rejected (403). Production contains one ABC reviewed market, zero findings, zero review rows and zero ingestion batches. No synthetic fixtures or fabricated approvals were inserted.
- Before/after full-row comparisons prove ABC profile and membership are identical; profile revision remains 3. Browser on the promoted production alias opens ABC Hotel using its existing real SIL-backed session, shows no findings, and displays the preserved name/address/timezone/radius. No profile write was performed. This pass revalidated an existing real session; it did not perform another password-entry login.
- Fresh 78/78 tests and TypeScript passed; Vercel production build passed. Prior isolated hosted acceptance covered actual stage/report/approve/reject, stale/retry/isolation, CSV and persistence. Production stage/approval publication is intentionally untested until genuine prepared evidence exists; do not infer it from enrollment/list HTTP success alone.
- Live research, paid calls and notifications remain disabled; synthetic resources remain separate and their operator gates remain closed. Next: prepare a source-backed batch for ABC Hotel, stage it with current revision 0, inspect its evidence/change report, then explicitly approve it. No finding should appear until that review occurs.


## 2026-10-21 — Minimal customer hotel profile

- Replaced the customer Profile form with hotel name, optional website and structured street/address line 2/city/state or province/postal code/country fields. Only hotel name remains required. Removed category checkboxes, coverage instructions, confirmation checkbox, timezone, market center/radius, place lists, priorities/exclusions and redundant profile actions from this customer form. SCOUT manages agent behavior; customer profile saves preserve existing operator-managed settings and coverage rather than resetting them.
- Optional postalAddress JSON is backwards-compatible with existing profiles and requires no migration. The existing free-text address stays intact and is shown as previously saved until the owner supplies structured address details. No guesses or automatic address splitting. Structured addresses also maintain the existing readable address field for exports/compatibility.
- 81 tests passed, including name-only drafts, preservation of legacy address/operator fields, structured-address save/sign-out/sign-in, invalid fields/URL/limits and disabled research flags. Typecheck, local production build and 111 compiled HTTP assertions passed. No local browser testing. Production browser verification follows release.
- ABC Hotel has not been edited; all existing values and research-off settings remain preserved.

Production verification: application `6818cc6`, Vercel deployment `dpl_CAohVALMGkAnvR7cmpQ2eGs4gAtS` Ready and production alias updated; Worker `f9af7400-5233-457d-ab5c-7fc58bda484c` supports structured address storage. Browser confirmed eight hotel/address inputs, zero form checkboxes, only name required, legacy address visible, no coverage/research-settings fields. Narrow responsive layout had no horizontal overflow (browser-reported 585 CSS pixels with current zoom). Full production ABC profile and membership matched baseline exactly, profile revision 3; no production save or invented address performed. Local persistence tests cover the new address save path; hosted real-address save awaits owner entry. Live research, paid calls and notifications remain disabled.


## 2026-10-21 — Hotel identity and profile wording

Made the active hotel prominent throughout the customer workspace: Your hotel label, larger saved hotel name, saved locality, hotel-specific profile heading and findings/blueprint/update titles. Identity follows the authenticated workspace and saved profile, never a hard-coded ABC Hotel label. Narrow screens give the hotel identity its own row. No profile values, access, research, paid-call or notification settings changed. Typecheck and production build passed; this is a presentation-only change.

## 2026-10-21 — Simple findings-first customer workspace

Consolidated duplicate Overview/Blueprint and three agent tabs into Findings, Updates and Hotel profile. The authenticated hotel name remains prominent. Companies, Projects and Events are simple finding filters alongside search, saved/changed/dismissed views and date sorting. Kept scoped save/dismiss, copy, evidence, dates, unknowns, history and CSV exports; simplified customer wording and corrected the export success message so real reviewed findings are not called fictional. Removed customer coverage instructions and repetitive technical notices. Honest research-off status and explicit synthetic labeling remain.

81 unit/integration tests, TypeScript, production build and 111 compiled HTTP smoke assertions passed. No Worker/configuration/schema changes or production customer writes. Live research, paid calls and notifications remain disabled. Hosted browser acceptance follows deployment; real findings still await prepared evidence and approval.
Hosted check of d58ba7d (production dpl_Bwh9rgd2XCWejWZoXBRBni6ii4SB) confirmed the real ABC Hotel session, three-section navigation, honest empty findings/updates, and the owner's saved structured address. No save or data mutation was performed. Browser QA caught a punctuation encoding issue; corrected it and completed remaining plain-language card labels, then reran typecheck and production build successfully. Populated customer findings were covered by existing isolated unit/HTTP tests, not injected into ABC Hotel for browser testing.

## 2026-10-21 - Simplified workspace: isolated desktop/mobile browser QA

Tested unchanged application revision d7d8a3d on a new preview only: https://scout-210s4mmx6-parrieb-9172s-projects.vercel.app/app (dpl_DwUhD4QyvLEt6nCWVJdtqGKR3rAA, Ready). Clean git archive with runtime overrides points exclusively to the existing scout-findings-acceptance Worker/D1 and fictional owner account. Production alias/environment, ABC Hotel, SIL configuration and production data were not accessed or changed during this pass. No Worker deployment, imports, source fetching, live research, paid calls or notifications. Acceptance review/ingestion gates remain closed and expiry remains October 22, 2026 23:00 UTC.

Chrome browser QA used the desktop viewport (1384 CSS px wide, 930-986 high) and 390x844 mobile viewport; actual document client widths 1369 and 375 including scrollbar allowance. Both had scrollWidth equal to clientWidth, with no horizontal overflow. Mobile controls stack, long hotel names wrap, finding details/actions and navigation remain usable. Browser viewport override reset afterward. No framework error overlay or captured application console warnings/errors.

Passed: uppercase title search; combined query/category zero-results state; Companies/Projects/Events and all/current/saved/changed/dismissed views; date-sort selection; selected count reset on category change; detail evidence/unknowns/dates; Updates links opening the correct finding. All start-date fixtures are identical, so this browser pass does not prove differing-date sort order.

Desktop event and mobile project: Save -> Unsave, Dismiss -> Restore, removal from current findings, appearance in dismissed/saved views, and both flags surviving reload passed. Actual Copy clipboard text contained the correct title, fictional marker, source URL and unknowns. Downloaded CSV files were parsed: event detail (one event), selected campus (one campus), mobile project detail (one project), mobile company-filtered export (exactly two companies); sources/dates and FICTIONAL SYNTHETIC FIXTURE labels were retained. Download-event observation timed out in the browser harness, but normal download completed and local downloaded contents were independently inspected. One offscreen locator-click attempt did not activate a button; accessibility control clicks confirmed actual app behavior.

Cleanup verified after reload: four current findings, original two saved company findings, zero dismissed; event/project restored to original unsaved/visible state (audit/revision history appropriately remains). No production customer writes. Screenshots are outside the repository in Windows Temp: scout-qa-desktop.png, scout-qa-mobile.png, scout-qa-mobile-controls.png.

Non-blocking findings, not changed in this QA-only pass: (1) one-result counter says "1 findings"; (2) changing a list filter retains the previously opened detail panel, which can confuse users when it no longer matches; (3) Updates still displays technical version-summary copy such as "Initial imported finding." and "Changed: end." These are follow-up customer wording/context improvements in customer-market.tsx. Functional requested checks passed. Real-device Safari/Android, real SIL sign-in and production writes were intentionally not tested; mobile testing is responsive Chrome, with synthetic auth only.

## 2026-10-21 - Stronger visual contrast

Updated shared UI colors and surfaces: deeper muted text, stronger control borders, green filter panels, white finding cards with forest/gold top accents, prominent finding titles, green-tinted lodging relevance, dark customer navigation with a gold active tab, framed hotel identity, clearer profile sections and empty/update states. Category text remains present so color is not the only cue. CSS and presentation class names only; no customer data, auth, research, paid-call or notification changes. Typecheck and production build passed; hosted visual checks follow.
Hosted contrast acceptance passed on isolated preview dpl_GKJQJ4dMGXSXrUhc3Q1z92R9rcf4 (d0dbbbb): desktop finding cards and filters, 390x844 responsive navigation/filter/card/detail layout, no horizontal overflow, category filtering and detail opening, no captured console warnings/errors. Main text contrast pairs measured 6.47:1 (muted text on page) to 11.75:1 (navigation); this is targeted contrast checking, not a complete accessibility audit. 81 tests and 111 HTTP assertions also passed. Preview uses synthetic Worker/data only; no profile or finding-state writes in this visual pass. Screenshots saved outside repo in Windows Temp. Production release follows normal main deployment, never promotion of fixture preview.

## 2026-10-21 - Three customer QA fixes

Fixed singular result count (1 finding), closed open finding details on search/type/view/sort changes, and replaced technical version summaries with customer wording derived from the stored before/after facts. Both Updates and detail history use the same formatter; stored evidence and change records remain untouched. Added focused tests for first additions, date/organization changes, unchanged facts and missing versions. 82 tests, typecheck, production build and 111 HTTP assertions passed. No Worker, configuration or data changes; live research, paid calls and notifications remain disabled. Hosted synthetic acceptance follows.
Hosted synthetic acceptance passed for b36e4d5 on preview dpl_G2k95jJa5FnTiQ6zDkQuHsNC8wgp: search returned "1 finding"; opening details then changing type/search/view/sort removed the detail panel; Updates showed "New finding added to your market blueprint." and "End date updated." with no captured console warnings/errors. No customer or fixture data writes were needed. Focused Prettier check passed. Production uses its normal environment; the acceptance preview is not promoted.


## 2026-10-21 - Expansion Pass A: integrated fixture foundation

Implemented the supplied SCOUT_Expansion_Update Pass A in the existing customer architecture. Competitor and Property SCOUT extend existing findings ingestion, evidence/history, private saved/dismissed states and CSV/copy exports. Configuration stores explicit competitors and own-property identity/aliases, optimistic revisions, retired membership history and a pause control for isolated fixture tests.

The new Briefing destination runs five bounded fixture category steps, persists each outcome before synthesis, joins compatible requests, fences interrupted workers, reserves six fixture units atomically against 120 monthly fixture units and stores immutable source-linked briefing versions. Complete, partial, blocked, failed and no-change are distinct. Three interrupted attempts per step are the recovery limit. Existing SIL session validation and editor/viewer access apply to configuration, jobs, snapshots and exports. Migration 0005 is additive; no customer rows are seeded or changed.

Local verification: 96 tests passed (14 expansion tests), TypeScript/production build passed, formatting passed, compiled HTTP smoke passed 111 assertions. Cases cover tenant/property isolation, revoked access, exact evidence references, deduplication, quiet refreshes, material history/cancellation, ambiguous identities, source failure, compatible/incompatible concurrency, fenced recovery, budgets, pause, durable snapshots and preservation of existing records.

Hosted acceptance/release completed; final results are recorded below. Production fixture execution is explicitly disabled. Only the existing acceptance Worker/D1 permits fixture execution. Live research, paid calls, schedules and notifications remain disabled. No live readiness or real-source coverage is claimed.

Next pass after A is B: approved/documented source adapters and cost/access preparation. Required live dependencies remain selected providers/source permissions, an approved comp set and property, freshness/retry/coverage policy, finite live budgets and separately authorized real validation. No new external services are required for Pass A.


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

## Pass C planning — 2026-10-22 PDT
Prepared SCOUT_Expansion_Update/PASS_C_PILOT_PLAN.md only. Read-only production expansion configuration lookup returned no ABC Hotel row: official identity/domain, exact competitors and source grants remain unapproved. Plan proposes two manual jobs capped at $0.10 each/$0.20 total, review before publication, and explicit engineering/rights/provider/run approvals. Provider public pricing rechecked; candidate municipal landing-page fetches returned 403 and are not claimed accessible. No SCOUT research/model calls, data mutations, credentials, release, schedules or notifications. No activation approved. All execution remains disabled. See the plan for exact pending approvals and live-dispatch engineering gates; 0006 is already installed in production.

## Pass C dispatcher and review controls — local synthetic implementation, 2026-10-22 PDT

Implemented `src/research/pilot-dispatcher.ts`, `src/research/pilot-transport.ts` and additive migration `0007_pilot_dispatch.sql`. This pass is local only: migration not applied remotely, no production/customer reads or writes, no push/deployment, secrets or paid calls. ABC Hotel and unrelated local edits remain untouched.

The durable pilot dispatcher reuses PreparedExpansionProvider across all five categories, ProviderLedger, server-derived ExpansionScope, and ReviewedImports. Operator-owned policies are immutable and expiry-bounded; durable request keys prevent redispatch; one active job/property and at most two jobs/pilot are enforced in SQL. The second job waits for the baseline review decision. Job caps are at most 100,000 micro-USD and pilot caps at most 200,000; pilot totals join all months rather than resetting at rollover. Missing monthly policies fail closed. Unknown usage remains held. Expired/interrupted execution becomes blocked without an automatic retry or third job.

SIL/access revalidation is injected by the server caller, then session/member/property/editor-role checks run locally before requests; persisted pause and job lease/expiry are rechecked before each simulated call. Grants constrain exact hosts and paths. Transport preparation validates public IPv4 addresses, rejects mixed/private DNS answers, conservatively rejects all IPv6, passes approved addresses to a pinned connector contract, rejects redirects, bounds streamed bytes and propagates cancellation. Cancellation during DNS prevents a late connector open. There is intentionally no real network connector, credential lookup or production activation flag; the only supported connector mode remains synthetic. Actual socket pinning/TLS and Cloudflare networking are NOT validated by fixture tests.

Provider results stage one five-category review batch through the existing review queue; they never directly ingest into the customer market. Pending/rejected/stale/blocked reviews cannot publish. Existing content-hash approval and transactional ingestion triggers publish only explicitly approved content; review-first SQL guards prevent blocked pilot jobs from bypassing that path. The approvedSnapshot consumer returns the immutable approved review document, retaining exact evidence/finding versions without dispatching research. Existing customer UI/export/brief consumers continue to read published market records only; no new pilot UI or automatic brief publication endpoint was introduced.

Verification: **120 tests passed**, including **11 new Pass C tests**. TypeScript and production build passed; scoped formatting passed. Tests cover five-category real-adapter fixture flow, duplicate and concurrent requests, rejection, cross-property/real-customer denial, revoked access, job limits, cross-month accounting/unknown holds, expiry/lost lease, stale approval, snapshot immutability, host/path and private-DNS rejection, redirect/size rejection and cancellation before dispatch. The first snapshot test incorrectly expected nine fixture records; the isolated new baseline contains five, and the corrected assertion passed. Full suite log and build log are local ignored `.vercel/pass-c-local-tests.log` and `.vercel/pass-c-local-build.log`.

Remaining before live activation: owner identity/comp set/source-rights/provider/budget/run approvals in PASS_C_PILOT_PLAN.md; secure account setup; a real pinned-DNS/TLS connector validated in the intended runtime; explicit server/hosted operator wiring and isolated hosted acceptance of migration 0007 before production release. These are not enabled by this local work. All live research, paid calls, schedules and notifications remain disabled. Synthetic testing does not establish live source quality, provider access or commercial readiness.

Pass C hosted acceptance in progress: local-only dispatcher controls and a fixture-only `/pilot` endpoint are integrated. See subsequent acceptance report for hosted results.

## Pass C isolated hosted acceptance completed — 2026-10-22 PDT

The Pass C synthetic dispatcher and review controls were accepted on the existing isolated Vercel Preview and expiring acceptance Worker. Code is pushed to `codex/expansion-pass-b-acceptance` at `4c254a866d90d8e7ec46d25262cd28a9fa412459`. Vercel Preview `https://scout-a69xvzvzj-parrieb-9172s-projects.vercel.app/demo` is Ready at deployment `dpl_E6zVg2vqpcBnXkpbrkCY8sXcfGQV`; the browser smoke opened the clearly labeled fictional demo workspace and rendered its findings. The isolated Worker `https://scout-findings-acceptance.parrieb.workers.dev` is version `ffc0e58c-539a-431c-9202-a3718b556573`. Migration `0007_pilot_dispatch.sql` was applied only to the existing marked synthetic acceptance D1 (`ccef2c7a-8e1d-4b32-87ba-27ac15bd7a35`). Its fixed expiry remains `2026-10-22T23:00:00Z`; the acceptance database contains fixture scopes only.

Hosted Worker verification used the real dispatcher, provider ledger, import review path and customer workspace with recorded fictional source responses. Missing service auth and missing session scope were denied (403). Fixture owner sign-in succeeded. Five categories completed and were staged for review; a duplicate request joined the existing job. A pending snapshot was denied; explicit fixture approval published a versioned snapshot with evidence links (10 records, all linked). A second job remained review-gated; rejecting it left the published customer market revision unchanged (revision 65). A third job was denied at the two-job cap. Research, paid-call, schedule and notification flags were false throughout; no real provider network calls or paid calls occurred.

Final local verification: `npm test` **120 passed**, `npm run typecheck` passed, `npm run build` passed; the focused hosted/dispatcher tests passed **11/11**. A read-only production D1 comparison matched pre-acceptance SHA-256 `03f67b9919ce1242ac25f81198f3dd6966c1fb98f1270b89129b888763a4ff17` across properties (3), memberships (3), markets (1), finding states (0) and import reviews (0). ABC Hotel data was not changed. Production was not promoted; the active production Vercel and Worker deployments remain unchanged.

Synthetic hosted acceptance is complete. No blocker remains for this pass. Live dispatch remains disabled and is not production-ready: owner-approved identity/comp set, exact source grants and rights, provider access, approved finite budget and pilot authorization remain outstanding in `SCOUT_Expansion_Update/PASS_C_PILOT_PLAN.md`; the actual network connector must also be validated for DNS pinning and TLS in its deployment runtime before a live run. Schedules and notifications remain independently disabled.

## Public demo aligned with expanded SCOUT — 2026-10-22 PDT

Replaced `/demo`'s outdated three-category/local-session sample with a self-contained fictional workspace aligned to the current five research areas: Corporate, Project, Event, Competitor and Property, plus an evidence-linked SCOUT Briefing. The overview explains each area, while the Market Blueprint supports search, category filters, finding details, save, dismiss/restore, copy and CSV export. Competitor and own-property mention views show dates, source identity, lodging relevance and unknowns. Brief sections link directly to their sample finding details.

All example hotel, competitor, organization, event, review and source records are fictional. Citations use reserved `.example` hosts and dates are marked illustrative. This public demo has no session, customer, Worker, D1 or research API calls; save/dismiss preferences are namespaced in browser local storage only. No sample data is written to customer records. Live research, paid calls, schedules and notifications remain disabled.

On the production `main` baseline, local verification passed: 111 tests, TypeScript, production build and formatting checks for the changed TypeScript files. The demo fixture tests verify all five categories, reserved source hosts, briefing evidence references, lodging implications, unknowns and CSV formula neutralization.

Released as `5651562d1ba63df90cfd31311c8f47bd3a7813c8` and pushed to GitHub `main`. Vercel production deployment for the exact code revision is Ready at `https://scout-ra0qyioc2-parrieb-9172s-projects.vercel.app`; the stable alias `https://scout-olive-ten.vercel.app/demo` serves the aligned workspace. Browser acceptance verified the overview, Competitor, Property and Briefing destinations, dated/evidence-linked details, search and category filter, save across navigation, dismiss and restore, copy, and CSV download. The deployed page showed no browser console errors. At 390px and 320px viewport widths, document width equaled viewport width (no horizontal overflow). CSV rows label synthetic data and retain `.example` evidence links. No customer-account calls or data mutations were part of the demo flow. No Pass C pilot code or customer data changes were included in this release.

## Mainline reconciliation and production verification — 2026-10-22 PDT

The expanded Pass C implementation and the aligned five-category demo were reunited on GitHub `main` in merge commit `d4939adf74e37e2fda4e52467346f54f8b9bc5fa`. This integrated the previously separate `codex/expansion-pass-b-acceptance` line without dropping the `main` demo changes. Vercel deployed the exact merge commit as Production / Ready (`dpl_7c9f3wrrqXFgqQNDke6uK1G3VKH1`, `https://scout-dyupy9z8g-parrieb-9172s-projects.vercel.app`) and assigned `https://scout-olive-ten.vercel.app`; the dashboard confirmed branch `main` and commit `d4939ad`.

On the stable URL, browser checks confirmed the overview links to Competitor SCOUT, Property SCOUT and SCOUT Briefing; the Blueprint shows five categories and its competitor filter and hotel search each returned the expected single fictional finding. The Briefing rendered evidence sections. At 1440px, 390px and 320px, no horizontal overflow was observed. `/app` returned the customer sign-in screen with no browser errors; no customer credentials were entered and no authenticated customer session or data write was tested.

Local checks on the merged release: 122 tests passed; TypeScript and production build passed; Prettier passed for changed TypeScript/JavaScript files; `git diff --check` passed. Repository-wide `npm run format:check` remains non-green: 99 files are reported by the broad check, including unchanged files and the changed global CSS. Changed TypeScript/JavaScript passed the scoped formatter; unrelated files were not bulk-reformatted.

This is code consolidation, not live activation. No production Worker deployment or D1 migration was run; migration 0007 remains un-applied to customer production. No ABC Hotel records were changed. Live research, paid API calls, scheduled research and notifications remain disabled. Synthetic fixtures remain clearly labeled and isolated.

To prevent another split, `main` remains the Vercel production branch; GitHub now requires a pull request into `main`, disallows force-push and deletion, enforces the rule for administrators, and automatically deletes source branches after merge. No required reviews or CI checks were configured, so release checks remain part of the documented procedure in `AGENTS.md` and `docs/RELEASE_PROCESS.md`.

The former `codex/expansion-pass-b-acceptance` and `codex/demo-aligned-fictional-market` remote branches were deleted only after verifying each had zero commits absent from `main`. Historical Vercel Preview deployments may remain visible until Vercel retention expires, but they no longer track active source branches and do not affect the stable production alias.

## OpenAI provider integration preparation — 2026-10-22 PDT

### Implemented locally

- Added a Worker-side OpenAI Responses transport that sends credentials only to the fixed `api.openai.com` endpoint, bounds time and response bytes, disables redirects, and suppresses upstream error bodies. `BoundedSources` remains disabled for live transports unless a server caller explicitly opts in; no browser control selects that opt-in.
- Added a request builder for GPT-6 Luna Responses web search with `store:false`, one maximum tool call, low search context, server-provided allowed domains, and the OpenAI `web_search_call.action.sources` receipt. Parsed URLs/citations are canonicalized against the same approved domain list; an uncited answer and an empty-source response are distinct from a reviewable cited summary.
- Added per-call conservative reservation and actual-usage reconciliation logic using current standard model/search prices, including the documented long-context uplift. Unknown usage holds the full reservation. No key or provider response is logged.
- Added a signed-in workspace administrator-only `/api/customer/openai-connection` check. It verifies only access to the selected model endpoint and returns a small status enum; it does not make a research call. The key is read only from the Cloudflare Worker `Env.OPENAI_API_KEY` binding.
- Added `docs/OPENAI_PROVIDER_SETUP.md` with the exact secret destination, official API references, cost calculation and activation gates. The recommended destination is Cloudflare Dashboard → Workers & Pages → `scout-customer-foundation` → Settings → Variables and Secrets → Add secret → `OPENAI_API_KEY`.

### Verification

- `npm test`: **131/131 passed**, including mocked OpenAI request serialization, key host confinement, citation/domain receipt validation, cost settlement, safe connection-status behavior, and admin-only/keyless Worker behavior.
- `npm run typecheck`: passed.
- `npm run build`: passed; `/api/customer/openai-connection` compiled as a dynamic route.
- `npx prettier --check src/research/openai-web-search.ts` and `git diff --check`: passed. `npm run format:check` was run and remains non-green: it reports 121 files, including many untouched repository files and existing touched files. No unrelated bulk-formatting was applied.
- All provider interactions in tests were injected fixtures. OpenAI API calls: **0**; measured API usage and spend: **$0**. No production browser, key, cloud secret, customer profile, market, or ABC Hotel data was accessed or changed in this pass.

### Not yet end-to-end or production enabled

- This repository change is local and has not been pushed or deployed. The connection route has not been tested against a configured Worker secret.
- The live `PilotDispatcher` still rejects all real tenant/property scopes and supports only synthetic fixtures. The OpenAI search utility is not wired into that durable job path or the workspace review screen.
- The existing reviewed-finding contract requires source-supported/verbatim claim excerpts. OpenAI web search returns cited summaries but does not guarantee verbatim page text. A separate explicitly labeled cited-summary draft and review/promotion flow is required before these responses can enter reviewed findings or create a customer Briefing.
- No current execution supplied the existing OpenAI secret. The owner should add it directly in the Cloudflare Worker secret settings above; never paste it into chat, local files, Vercel frontend variables, logs or Git.
- The earlier $0.20 pilot amount was a proposal, not an approved live cap, and the fixture-only 0007 migration enforces that cap while rejecting real tenant scopes. Proposed approval for one five-category manual cycle is **$1.25 total**. It reserves five worst-case GPT-6 Luna calls of $0.2215 each (1.05M input tokens at long-context rate, 2,000 output tokens and one $0.01 search call per category), leaving $0.1425 unused buffer. Search `low` is not treated as a token ceiling. No paid calls may occur until this cap is explicitly approved and an additive reviewed D1 policy migration enforces it.
- No operator-approved source-domain grants are configured. The new request builder fails closed when server-owned allowed domains are missing. ABC Hotel has no official domain, so Property mentions cannot be identity-confirmed from name alone; the saved address can guide research but does not eliminate ambiguous matches.
- The account/profile state referenced by the earlier pilot notes is historical and was not refreshed here. The fixture suite did not use or modify ABC Hotel data.

### Next build pass

After the owner adds the Worker secret and approves the proposed cap, implement the cited-summary draft schema and human review UI; connect the five-category provider to the durable pilot jobs with source grants, real-scope authorization, leases and budget reservations; add a scoped additive D1 migration that preserves current customer data; then push through the protected `main` pull-request path and verify the exact production revision. Run a no-research admin connection check first, then only the single authorized manual cycle. Keep recurring schedules and notifications disabled. Do not claim live findings or Briefing readiness until a real hosted run is reviewed.

## OpenAI pilot authorization and current readiness — 2026-10-22 PDT

The owner approved a **$1.25 hard ceiling for one manual five-category cycle**. This replaces the older $0.20/two-job proposal for this requested run only; no repeat, schedule or notification is authorized. The owner asked us to use the saved location and three competitors. A read-only query of existing production D1 confirmed the address anchor `9790 Northeast Tanasbourne Dr, Hillsboro, Oregon 97124, United States`, 10-mile radius, included places Hillsboro and Beaverton, and three active comp-set members: Residence Inn by Marriott Portland Hillsboro, Holiday Inn Portland West - Hillsboro by IHG, and Embassy Suites by Hilton Portland Hillsboro, Oregon. The own-property domain remains blank; do not claim same-name Property SCOUT mentions are a confirmed match.

Added an administrator-only no-research OpenAI connection status control to the signed-in expansion view. It calls the existing customer backend endpoint and displays only a sanitized status enum. It makes no web-search call and has no effect on research activation. The key belongs only in the Cloudflare Worker secret named `OPENAI_API_KEY`; the production Worker secret-name check on October 22 did not find that name. No secret values were read.

Read-only production checks found the expansion configuration and provider ledger tables, with zero D1 writes from this turn. The custom `d1_migrations` table records only 0001–0004, while the Cloudflare schema also contains the 0005/0006 tables and Wrangler reports 0005–0007 pending in its separate migration tracker. There is no `_cf_D1_migrations` table. Do not run a blind Wrangler migration apply: the migration history/ledger must be reconciled with the existing schema first. No pilot policy, source grants or customer provider-budget row is active for ABC Hotel.

The external adapter still is not end-to-end: the existing durable `PilotDispatcher` is fixture-only, the OpenAI web-search utility is not connected to a real-scope job route, and there is no separate persistent cited-summary review draft/briefing path. The current import contract requires source-verbatim quotes, which OpenAI's cited summaries do not guarantee. No source-host grants or rights/retention register was found. OpenAI's `allowed_domains` enforces host filtering but not the path-level restrictions proposed in the earlier pilot plan; any live source grant must acknowledge that limit. The approved $1.25 cap is **not yet enforced by a live pilot policy**.

Checks: production D1 reads changed zero rows; repeated Worker secret-name listing still contains only `REVIEW_TOKEN`, `SERVICE_TOKEN` and `SIL_SERVICE_TOKEN`. After the UI control edit, `npm test` passed **131/131**, `npm run typecheck` passed, `npm run build` passed, scoped Prettier passed, and `git diff --check` passed. No OpenAI request, search call, research spend, market write, schedule or notification occurred; measured provider spend remains **$0**. These mocked connector/credential/citation/cost checks are not hosted acceptance.

Next: owner adds the existing OpenAI key to Cloudflare's `scout-customer-foundation` Worker secret settings; confirm it only by the no-research status control. Then complete and test the durable real-tenant manual pilot path, cited-summary persistence/approval surface, per-cycle cap, and safe additive D1 migration reconciliation. Before a paid call, install exact host grants and the enforced policy. Only then use the already authorized one-cycle cap and present real results as review-only. Live research, paid calls, schedules and notifications remain disabled until those gates pass.

## OpenAI credential configured — October 22, 2026

The owner confirmed the existing key was entered into Cloudflare. `wrangler secret list` now shows the `OPENAI_API_KEY` secret name on the existing `scout-customer-foundation` Worker; I did not read, print, transfer or store its value. A no-research model-access check is implemented in local Worker/Vercel code but has not run against the hosted system yet. No model request, web search, D1 write or cost occurred.

Local connector and status-control milestone remains green: `npm test` 131/131, `npm run typecheck`, `npm run build`, scoped Prettier and `git diff --check` pass. The admin-only check returns only `not_configured`, `valid`, `denied` or `unavailable`. This verifies credential/model access only; it does not enable research.

The live dispatcher and cited-summary review storage/UI are still not implemented or deployed. Production has no approved source grants or provider budget row; the legacy pilot migration is fixture-only and D1 migration bookkeeping does not match the installed schema. The approved $1.25 ceiling therefore is not enforced by a live job path. Exact source grants and permitted excerpt/retention rules remain necessary, including a decision that OpenAI's host-level search filter cannot enforce path-level grants. No live research, paid calls, schedules or notifications were started. ABC Hotel data is unchanged.

Next: release only the no-cost admin connection check through the protected-main process and verify it with the existing signed-in ABC Hotel administrator session. Then finish the separately gated review-only live dispatcher and reconcile migration history without changing customer records. Do not run the paid cycle until source grants, retention policy, durable review staging and the $1.25 atomic cap are all active and tested.

## OpenAI manual pilot connector and review staging — October 22, 2026

Completed the local connector path using the current OpenAI Responses API `web_search` tool, fixed `api.openai.com/v1/responses` transport, server-owned host allowlists, non-storing requests, one search per category call, citation-to-search-receipt validation and citation offsets. A Worker-only manual pilot dispatcher revalidates SIL session/property scope around each call, requires an administrator, checks the saved hotel profile, research area, three selected competitors, provider budget, expiring source policy and current rate card, and stages category outputs plus an immutable source-linked briefing for review. It does not write to `customer_markets` or publish findings. A new additive `0008_openai_manual_pilot.sql` defines isolated policy/job/draft/briefing storage and a per-call/aggregate $1.25 limit. No migration was applied to production. Live research and paid calls are hard-disabled by the current release policy; schedules and notifications remain false.

The owner confirmed the existing `OPENAI_API_KEY` is configured in the existing Cloudflare Worker. Its secret name was verified without reading the value. The free connection check has **not** been run: a fresh production read confirmed the active ABC Hotel account is `editor`, while connection checks and starting a live cycle are administrator-only. No SIL role was changed. A fresh read-only production query confirmed research configuration revision 5, the ABC Hotel market address, and the three selected competitors listed in the pilot plan. There is no October 2026 provider-budget row, no live pilot policy/domain grant, and no permitted-content retention approval. The new pilot D1 tables do not exist in production. OpenAI's source filter is host-level and does not enforce exact path grants. Production D1 migration bookkeeping remains mismatched with installed schema; migration 0008 is only locally tested and must not be blindly applied. The read-only checks reported zero rows written; no ABC data was altered.

Local verification: **134/134 tests passed**, including migration execution against isolated SQLite, no synthetic policy/job rows, fixture-scope rejection, ABC editor status showing closed gates, zero provider exchanges/reservations and zero ABC market writes. `npm run typecheck`, `npm run build`, scoped Prettier and `git diff --check` passed. No OpenAI API request, web search, paid call, source request, production database write, release, schedule or notification occurred. **Measured provider usage: 0 requests; measured cost: $0.** The configured key's validity is not confirmed. **Estimated** maximum for five bounded calls is $1.1075 ($0.2215 each), within the approved $1.25 hard cap; no amount was incurred.

This implementation remains local on `codex/openai-live-pilot`, uncommitted, unpushed and undeployed. No real findings or Briefing are available in the hosted app. Specific remaining gates: (1) a SIL administrator must use an admin session to run the no-research connection check and administer the pilot controls; (2) approve a short-lived source register naming exact hosts, allowed paths/terms, source authority, required coverage and permitted excerpt/retention for each category; (3) configure the October provider budget row at or below the approved cap; (4) reconcile current D1 migration history, then install additive storage and policy only after those approvals; and (5) change the release's research/paid-call gate only for the approved single manual cycle. No second cycle or ongoing activation is authorized.

Next pass: obtain the administrator session and source/retention approvals, verify provider access without research spend, reconcile D1 migration state read-only, then release and run exactly one manual cycle under the $1.25 cap. Review source links, identity, duplicate/stale status, and hotel-sales implications before any customer publication. Do not claim live success from this local synthetic validation.


## Authorized manual OpenAI pilot completion — 2026-10-22

- Reconciled migration history only after all 22 schema objects from 0005/0006 matched production. Applied additive 0007/0008. Installed owner-approved $1.25 job/month limits and one expiring, one-job source policy. No reset or customer-data replacement.
- Fixed invalid source-policy JSON check, atomic category/briefing/job persistence, lease-fenced reservations, configuration-drift blocking and bounded live timeouts. Added actual five-step success/concurrency tests, duplicate suppression and fixture isolation checks. Briefing remains an assembled source-linked review draft; provider text is explicitly a paraphrase, never a purported source quotation.
- Verified 136/136 tests, TypeScript and production build. Customer properties (3), expansion configuration (1), market (1) and memberships (3) have identical before/after SHA-256 fingerprints. No account or role changes.
- Exact remaining blocker: the owner declined SCOUT role elevation and requested SIL-managed permission. Existing SIL login returns a property role, but session-status does not revalidate a research permission; SCOUT uses its local role. SIL admin-console login is not SCOUT customer admin authorization. A scoped SIL-only research grant plus login/session contract integration must be explicitly authorized in the SIL repo; see OPENAI_PROVIDER_SETUP.md. Do not alter shared account roles.
- No OpenAI requests, paid verification, live findings or billed spend. Schedules and notifications remain off. Existing ABC data and synthetic isolation preserved.
- Production deployment verification is recorded below after release.

### Production release evidence

- PR #9 merged to `main`: `cdd45772a6356fb0e740fa37cb1ec9b5a7664d9b`.
- Cloudflare Worker version `8dba655c-4676-48cb-a53e-7496ca142927`, deployed from that clean tracked revision using existing bindings and retained secrets.
- Vercel deployment `dpl_9gs2JbVLqwLxTmGZrQTzNFnu1VQ5` is Production/READY; API metadata confirms the exact main SHA and stable alias `https://scout-olive-ten.vercel.app`.
- Hosted browser opens the customer sign-in page; existing browser session has expired. Unauthenticated pilot and connection routes return 401 with private/no-store responses. Authenticated admin execution is unverified and deliberately blocked by the unchanged editor membership.
- Remote readback: migrations 0001–0008 recorded; one policy expires 2026-10-28 22:10:16 UTC; job/month caps $1.25 each; zero pilot jobs and zero provider ledger calls. Source approval and cap are complete, but do not confer an application administrator role.
- Exact next owner action: authorize a change in the SIL repository to add a SCOUT-specific manual-research grant and revalidate it through the server-to-server customer login/session contract, followed by SCOUT consumption. Preserve ABC Hotel's editor membership and all other app access. Do not change a shared SIL role as a workaround. No additional paid-cycle approval is needed within the existing cap.

## SIL-managed manual research permission — 2026-10-22

Implemented the cross-app contract without elevating ABC Hotel: successful SIL login/session-status supplies a SCOUT-only manualResearch grant, and SCOUT revalidates before provider verification, run creation, dispatch and result persistence. Local roles stay unchanged. A short-lived session-scoped D1 proof adds storage-level checks; missing/revoked grants fail closed, including local administrators without a SIL grant.

Applied additive 0009 authorization-fence migration; preserved existing memberships/profiles/results and the one-job $1.25 policy. SIL has an opt-in control in normal customer application setup with tenant/property/user scoping, revision checks and audited grant/revoke. No auto-grants and no other app permission changes.

Verified 137 SCOUT tests, typecheck and production build; includes editor with explicit permission, revocation before spend, role-only denial, five-category persistence, concurrency and duplicate prevention. Schedules and notifications remain off. Hosted/live results to be recorded after release and owner grant.

### Hosted permission release and configuration compatibility

SCOUT main `7db4c1f` deployed to Vercel Production/Ready and Worker `f5ec432e-9a49-4180-af61-9bd7ebe2d61f`; SIL main `43d1db8` deployed Production/Ready. ABC Hotel signed in with existing credentials, retaining editor membership. Owner SIL administrator session needs sign-in before using the new explicit grant control. No grants, provider calls or jobs exist yet.

Hosted readiness found stored expansion documents include internal `memberships` history. The pilot now validates only their public own/competitors/paused settings while keeping the entire stored configuration digest for drift detection. No customer record is rewritten. Six focused pilot tests pass using the actual stored shape; typecheck and build pass.

## First authorized live attempt — 2026-10-22

SIL's explicit manual-research grant is recognized in the hosted ABC Hotel session. The free OpenAI model-access check returned valid. ABC Hotel remains an active editor; no role or other-app change was made.

One job (`b9c023dd-70cf-4763-907c-6071344950b1`) made four real research requests. Corporate, Project and Event returned `USAGE_EXCEEDS_RESERVATION`; their responses were rejected before evidence/usage persistence. The current error does not distinguish excessive search-item count, input/output token bounds, or calculated charge. Raw responses were not retained (`store:false`), so the exact offending counter and actual charges cannot be reconstructed from SCOUT. Competitor returned no sources: 4,946 input / 254 output tokens, calculated $0.010622 including one search. This is not proof of no competitor activity. Property/Hotel Mentions has not run. No useful sourced findings or briefing were produced or published.

Three unknown-usage holds remain $0.664500, plus $0.010622 calculated known usage: $0.675122 accounted, NOT verified billing or a proven upper bound after the usage guard failed. No retries or reservation release. The $1.25 approval has not been increased. Schedules/notifications remain off.

Confirmed defect: dispatcher continued categories after an unreconciled response. Fixed it to block immediately after unknown usage and to block legacy queued jobs before further dispatch. Existing held reservations and failed drafts are preserved. UI now states that calculated spend excludes unreconciled charges. Eight focused pilot tests, typecheck and production build passed; tests made no provider calls.

Required next evidence: OpenAI project Usage/Costs for the four Responses requests around 2026-10-22 20:55–20:58 UTC (13:55–13:58 Pacific), including billed total and per-request token/search counts if available. Do not provide API keys, request bodies or credentials. Reconcile those calls and identify the exceeded bound before any further paid request; do not replace the one-job policy or claim successful live research. Hosted blocked-state verification follows the release.

## OpenAI usage reconciliation and adapter correction — 2026-10-22

Read the signed-in OpenAI Platform Usage dashboard and downloaded Activity/Cost exports without reading credentials. Four gpt-6-luna requests and four billed web searches are the only project activity. Provider UTC buckets are 2026-10-23 03:56–03:58 (the prior UTC timestamp interpretation was wrong). Totals: 36,059 input tokens, 1,850 output tokens; billed cost $0.044494605. Cost-export SHA-256: 23dd26d49a6ed958af2ce67a237eeff1c02dcedcdbf905cb820413618c2689aa. Raw exports stay ignored in local-data. Individual request logs are absent because store:false; no invented per-category cost allocation.

Confirmed code defect: every web_search_call output item was counted as a billed search and exactly one output item was required. Official web-search documentation distinguishes search (billed), open_page and find_in_page. Aggregate token counts rule out the token ceilings for the three rejected calls; their specific output action arrays were not retained. Corrected both cost validation and evidence parsing to support page actions while enforcing one actual search and preserving domain/citation validation. Numeric action/token diagnostics now persist for future failures. Unknown action types still fail closed.

Pricing also requires 30m cache-write accounting. Requests explicitly select 30m; input is conservatively priced at its maximum cache-write rate, with long-context uplift. Per-call reserve becomes $0.274; unchanged job/month limits still stop before exceeding $1.25. This is a conservative calculated amount, not claimed invoice cost. Sources: https://developers.openai.com/api/docs/guides/tools-web-search and https://developers.openai.com/api/docs/guides/prompt-caching and https://developers.openai.com/api/docs/pricing.

Additive migration 0010 supplies immutable operator billing receipts scoped to a job and explicit existing call keys. It allows the blocked job to resume only after scoped billing evidence; authorization, lease, five-call limit and cumulative cap remain enforced. Receipts reconcile aggregate display without modifying/releasing original ledger holds or rewriting failed drafts. Existing holds $0.675122 plus remaining maximum $0.274 = $0.949122, safely below the approved cap. No retry of earlier failed categories or new policy is authorized by this recovery.

25 focused adapter/pilot tests, typecheck and production build pass. Includes page actions, cache-write bounds, unknown-action rejection, tenant isolation, immutable reconciliation, resume without rewriting holds, concurrency and repeated-request prevention. No provider calls in tests. Deployment and final remaining-category result will be verified through the existing production app; schedules/notifications remain off.

### Fifth request and final validation correction

The remaining Hotel Mentions request ran once under the same approval. New numeric diagnostics show 13,278 input tokens, 490 output tokens and TWO search actions (zero open/find actions), despite max_tool_calls:1. This disproves treating the requested tool limit as an exact returned-item count. The earlier page-action distinction was necessary but insufficient. Validation now checks the computed conservative charge against its reservation, permits bounded multi-action responses, and reserves up to 20 returned actions ($0.464 maximum including cache writes). The job/month $1.25 ceiling and five-request limit remain unchanged; this change does not authorize an additional request. Focused tests cover multiple search/page actions and the maximum charge.

The fifth response had already been rejected before source persistence. Its safe numeric usage supports a conservative $0.021905 charge (including two search charges and worst-case 30m cache-write input pricing). OpenAI's refreshed billing export still shows the first four calls only; fifth-call billed cost is pending. First-four billed cost plus fifth conservative calculation is $0.066399605, rounded upward to $0.066400 in app accounting. Original budget holds remain unchanged.

Migration 0011 adds immutable non-overlapping per-call receipts with explicit billing-export versus provider-usage-upper-bound basis; it cannot rewrite old holds or cover an already reconciled call. The customer UI hides continuation once all five categories have been attempted. Tests verify separate billed/calculated display and overlap/mutation rejection. 25 focused tests, typecheck and production build pass.

Live outcome: all five categories attempted; Corporate/Project/Event/Property failed validation, Competitor supplied no sources. A version-1 partial briefing with explicit gaps persisted privately, with zero source-backed findings and nothing published to the Market Blueprint. This is NOT a successful research-quality pilot. No failed category was retried, and no sixth paid request was made. The final validation correction is fixture-verified, not proven by another live response. Schedules and notifications remain off. Source quality, identity, freshness and sales usefulness cannot be validated without retained cited results.
