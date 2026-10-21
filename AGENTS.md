# SCOUT project instructions

Build SCOUT by SalesHospitality — “Your hotel’s market research assistant.”
Read docs/PRODUCT.md, docs/BUILD_PLAN.md and docs/PROJECT_STATUS.md first. Use `.agents/skills/hotel-market-intelligence-builder/SKILL.md` and the relevant referenced files. If skill auto-discovery is unavailable, read it directly. This folder is a local implementation project, not a request to migrate to a different hosting service.

## Product boundaries
- Implement Corporate SCOUT, Project SCOUT and Event SCOUT sharing one market blueprint and engine.
- Establish a baseline, then two scheduled market update cycles weekly covering all three categories.
- Deliver evidence-backed external intelligence for the hotel's existing sales workflow. No daily lead quota, CRM pipeline, outreach tasks, automated sending, voice, booking engine, or PMS integration.
- Give access to current records and exports without paid rescans. Keep manual research admin-controlled and budgeted.
- Accept quiet cycles; never invent findings, contacts, dates, room nights or revenue.
- Separate observed facts, potential lodging relevance, and unknowns. Preserve source lineage, dates and meaningful changes. Merge duplicate reports of the same activity.
- Keep $99 setup/$50 monthly as working commercial assumptions. API and margin estimates remain unmeasured.

## Implementation behavior
- Inspect the repository before edits. Preserve existing user work. Prefer TypeScript, Vercel and Cloudflare Workers/D1 where suitable; inspect real SIL contracts before connecting them.
- Build in cohesive passes. Implement complete approved work before asking for routine choices. Do not add unrelated features.
- Demo mode must be explicit and isolated. Fail closed for production access until real authentication/entitlement checks exist. Never ship a mock identity fallback into production.
- Keep tenant/property enforcement on the server for records, exports, jobs and caches. Keep secrets out of frontend code and logs. Do not reproduce unsafe historical credential-display patterns.
- Keep payment outside SIL. Do not add Stripe. SIL activation is entitlement when integrated.
- Use bounded asynchronous jobs, idempotency, cost reservation and actual usage reconciliation. Read current provider docs before API implementation.
- The local build prompt authorizes local implementation, not cloud provisioning, API spend, recurring live jobs, repository publishing or deployment. Prepare configuration and identify a specific blocker when those become necessary; do not invent IDs or endpoints.
- Run appropriate unit/integration tests, type checks and production build. User preference: rendered browser acceptance on approved Vercel deployment, not local browser tests. Mark browser acceptance pending until that access is authorized.
- Update docs/PROJECT_STATUS.md after each substantial pass. Report implemented, tested, unverified and blocked separately. No placeholder buttons labeled as completed functions.
