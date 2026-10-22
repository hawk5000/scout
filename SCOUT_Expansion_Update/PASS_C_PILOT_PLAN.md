# ABC Hotel — Pass C live pilot approval plan

Prepared October 22, 2026. **Proposal only. Not approved or activated.**

## Objective and current state
Run one bounded baseline and one manually authorized follow-up, then judge evidence quality and usefulness before wider release. Preserve the existing customer profile, memberships, findings and private states. Existing SIL scope is `tenant_abc` / `property_abc_abc_hotel`; no new customer or password.

Pass B is deployed. Its additive provider tables exist but have no approved policies or calls. Production still blocks live dispatch and synthetic execution. A read-only production query today returned no customer_expansion_config row for ABC Hotel: there is no saved expansion identity/comp set. The profile previously verified in production is ABC Hotel, 3133 NE Shute Road, Hillsboro, Oregon 97124, United States; the website field was blank. This saved address is not verification of the real-world hotel name or brand. Owner must confirm whether ABC Hotel is a display alias and supply its official identity.

All research, paid calls, schedules and notifications remain disabled. This planning pass read provider documentation/source landing pages only; it ran no SCOUT research, model requests or findings ingestion, and changed no production data.

## Identity, market and comp set approval

Required own-property inputs: official public hotel name, official property URL/domain, full address, any aliases/former names, and brand context. Keep existing SIL IDs. Do not infer a business identity from the address or login email.

Proposed initial prospecting boundary: owner-approved Hillsboro market, using the existing profile radius only after confirmation. Approve treatment of events outside the radius separately. No automatic Portland-wide expansion.

**Selected competitors: none.** Request 2–3 exact hotels for this limited pilot, supplied/selected by the owner. This is a pilot size proposal, not an existing approved comp set. For each: exact property name, street address/locality, official property URL and aliases. Assign/reuse stable IDs only after identity resolution; preserve retired memberships/history. Never substitute nearby hotels or all properties in a brand. If the owner intentionally selects none, Competitor coverage is blocked/not in scope, not a successful zero-results check.

## Proposed source register — no grants are active

| Category | Proposed sources | Approval/access gap |
|---|---|---|
| Corporate | Owner-selected employers' official facility/news pages; City of Hillsboro economic-development announcements | Employer names and exact pages/domains absent. https://www.hillsboro-oregon.gov/ returned 403 to this planning fetch; supported access must be verified before inclusion. |
| Project | City of Hillsboro and Washington County official public project/award pages | https://www.washingtoncountyor.gov/ also returned 403 to this planning fetch. This does not establish universal inaccessibility. Exact HTML pages and access rights remain unverified; no bypass or PDF/portal assumption. |
| Event | Westside Commons public event calendar plus specifically approved organizer pages | https://www.westside-commons.com/ exposes an event-calendar link. Landing-page review only: individual event detail access, dates, rights and permitted excerpts still require validation. |
| Competitor | Exact selected properties' official news, events, packages and facilities pages | No selected properties or approved URLs. Brand-wide statements require property-specific support. No rate shopping. |
| Property | Approved third-party venue/organizer/local publisher pages mentioning the confirmed hotel; hotel site used for identity and labeled first-party context | Official hotel domain and publisher grants absent. First-party content must not be called independent sentiment. Similar-name matches held for review. |

For every approved source, record exact host and permitted paths, category, authority/owner, allowed access method, permission/terms reference and review date, allowed fields/excerpts/retention, publication-date availability and required/optional status. A public URL or owner's approval does not grant third-party copying rights. A search result does not automatically expand the source allowlist. Newly discovered unapproved domains remain unqueried until approved.

Public HTTPS text/HTML only initially. No login/paywall bypass, JavaScript browser extraction, PDF parsing, review/social APIs or licensed feeds. Missing access is named as unavailable, never zero mentions. Do not download entire articles for permanent storage; persist permitted facts, short excerpts, hashes and source lineage only.

## Providers and proposed limits

- Brave Web Search: discovery only; snippets cannot substantiate findings. Public list price checked October 22: $5/1,000 searches. Account access and applicable storage rights unverified. https://brave.com/search/api/
- OpenAI Responses candidate gpt-6-luna: structured extraction only, store:false, no tools. Published input/output prices checked October 22: $0.10/$0.50 per million tokens. Account availability and factual interpretation quality unverified. https://developers.openai.com/api/docs/models/gpt-6-luna
- Existing deterministic evidence-backed briefing: no extra model call. No automatic model/provider fallback or credit/discount assumptions.

| Limit | Proposal for explicit approval |
|---|---|
| Pilot scope | Exactly two manual jobs: baseline, then one follow-up 48–72 hours later after review; timing is a manual plan, not a schedule |
| Hard provider cap | $0.10/job; $0.20 aggregate for this two-job pilot |
| Standing monthly envelope | Prior Pass B proposal was $2/property/month and 10 on-demand refreshes. NOT activated or included in this pilot approval. Use the tighter $0.20 pilot ceiling. |
| Per job | At most 5 searches, 20 pages and 5 extraction calls total across all five categories |
| Per extraction | Maximum 33,024 conservatively bounded input tokens and 2,000 output tokens |
| Time/retry bounds | 10 seconds/request; 120 seconds/job; zero automatic retries |
| Freshness | Retrieved evidence no older than 24 hours for a new refresh; publication date separate and nullable |
| Additional jobs/retries | Stop and request separate authorization; no automatic third run |
| Schedules/notifications | Off, including after successful pilot |

Estimated provider envelope at published rates: $0.025 search + $0.021515 extraction = **$0.046515/job**, or **$0.09303 for two**. The $0.20 is a hard proposed ceiling, not a forecast or permission to spend. Excludes existing infrastructure, support, tax and separately licensed sources. No new subscriptions, credit purchases or licensed data are authorized. Any unavoidable additional purchase needs its own approval.

Five search calls across five categories with 2–3 competitors is intentionally shallow. Report which approved properties/pages were actually checked; do not promise comprehensive comp-set coverage. If bounds cannot cover required sources, return partial or seek a revised plan, never silently expand the cap.

## Engineering gates before activation

This is not a feature-flag-only activation. Implement and test the scoped live dispatcher with DNS-safe public egress, streamed size bounds, redirect rejection, fixed provider credential hosts, durable job ownership and entitlement/pause/lease checks before every paid call. Bind the provider ledger to the actual durable job. Missing permissions, rate version, approved source grants or budget must fail closed before network dispatch.

Enforce the two-job total and pilot expiry as well as job/month caps; existing ledger job/month enforcement alone does not establish a two-job pilot limit. Proposed authorization expires seven days after first dispatch; no roll-over reset may enlarge the pilot cap. Account for calls across month boundaries. Keep unknown usage fully reserved; never reclaim an interrupted call merely because its result is missing. Concurrent requests must join or serialize without duplicate spend. Opening/exporting stored findings remains free of research dispatch.

Real outputs must enter the existing reviewed-import approval flow before customer publication. Verify this connection explicitly: the synthetic provider's direct ingestion path is not authorization to publish unreviewed live output. Hold ambiguous identities and unsupported facts. The briefing must cite only approved exact finding/evidence versions and distinguish implications from facts. An empty approved brief is valid.

Deploy only to existing Worker/D1/Vercel, preserving customer data; 0006 is already installed, so no repeat migration is required. Production must still reject fixture execution. Reconfirm source prices and account rights at activation; do not collect credentials in documents or chat. Use the existing secure provider-credential workflow only when authorized.

## Pilot procedure and acceptance

1. Validate identity, exact source grants, comp set, secure account access and all caps. Record approval version and expiry. Run disabled-mode/isolation/egress/budget tests before deployment.
2. Take read-only customer-data baseline; release scoped dispatcher with execution still off. Verify ABC Hotel's real SIL access, no synthetic records and no other property activation.
3. On explicit run authorization, execute baseline. Log sanitized per-category outcomes, attempted/successful sources, known/unknown cost and reservation balance. Stage findings for review.
4. Owner reviews every pilot candidate and every material factual briefing statement against its source: correct hotel/entity, permitted excerpt, support, publication versus discovery date, inference labels and relevance. No quota. Approve/reject via the existing workflow; record corrections.
5. After baseline review, run the single manually authorized follow-up within the same total cap. Verify material change/deduplication, immutable history, partial/failed/blocked/no-change outcomes and retained last successful data. Quiet results are valid; do not manufacture a change.
6. Verify approved findings and private states survive fresh sign-in; export exact source/version references; compare existing customer data for unauthorized changes. Re-disable the pilot after the second job or expiry.

Go/no-go: zero cross-tenant access, unauthorized dispatches, duplicate paid requests, unsupported published claims or misattributed properties; all published claims source-linked and owner-reviewed; total accounted spend at/below caps; honest gaps/outcomes; preserved profile/private state/history. If sources are unavailable or no useful findings emerge, document the limited result rather than claim commercial readiness. Owner assesses usefulness; no room-night/revenue or time-saved claims without evidence.

## Exact approval checklist (all pending)

1. **Identity and geography:** confirm official hotel name/domain/address/aliases and prospecting boundary.
2. **Comp set:** approve 2–3 exact properties with addresses and official URLs, or explicitly accept blocked competitor coverage.
3. **Sources and rights:** approve a completed exact-host/path register, permitted retention/excerpts and required/optional coverage; resolve 403 sources without bypass.
4. **Provider processing:** authorize Brave discovery and OpenAI extraction of approved public-source material; verify accounts, model and storage rights securely. No customer credentials or private notes sent to providers.
5. **Spend:** approve $0.10/job, $0.20 total, exactly two manual jobs, the request/token/time ceilings, no automatic retries, and seven-day expiry. Purchases/subscriptions remain separate.
6. **Implementation/release:** authorize the narrowly scoped live dispatcher, review-before-publication integration, job-count/pilot-total enforcement and deployment after tests. Approval of this plan alone does not bypass missing engineering gates.
7. **Run and publication:** explicitly authorize the two-job pilot when prerequisites pass; name the human findings approver. Findings require individual approval before publication. The second run waits for baseline review.

Schedules and notifications are expressly excluded from every approval above. Approving Pass C does not approve ongoing research, broader markets, extra hotels, outreach or review responses.
