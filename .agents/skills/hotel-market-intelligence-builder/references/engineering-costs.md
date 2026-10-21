# Engineering and costs

## Architecture boundaries

Prefer existing TypeScript/Vercel/Cloudflare Workers/D1 patterns where supported by the repository. Treat these as stack direction, not evidence that a deployment or integration already exists. Separate customer UI/API, asynchronous research jobs, persistent market records, and evidence retrieval. Use durable queued/bounded work compatible with current provider runtime limits. Do not run long market research inside an ordinary page request.

Use a shared research engine with three scoped playbooks; separate cards do not require independent infrastructure or models. Store hotel context once and retrieve only relevant information per call. Use normal code for scheduling, filtering, arithmetic, deduplication keys, export, and status updates.

## Scheduling and lifecycle

Use property timezones and configurable twice-weekly cycles. Make jobs idempotent using property/cycle/version keys, locks or leases, bounded retries, and resumable checkpoints. Pause new jobs when service is disabled. Recheck entitlement before expensive work and delivery. Prevent overlapping scheduled/manual jobs and duplicate notifications. A timeout or exhausted budget yields Partial/Needs attention with last successful data preserved.

## Data and access

Scope server-side queries, mutations, cache keys, jobs, storage links, and exports to authorized tenant/property identity; never trust a client-supplied property ID alone. Separate shared public evidence from private profiles and annotations. Do not return another hotel's fit assessment or behavior. Keep credentials out of browser bundles and logs. Provide bounded retention plus export/deletion behavior, with dependencies considered before deleting shared public evidence. Validate fetched URLs and block internal-network/metadata access; constrain sizes, timeouts, and redirects. Treat retrieved text as untrusted input.

## Cost model

Count a market scan as a workflow containing multiple searches/model calls, not one API request. Measure actual input, cached input, output/reasoning, search calls, paid data, retries, and tool charges per job/property/scout. Version the rate card and model IDs; verify prices against official provider documentation before cost decisions.

Formula: model token charges + search/tool charges + paid data charges = direct research cost. Track hosting/storage, support time, onboarding, acquisition, and other overhead separately. Remaining subscription revenue after APIs is not net profit.

Working hypotheses from discussion: $99 setup; $50 monthly/property; roughly $5–$10 initial blueprint API/research and $5–$10 ongoing monthly API/research under economical bounded public-source workloads. These are unmeasured estimates, not coverage guarantees. Target total recurring delivery cost at or below $15 only if measured quality and operating costs support it. Do not hardcode these guesses into customer promises.

Before calls, reserve estimated spend against per-job and per-property monthly limits atomically; account for concurrent jobs. Reconcile actual usage afterward and handle interrupted jobs without releasing reservations prematurely. Apply ceilings for searches, tokens, sources, retries, and runtime. Do not rely only on provider dashboard alerts as hard caps. Notify administrators when budget limits compromise coverage.

Reuse appropriately sourced public facts across nearby hotels, but measure independent-market costs before assuming savings. Keep unique hotel fit and annotations private. Use caching or batch discounts only when actual provider support, latency, and task suitability are verified. Do not change providers automatically without quality evaluation.

## Current documentation entry points

Recheck rather than copying old APIs or rates:
- OpenAI API pricing: https://developers.openai.com/api/docs/pricing
- OpenAI web search: https://developers.openai.com/api/docs/guides/tools-web-search
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare Queues: https://developers.cloudflare.com/queues/
- Cloudflare scheduled handlers: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- Vercel Functions: https://vercel.com/docs/functions

These are reference entry points, not a claim that their current content was validated by this skill's creation.
