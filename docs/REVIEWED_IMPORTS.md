# Reviewed findings: operator import and approval

This workflow publishes prepared, human-reviewed evidence to the existing customer Market Blueprint. It does not research, fetch URLs, call models, send notifications or change customer accounts. Customer editors/viewers do not receive import privileges. The first implementation uses an operator CLI and a readable offline HTML report, not a customer-facing upload screen.

## Deployment gate

Apply additive migration `0004_reviewed_imports.sql` after 0003, then deploy the customer Worker. Existing customer reads do not use the review table, so this feature can remain disabled independently. No production resources were modified during the local build.

Keep `INGESTION_ENABLED=false`. Direct `/ingestion` now rejects reviewed mode even if enabled; reviewed imports must go through `/reviews`. Configure `REVIEW_ENABLED=true` only for an authorized operator trial. Required server-side settings:

- `REVIEW_TOKEN`: separate secret, at least 32 characters, different from customer and direct-ingestion credentials.
- `REVIEW_TENANT_ID`, `REVIEW_PROPERTY_ID`: fixed verified hotel scope, never accepted in request bodies.
- `REVIEW_ACTOR`: accountable operator identifier for the credential. Do not share the credential among unrelated operators. Separate human accounts/two-person approval are not implemented.
- `REVIEW_DATA_MODE=reviewed` for real evidence. Synthetic acceptance requires a separate database/Worker with fixture-prefixed IDs and mode `synthetic`.

Before activating ABC Hotel, verify its existing SIL assignment and local active membership. Reuse `tenant_abc` / `property_abc_abc_hotel`; do not change passwords, membership roles, profile values or synthetic mode. This build does not enroll ABC Hotel or approve any real evidence. The operator service checks local active property and fixed enrollment mode; customer reads continue their existing SIL validation. It does not perform a new SIL entitlement check on each operator request.

Set `SCOUT_REVIEW_ORIGIN` to the verified Worker HTTPS origin and `SCOUT_REVIEW_TOKEN` via a secure operator environment. Do not put credentials in command arguments, source, report, or JSON batch. The CLI rejects redirects and has no default destination. Reports include property-private content: keep them outside Git/shared public folders.

## Operator sequence

1. Explicitly enroll with `npm run customer:review -- enroll <confirmed-property-id>`. It reuses matching enrollment without replacing records; mode mismatches fail closed. Enrollment alone publishes nothing.
2. Prepare a JSON batch matching `src/customer/market-contracts.ts` (`ingestionSchema`). Each item needs candidate identity/location/category/structured facts, source publisher/URL/publication date/field quotes, retrieval date and content hash, a summary, and separate lodging inference/rationale/unknowns. Use real prepared evidence, not the test helpers. The contract requires support for each non-null fact. Receipt hashes and quotes remain operator assertions; SCOUT does not independently retrieve or verify them.
3. Stage using `npm run customer:review -- stage <batch.json>`. Use a new batch key and current market revision; the server returns the review ID and approval hash. Staging validates the full merge and storage limits, saves an immutable proposal, and does not update the customer's Blueprint. Exact retries reuse it; changing the payload under the same ID fails.
4. `npm run customer:review -- list` returns up to 25 scoped summaries; pass the returned `nextBefore` for another page. `npm run customer:review -- read <review-id> <private-report.html>` produces a readable report with scope, revision, stale status, new/changed IDs, warnings, before/proposed facts, dates, evidence quotes, lodging inference and unknowns. Complete JSON is retained in an expandable appendix. The report has no scripts or remote assets and escapes untrusted text. A stale report cannot authorize publication.
5. Inspect the actual prepared source evidence. Approve only after checking facts, quotes, dates, geography, lodging inference and unknowns: `npm run customer:review -- approve <review-id> <approval-hash> "Specific review note"`. This command explicitly attests that evidence and lodging inference were reviewed. Or use `reject` with a reason. Both require a note of at least ten characters. There is no automatic approval, network source fetch or email.
6. Approval atomically records the decision, inserts the batch, updates the market and audits publication. Any failure rolls everything back. Concurrent decisions cannot double-publish. Exact repeated decisions are harmless; conflicting decisions fail. Approved/rejected rows cannot be edited. A stale proposal must be rejected and submitted under a new ID/revision, then reviewed again; never silently rebase it.
7. Read the customer's Blueprint through a real SIL session and verify evidence, save/dismiss and export. Existing profile, membership and saved/dismissed state are separate tables and are not overwritten by import. Close the review feature when the approved operator pass is complete.

## Retention and limits

The existing 50-item/1MB snapshot/500-finding/200-cycle limits still apply. A property can retain up to 100 immutable review rows, including rejected rows; additional staging stops at the database gate. Do not delete audit history or snapshots to bypass the cap. A separately reviewed archive/retention design is needed before sustained use. List pagination is key-based, not chronological. No pending review deletion or automatic cleanup is implemented.

## Verification

Local synthetic tests cover pending invisibility, exact approval/retry, stale/hash/payload rejection, cross-property access, immutable snapshots, audit rollback, repeated enrollment, reviewed-mode validation, direct bypass denial, durable reopen, concurrent approval and HTML escaping. Real source quality and hosted operator acceptance remain separate release gates. Live research, paid calls and notifications remain disabled throughout.


## Hosted acceptance completed

The isolated acceptance pass is recorded in PROJECT_STATUS.md. Preview: https://scout-qetynj336-parrieb-9172s-projects.vercel.app/app . Only synthetic fixture identities/evidence were used. Operator report generation and explicit approval ran against the deployed acceptance Worker; pending/rejected records stayed out of customer results. Both review and direct-ingestion access were disabled again afterward. Production activation remains a separate step; never promote this preview with its synthetic environment overrides.


## Production activation — 2026-10-21

Production migration and workflow are now enabled for verified tenant_abc / property_abc_abc_hotel only, in reviewed mode. Enrollment is revision 0 with no findings or reviews. The operator CLI uses the production Worker origin and its independent secured credential; customer credentials cannot authorize /reviews. No actual evidence has been staged or approved. This supersedes earlier activation-pending notes. Live research, paid calls, notifications and direct ingestion remain off. See PROJECT_STATUS.md for deployed versions and verification boundaries.
