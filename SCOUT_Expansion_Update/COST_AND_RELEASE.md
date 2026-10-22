# Cost controls and release
## No implicit paid activation
The supplied policy is inert: no providers, model choices, live calls, new schedules or notifications are activated by copying these files. Existing authorization in the active Codex session governs actual deployment. This package does not grant unlimited cloud spending or paid-source purchases.

## Cost model
Track baseline discovery separately from recurring updates and customer-requested briefs. Count search/retrieval fees, model input/output, synthesis, retries and infrastructure. Source rates must come from current official documentation during implementation; do not use historical example pricing as facts.
Monthly delivery cost = scheduled shared refreshes + permitted on-demand incremental refreshes + brief synthesis + paid data sources + hosting/storage. Margin analysis also needs payment fees and support, not just model tokens.

## Enforcement
Require finite approved per-job and per-property monthly limits before live execution. Reserve the conservative maximum authorized request cost before calls; bound query count, pages, tokens, retries, runtime and concurrency. Reconcile actual usage, retaining estimated/unknown flags if provider usage is unavailable. An unknown rate must not silently bypass budget enforcement. Deduplicate simultaneous requests and cache supported unchanged evidence within explicit freshness rules. Stop before the next call would exceed the remaining reservation.

## Decisions needed before live pilot
Record selected hotel and exact comp set; approved source classes/providers and access rights; approved per-refresh/monthly budget; maximum on-demand use; freshness windows; retry limits; required versus optional category coverage; and whether new agents join the existing two weekly cycles. Do not invent customer-facing subscription terms to fill these gaps.

## Release evidence
Measure a real baseline plus real incremental brief refresh. Check correct hotel matching, citations, material-change accuracy, duplicates, source gaps, result usefulness and actual cost. Have the owner judge usefulness; do not infer sales value from item counts. Record time saved only if measured against an actual workflow.

## Operational controls
Retain per-property pause, entitlement revocation, audit, recovery and secrets management. Pause prevents new dispatches; define safe behavior for calls already in flight. Store usable successful results while reporting failed coverage. Publish no paid-service promise until relevant live coverage is verified.
