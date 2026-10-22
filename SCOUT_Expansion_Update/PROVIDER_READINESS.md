# Pass B provider preparation — 2026-10-21

Status: local preparation implemented with synthetic provider responses. No research queries, model calls, credentials, production data writes, deployment, schedules or notifications were executed. Reading the documentation below was the only external research in this pass. This is not live-source validation.

## Implementation mapping

- `src/research/source-adapters.ts`: Brave request/response adapter; public text/HTML retrieval boundary; OpenAI Responses structured extraction; bounded response/request sizes, calls and time; explicit failure codes; canonical URLs; verbatim evidence/date checks; versioned current rate card. Pure HTTP serializers put credentials only on the documented fixed API hosts and prohibit redirects. The default transport always returns LIVE_DISABLED and has no environment override.
- `src/research/prepared-provider.ts`: provider-shaped discovery → retrieval → schema-validated extraction → `validateSourceItems` → existing `MarketIngestion` → existing immutable `makeBrief` snapshots. The prepared provider is injectable only into isolated synthetic execution; deployed Worker construction still uses the existing fixture provider. No browser command selects a provider or supplies credentials/source grants.
- `src/customer/expansion-provider.ts`: reuse five-category contracts, active comp-set identities, actual receipt hashes and source dates; reject unsupported quotes/excerpts, downgrade insufficient identity matches. Model-written receipt hashes/dates are not trusted. The initial integrated adapter leaves publication dates null rather than treating crawl dates as publication.
- `src/research/provider-ledger.ts` and additive `0006_provider_preparation.sql`: durable integer micro-USD reservations, scoped property/month/job caps, duplicate call denial, rate-version enforcement and conservative settlement. Missing/unknown usage remains fully accounted. This is separate from Pass A's artificial fixture units, not a conversion of those units to currency. SQL migration is local-only, not applied to either remote D1.
- Existing customer SIL/session, ingestion deduplication/history, private states, scoped exports and deterministic source-linked briefing are reused. No second findings store or generated free-form briefing model was added.

## Current official documentation and rates

Checked October 21, 2026. Recheck before authorization or after rate-card expiry; these are public list rates, not evidence of account access or negotiated terms.

| Component | Supported method and current rate | Limitation / decision |
|---|---|---|
| Brave Web Search | GET `/res/v1/web/search`, `q`, `count`; server `X-Subscription-Token`. Public Search price $5/1,000 requests. [API guide](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started), [pricing and storage FAQ](https://brave.com/search/api/) | Discovery only. Snippets never become verified findings. No pagination, automatic fallback, paid upgrade or free-credit assumption. Storage rights require the appropriate plan; account rights are unverified. |
| OpenAI Responses | POST `/v1/responses`, strict `text.format` JSON schema, `store:false`, no tools. Candidate model `gpt-6-luna`, Standard: $0.10 input / $0.50 output per million tokens. [model](https://developers.openai.com/api/docs/models/gpt-6-luna), [pricing](https://developers.openai.com/api/docs/pricing), [structured output guide](https://developers.openai.com/api/docs/guides/structured-outputs) | Candidate only, not a quality-approved production choice. Use no cache discount, regional uplift, Fast tier or built-in search. GPT-4.1 Mini was rejected as a new candidate because its current model page marks it deprecated. Account availability and evidence quality remain unverified. |
| Approved primary pages | Public HTTPS text/plain or text/html, exact operator-approved host list, no redirects or credentials | No per-page API fee assumed; infrastructure is extra. Domain/source rights and safe server egress must be approved. No JS browser rendering, PDF parsing, login/paywall bypass, or unrestricted crawling. |
| Brief synthesis | Existing deterministic exact-version/evidence snapshots | No extra model/tool charge. Quality still depends on reviewed evidence and interpretations. |

Brave pricing page contains differing promotional credit descriptions; no credits are used in the estimate. A search plan does not itself grant rights to copy the underlying articles. Persist only permitted short excerpts, facts and source lineage; reject an unapproved source class.

## Coverage by source class

| Source class | Proposed coverage | Status |
|---|---|---|
| Corporate | Selected company/agency announcements and public local facility pages | Adapter prepared; exact approved domains/URLs absent |
| Project | Official public project, award and permit text pages | Prepared for text/HTML only; portal/API/PDF coverage unknown |
| Event | Organizer and venue public pages for identified editions | Prepared; no claim of exhaustive calendar coverage |
| Competitor | Only active named comp-set members' approved pages and permitted indexed reporting | No ABC Hotel comp set selected/approved by this pass; no nearby hotel auto-selection |
| Property | Correct-property mentions on approved public pages | Identity checks prepared; no comprehensive review monitoring claim |
| Review APIs | Optional future source, not implemented or activated | [Google Business Profile review guide](https://developers.google.com/my-business/content/review-data) requires application registration/OAuth. No account/location access supplied or verified. [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) restrict caching/storage and require attribution; not suitable to assume unrestricted persistent review ingestion. |
| Social feeds/paywalls | None promised | No supported access contract, rights or price established; explicitly unavailable, never counted as zero mentions |

## Concrete release proposal (not approval)

See `config/pass-b-release-proposal.json`. Intended scope is ABC Hotel's existing `tenant_abc` / `property_abc_abc_hotel`; no profile or membership changes. Exact official hotel identity/domain, active competitor IDs and source grants remain owner-approved inputs, not guesses. The source-grant and competitor arrays intentionally remain empty and prevent activation.

Proposed one-refresh envelope: 5 searches, at most 20 pages, 5 extraction calls, 2,000 output tokens/call, at most 33,024 conservatively bounded input tokens/call, zero automatic retries, 10-second request / 120-second job limits. Request body is capped at 32,000 UTF-8 bytes; 1,024 tokens cover framing in the estimate. Larger inputs fail rather than silently dropping evidence. Freshness is 24 hours. A first baseline uses the same bounds and cannot promise an exhaustive market survey.

Conservative provider estimate: 5 × $0.005 + 5 × ceil_microUSD(33,024 × $0.10/1M + 2,000 × $0.50/1M) = **$0.046515 per refresh**, excluding hosting/storage/support/tax and separately licensed content. Proposed approval ceilings: **$0.10/refresh, $2/property/month, 10 on-demand refreshes/month**. These are pilot engineering proposals, not pricing changes or approved spend. Actual research spend this pass: **$0**. No extra synthesis model is budgeted. The current default transport cannot execute even below those ceilings.

## Approval and activation dependencies

1. Owner approves ABC Hotel identity/domain, exact comp set, source list/rights, required-versus-optional coverage and proposed budgets/freshness/on-demand limits. Empty source lists cannot be replaced by invented URLs.
2. Securely verify provider accounts, model access and Brave storage rights; approve any subscription/credit purchase separately. No credentials are requested in source files or reports.
3. Approve a bounded live-pilot release. Its dispatcher must use server-derived SIL scope, revalidate entitlement/pause/lease before every paid call, bind a fresh provider ledger to each durable job, and retain unknown-cost holds on interruption. Pass B deliberately supplies no enabled network transport or client-side activation switch. The approved source egress must bound streamed bytes, reject redirects and prevent private-network/DNS rebinding access; current synthetic tests do not validate real DNS/HTTP behavior.
4. Deploy additive 0006 to existing D1 and the scoped dispatcher/config to existing Worker/Vercel only after authorization. Do not seed production, recreate customer records or drop previous tables. Migration rollback retains additive data. Recheck current rate card/model availability before the deployment.
5. Run one authorized baseline and incremental cycle; manually evaluate correct identity, factual/semantic support, old-versus-new publication context, deduplication and cost. Verbatim quote presence alone does not prove that a model interpreted a claim correctly. Real findings continue to need the existing reviewed-import/approval controls until live quality is approved.

Schedules and notifications remain separate approvals and remain disabled even if a manual pilot is approved. No Pass C work was performed. No new external services were provisioned.
