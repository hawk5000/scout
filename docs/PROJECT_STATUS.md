# Project status

Current status (2026-10-21): **Hosted synthetic demo remains available; customer account and D1 persistence foundation implemented and tested locally. Customer activation remains closed pending verified SCOUT SIL registration and approved cloud configuration.** Live research, paid API calls and notifications remain disabled. See the latest customer-foundation entry and `docs/CUSTOMER_FOUNDATION.md`.

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
