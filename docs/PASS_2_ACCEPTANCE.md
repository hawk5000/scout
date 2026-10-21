# Build Pass 2 — synthetic research engine

This pass runs offline fixtures through real validation, matching, versioning, persistence and budget-control code. It does not establish live research quality, pricing, source permissions or production readiness.

## Local review

Run `npm run dev:demo`, enter a fictional demo, and open **Administrator setup → Synthetic research workbench**. Confirm the profile first if it was unconfirmed. Run baseline, update, then quiet; inspect the Market Blueprint, details, Updates and agent run history. Save/dismiss/export work on both preloaded and engine-generated findings. Each browser's demo tenant/property remains isolated.

The shared baseline fixture adds three activities: Cedar Technical Center, Westbank Pump Renewal and Harbor Skills Forum. The project has five source examples. These are distinct from the original nine Pass 1 preloaded examples, which remain intact. No automatic fixture run happens when opening a page, searching or exporting. Manual replay deliberately tests the engine independently of inactive live schedule/pause preferences.

| Scenario | Intended result |
|---|---|
| baseline | Three canonical findings, five-source project lineage, one change per new finding |
| update | Expansion activity, identified contractor and event-date changes; same finding IDs, new material versions |
| quiet after update | Same facts and refreshed source checks; no new change or version |
| outage | Project evidence retrieval fails; prior facts retained with uncertainty; other coverage continues |
| conflict | Same-date contractor disagreement retained for review; prior facts protected; initial conflicts withheld with review source URLs |
| cancellation | Canceled event / completed projects and facilities explicitly cease to be current demand examples |
| next-edition | A separate 2028 event, linked internally to the 2027 event family |
| malformed | Unknown/forged candidate fields rejected; other scouts can still succeed |
| injection | Malicious instruction text in inert source bodies has no authority, tools or access to secrets |
| budget-cutoff | Artificial run-credit cutoff yields partial coverage, preserves records and performs no unreserved attempt |
| retry | One synthetic transient error and bounded retry, both accounted for |
| interrupted | Unknown usage stays reserved; no automatic refund/release or delivery |

## Implementation

- `contracts.ts`: strict Zod candidate/facts/evidence-reference/usage/replay inputs and hard limits. Event edition required, date ranges validated, unknown contacts never synthesized.
- `provider.ts` and `playbooks.ts`: one synthetic-only adapter and three versioned category playbooks. There is no live adapter or SDK. Request bodies cannot supply a provider, URL, profile, tenant, property or budget. Included places, excluded places, literal exclusions and enabled categories constrain candidates. Free-text coverage/priorities and radius are saved context, not a geocoding or semantic interpretation engine.
- `retrieval.ts`: HTTPS allowlisted `.example` registry, no networking, per-hop redirect checks, source/byte/runtime ceilings, content fingerprints and tracking-parameter normalization. Unknown hosts, IP literals, metadata URLs, credentials and non-HTTPS schemes fail closed. This verifies the offline boundary, **not** a production DNS-rebinding-safe fetcher. Live DNS resolution, IP pinning and redirected fetch safety must be implemented and independently tested before network retrieval is allowed.
- `merge.ts`: deterministic canonical identity from kind, source-supported identity, normalized location and event edition; names/URLs normalized; cross-category membership preserved. Every material populated fact needs a quote found in the retrieved fixture body; values, identity and publication metadata are checked against it. Versions compare structured facts, not prose or crawl timestamps. This is syntactic fixture-grounding, not real-world semantic fact verification. Ambiguous aliases/fuzzy real-entity resolution remain a future live-validation concern.
- Material versions retain before/after facts and evidence IDs. New citations do not manufacture new-demand alerts. Older observations cannot roll back facts. Conflicting accepted records remain flagged until newer supported evidence resolves them. Initial conflicting facts are withheld; their source references remain in run review items.
- `store.ts`: additive local schema with property-scoped synthetic records, runs, usage and stable finding/version change keys. Transactions publish record changes and run results together. The synthetic change table is an in-app change index, **not a notification outbox**. No delivery code is present.
- `engine.ts`: bounded shared cycle, per-scout checkpoints, independent usage validation, partial/failure/quiet states, retry limits and preserved last accepted data. Only fixed offline fixtures execute synchronously in the API; long-running live work is reserved for durable jobs in Pass 3.
- `/api/demo/research`: POST only, strict same-origin/session/admin checks, explicit scenario and idempotency key; production and Vercel demo gates remain closed.
- UI: administrator replay controls; existing customer findings/export paths; conflict filtering; per-scout coverage and synthetic usage in run history; Overview headline follows actual run outcome.

## Usage accounting

Rate card `synthetic-credits-v1` is an artificial test rate card, not a provider price estimate. Provider/model labels are `fixture` / `recorded-structured-output-v1`. Recorded usage includes total input, cached input, output excluding reasoning, separate reasoning, search and tool counts. All usage is simulated. Actual charged USD is always zero; live prices and live budgets are untouched.

Credits = ceil(uncached input / 100) + ceil(cached input / 200) + ceil(output / 50) + ceil(reasoning / 50) + 5 × searches + 2 × tools.

Reserve 300 credits per attempted operation before invoking the fixture provider. Default run ceiling: 1,500 credits; property-month ceiling: 10,000 credits. The cutoff scenario uses 330 run credits. Reconcile actual fixture-reported counts exactly once; a changed reconciliation is rejected. Usage exceeding its reservation is held for review. Unknown/interrupt outcomes retain reservations, including across process restarts. Month boundaries use the property's timezone. Monthly accounting sums reconciled cost plus all outstanding reservations; baseline/update usage remains distinguishable by its run.

Maximums: 4 total attempts, 1 retry per scout, 24 source hops, 36 candidates, 12 candidates per provider response, 16,000 bytes per source, 2 redirects, 30,000 tokens and a 3,000ms run/retrieval ceiling. Per-response schemas limit tokens and tool counts before reconciliation. No automatic provider fallback, retries outside these bounds, or automatic release of interrupted reservations exists.

Atomic reservation and a single-active-run constraint prevent overlapping property work. A genuine two-process test races two operations for the same 300-credit remainder and verifies exactly one succeeds. Completed cycle keys are idempotent; reusing a key for another scenario fails. A process crash leaving an active row blocks further runs until explicit recovery is implemented. The fixture interruption scenario records a finished attention state with held credits. Both preserve accounting; automated lease/checkpoint recovery is deferred to Pass 3.

## Verification and limits

Automated coverage includes original Pass 1 protections plus deduplication of five separate candidate reports, source lineage, material/quiet/history behavior, editions/locations, cancellation, conflict preservation and initial conflict review, source outage/staleness, strict schema and claim checks, source instruction injection, URL/redirect/size/runtime boundaries, scope/role enforcement, persistence/deletion, monthly budget accounting, duplicate reconciliation, bounded retries, retained interruptions and multi-process reservation races.

Compiled HTTP tests exercise demo-disabled and production gates, unauthorized and forged-scope replay, cross-origin rejection, baseline/update/quiet, cycle-key idempotency/conflict, isolated exports and saved state, and read-only paths that do not create runs or usage. Final counts/results are in `PROJECT_STATUS.md`.

Browser acceptance remains pending an authorized Vercel deployment; no local browser testing was performed. Live provider/search behavior, sources/rights, measured cost, evidence accuracy, production D1, identity/entitlements, durable jobs, scheduler, notifications and pilots are unverified and inactive. No deployment, provisioning, notifications or paid API calls occurred.
