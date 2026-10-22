# Build plan
## Start with a short repository inspection
Read root AGENTS.md, current PROJECT_STATUS.md (locate its actual path), current SCOUT skill, package SCOPE.md, application routes, migrations, research engine and provider contracts. Check git status and preserve unrelated work. Verify what the current findings-ingestion implementation actually supports. Inspect verified SIL entitlement and property identity contracts; do not infer them from names.
Write a concise implementation mapping to real files in IMPLEMENTATION_STATUS.md, then implement without a separate planning-only turn.

## Pass A — integrated foundation using isolated fixtures
Deliver configuration, data contracts/migrations, new agent views, competitor and property research adapters using fixtures, and a working briefing orchestration path with simulated refresh outcomes.
- Reuse existing tenancy, SIL login, server authorization, D1/Worker storage, findings ingestion and audit mechanisms.
- Add explicit comp-set configuration and own-property matching inputs.
- Persist evidence, observations, deduplication keys, material changes and source coverage.
- Implement refresh jobs, joining concurrent requests, budget checks, immutable briefing snapshots and honest partial states.
- Wire customer screens to persisted results and existing exports.
- Keep fixture data in explicit test tenants; preserve ABC Hotel and all existing customer records.
Exit: acceptance cases that do not require external sources pass; full workflow works with labeled fixtures; no paid calls or external sending.

## Pass B — live-source integration preparation
Build provider adapters using documented supported access methods. Validate current official provider documentation and pricing at implementation time. Reuse existing providers where suitable; do not introduce paid subscriptions without approval.
- Record coverage and access limitations for each source class.
- Connect bounded retrieval, extraction and source-backed synthesis to existing engine.
- Test provider interfaces with recorded/fixture responses, including failures, stale content and ambiguous identity.
- Verify disabled live modes cannot call paid services.
- Prepare a concrete release configuration: source list, models, limits, intended hotel, selected comp set, estimated maximum spend and deployment changes.
Exit: ready for a bounded live validation; unknown provider access is explicitly marked, not substituted with fabricated evidence.

## Pass C — authorized live validation and release
Only after explicit authorization of hotel, source access, deployment and spend limit, run a baseline and update/briefing cycle. Verify source accuracy manually on a sample across categories, real costs, durable persistence and customer isolation. Verify quiet cycles and partial refreshes with realistic coverage limits.
- Activate only intended properties and capabilities.
- Enable recurring schedules only with explicit schedule approval; notifications remain separately disabled unless authorized.
- Record source coverage, measured costs and remaining limitations.
Exit: actual live evidence supports each operational claim. Fixture success alone is insufficient.

## Delivery discipline
Use substantial passes, one meaningful verification point per pass, and targeted retesting for defects. Do not repeat broad suites without a concrete reason. Browser acceptance runs on an authorized Vercel deployment, not a local browser. If deployment is not authorized in the active session, complete code and non-browser checks first and report the exact remaining step.
