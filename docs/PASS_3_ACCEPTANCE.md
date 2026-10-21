# Pass 3 — synthetic subscription delivery

Completed locally on 2026-10-21. This is a working offline rehearsal, not a production subscription service. No live provider, SIL endpoint, credential, cloud resource, notification sender or recurring process was added.

## Review the working flow

1. Run `npm run dev:demo` from the nested SCOUT project root and enter the fictional demo.
2. On each agent page, clear its pause checkbox and save coverage. New demos intentionally start with all scouts paused. Keep the Hotel Profile confirmed; add fictional recipients if delivery previews are wanted.
3. Open **Administrator setup → Subscription & delivery rehearsal**. Activate the fictional subscription. Artificial credit ceilings can be reduced, including to zero. These are test units, not dollar budgets or prices.
4. Queue the initial blueprint. Repeating this action returns the same property baseline job. The API only queues; it does not execute research.
5. In another terminal in the same project root, run `npm run worker:fixtures`. This explicit local command processes at most 20 attempts and exits. It never installs a daemon or scheduler. It refuses Vercel/cloud execution and a live-research flag.
6. Refresh job status. Refresh the page to load the resulting Blueprint, Updates and agent histories. Job processing completion and research quality are separate: a processed job can contain Partial or Needs attention coverage.
7. Queue a synthetic update, run the worker, then queue a quiet check and run it again. Material changes prepare previews; quiet cycles do not. Delivery records are `prepared-disabled`, never sent.
8. Pause or revoke fictional entitlement. New enqueue requests and worker claims stop. Pending work persists for resume; existing previews become suppressed. Re-enable to resume pending work, subject to remaining retry limits. No preview is ever sent automatically.

## Scheduling and lifecycle contracts

- One `subscription-baseline-v1` per property, with updates admitted after that job has been processed. Check its research result before treating coverage as complete.
- **Queue today's due fixture slot** evaluates the current server time against the property's two days, time and IANA timezone. It does not accept a client clock or property ID. Before the scheduled time, on other days, or while paused, no cycle is queued.
- A shared weekly key has the local Monday date and ordinal slot 1 or 2. All enabled scouts share that job. DST repeated hours and schedule edits cannot produce more than two scheduled keys in the same local calendar week. No past-day catch-up is performed; an explicit check later on the due day can still enqueue that day's slot. Changing timezone changes calendar interpretation and is an administrator responsibility.
- Schedule evaluation is explicit. No timer, cron or live recurring activity runs. Manual scenario jobs are separately labeled and do not masquerade as scheduled slots.
- Jobs snapshot the confirmed profile at enqueue. Execution uses current category pause controls and rechecks current profile confirmation, property existence, nonexpired demo access, fictional entitlement and activation. Delivery uses the current recipient list and current dismissal/quality state.
- A property has at most one running job. Claiming takes an atomic SQLite write lock, generates a unique lease owner and sets a 60-second lease. Work has at most three claims. Expired third claims become failed and preserve their checkpoint; no silent reset or infinite retry occurs.
- Stale workers cannot commit research or delivery or overwrite a newer owner's state. Reads and exports never enqueue or execute work. Direct Pass 2 replay cannot overlap queued/running jobs and respects configured activation and property credit ceilings.

## Recovery is deliberately fixture-specific

`fixture_jobs` persists queued work and ownership before computation. The complete bounded offline engine transaction commits findings, versions, changes, usage and the `research-committed` checkpoint together. A killed process before that commit rolls back the whole fixture computation. After lease expiry, a new worker recomputes it safely. A crash after research commit resumes delivery preparation without rerunning research. Delivery rows and the final checkpoint commit together.

This transaction strategy is valid only because provider/retrieval operations are pure in-memory fixture computation. **It is not an external API exactly-once guarantee and must not be reused for paid calls.** Live execution needs separately durable operation receipts, provider idempotency and status lookup, usage reconciliation for unknown outcomes, and appropriate queue/lease adapters. Original synthetic interrupted-provider cases still commit their unknown usage holds; recovery never releases those holds speculatively. Legacy orphaned active Pass 2 runs are not automatically reset because their outcomes are unknown.

## Costs and disabled delivery

- Property-specific per-job/month credit ceilings are bounded by existing global ceilings. Both paid-equivalent simulated usage and unreconciled reservations count against limits. Month allocation uses the job's persisted first execution time in its snapshotted property timezone.
- The existing ledger records input/cached/output/reasoning tokens, searches, tools, estimated reservations and reconciled artificial credits under `synthetic-credits-v1`. The UI separately displays held credits and actual charged USD **$0**. Actual provider economics remain unmeasured.
- Only new/material version changes with suitable fixture evidence and non-dismissed findings prepare previews. Recipients are validated by the profile contract and normalized/deduplicated. The composite recipient/change uniqueness key prevents duplicates across retries.
- No recipients means no preview. Adding recipients after a completed job does not backfill historical deliveries. Revocation/pause suppresses existing previews; resume does not unsuppress them. All previews remain private to their property and are deleted with its demo data.
- No transport, sender, provider credentials, send API, invitation, email, push or webhook exists. Preview text is labeled fictional and explicitly says no message was sent.

## Implementation and verification

- `src/research/subscription.ts`: local schema, controls, due-slot evaluator, dispatcher, lease fencing, fixture transaction recovery, delivery preparation.
- `src/research/subscription-contracts.ts`: strict API commands and client view contracts.
- `src/app/api/demo/subscription/route.ts`: authenticated administrator API, origin checks, bounded body, no scope override, private/no-store responses.
- `scripts/fixture-worker.ts`: finite standalone worker using only the existing local demo database.
- `src/components/subscription.tsx`: activation/pause/revocation, ceilings, enqueue controls, refreshable job results and disabled delivery previews.
- `tests/subscription.test.ts` and `tests/helpers/job-worker.ts`: lifecycle, budgets, timezone/DST, two-process contention, real child-process termination after reservation, after a completed scout, and after research commit. Recovered cases assert one run, one set of usage charges and one set of previews.

Final checks: **39/39 tests**, strict type check, format check, optimized production build and **85 compiled HTTP assertions passed**. HTTP tests confirm that enqueue remains asynchronous, keys are idempotent, scope/origin/role gates hold, and one property cannot inspect another's jobs. Browser testing was not performed, per the authorized-Vercel preference. No dependency changes were needed; the existing lockfile remains valid.

## Production boundary and next pass

The production route remains fail-closed. Local subscription flags are fixture state, not SIL entitlement. SQLite fixture tables and the synchronous bounded computation transaction are not a deployed D1/Queues adapter. No cloud resource was provisioned or deployed.

Pass 4 depends on verified identity/membership/SIL entitlement contracts and authorized test identity; approved isolated Vercel/Cloudflare resources and durable preview storage; approved research provider/model/credentials/current prices/hard spend limits; confirmed Seattle and Portland pilot properties; and explicit delivery provider/sender/recipient authorization. Deployed browser acceptance and live quality/cost/pilot measurement remain pending those approvals. Do not infer authorization for any of them from this local pass.
