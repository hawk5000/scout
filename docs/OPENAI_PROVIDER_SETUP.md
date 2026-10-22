# OpenAI provider setup and pilot gate

Updated 2026-10-22. The one-cycle spending ceiling below is approved, but this is not a live activation.

## Secret destination

SCOUT's provider calls run in the Cloudflare customer Worker `scout-customer-foundation`. Vercel calls that Worker for customer operations; the browser must never receive the OpenAI key.

The existing key is configured as the `OPENAI_API_KEY` secret in Cloudflare Worker `scout-customer-foundation` (confirmed by secret name only; the value was not read). Do not add it as a plaintext Wrangler variable, Vercel environment variable, local `.env` file or GitHub secret. The Worker binds it server-side through `Env.OPENAI_API_KEY`.

After the connector release is available, a signed-in SCOUT workspace administrator can verify the connection at `/api/customer/openai-connection`. The endpoint calls only `GET https://api.openai.com/v1/models/gpt-6-luna`, never reads the response body, and returns only `not_configured`, `valid`, `denied`, or `unavailable`. It does not run research.

## Connector boundaries

- Research uses `POST https://api.openai.com/v1/responses`, `gpt-6-luna`, Standard tier, `store:false`, Responses `web_search`, one maximum tool call, low search context, and server-owned allowed-domain filters. Search receipts and cited URLs must validate against those grants. No client-provided key, host, prompt, or scope can select a provider destination.
- The Worker adapter bounds request/response bytes and time, disables redirects, stores no provider response in provider logs, and uses the existing atomic provider ledger before dispatch. Usage is settled from the Responses usage payload and actual web-search tool-call count. Unknown usage retains the whole reservation.
- Provider-generated summaries and citations are research drafts, not verbatim source quotes. They must remain staged for a human to open and review the linked source; the existing quote-based finding ingestion cannot be fed fabricated “quotes.” A zero-source response is not a confirmed no-change result.
- The local code now wires this adapter to an administrator-only, manually advanced five-category dispatcher and a separate persistent review-draft/briefing path. It never sends these paraphrase summaries into `ReviewedImports` or the customer Market Blueprint. The manual route requires the expiring source policy, budget, fresh SIL validation and SCOUT administrator permission. Live results do not yet exist.

## Approved one-cycle limit

The earlier $0.20 limit applied to the fixture-prepared pilot proposal and cannot cover the current OpenAI web-search request reservation. The owner approved **$1.25 total for one manual five-category cycle** on October 22, 2026. No second cycle, recurring research or rollover is approved.

The $1.25 maximum covers zero retries and at most one web-search tool call per category, with at most 2,000 output tokens per request and no cache/Fast/regional uplift assumptions. One call reserves $0.2215: up to 1,050,000 input tokens at the documented long-context rate ($0.21), 2,000 output tokens ($0.0015), and one web-search call ($0.01). Five calls reserve at most $1.1075; the remaining $0.1425 is a ceiling buffer. Search context `low` is not treated as a token cap. Actual billing still must be reconciled per response; pilot policy must stop before dispatch if it cannot reserve the full conservative amount. Hosting and support costs are excluded. Approval of this ceiling does not activate the connector or grant any unlisted source host/path.

## Current approved production setup — October 22, 2026

The owner approved one $1.25 manual cycle and the public-source policy below. D1 migrations 0005/0006 were compared object-by-object (22 identical definitions) before their missing history entries were recorded. Additive migrations 0007/0008 are installed; no existing customer tables were reset. The October provider job/month limits are both 1,250,000 micro-USD. One expiring policy permits one job only, five calls maximum, no retries. Global fixture research policy, schedules and notifications remain disabled; only the explicit manual pilot route can use the approved live policy.

| Category | Approved domains |
| --- | --- |
| Corporate and Project | www.hillsboro-oregon.gov; www.washingtoncountyor.gov |
| Event | www.westside-commons.com; tualatinvalley.org |
| Competitor | www.marriott.com; www.ihg.com; www.hilton.com — only the three saved properties |
| Hotel mentions | www.hillsboro-oregon.gov; www.washingtoncountyor.gov; tualatinvalley.org — address match required |

Retain URLs/titles, observed and explicitly stated dates, concise AI paraphrases, citations, implications, unknowns and usage for private review. No whole articles, photos or guest personal data. No automatic publication. Brand-wide news is not a selected-hotel match. No review-platform/social coverage is promised. The saved area is the 10-mile Hillsboro/Beaverton market; the own-hotel website is absent, so address-based matches must remain explicitly qualified.

### Exact authorization gap (not a credentials problem)

ABC Hotel remains an active SCOUT **editor**, as the owner explicitly requested. No membership, SIL role, password or other application access was changed. SCOUT's `customer_memberships.role` controls pilot administration. SIL's existing customer login returns `role` from property access, but SCOUT does not map that field, and SIL's `validateCustomerAppSession` response does not return or revalidate a research permission. Signing into the SIL administrator console does not create a SCOUT administrator session. Earlier instructions to simply use an existing SIL administrator session were incorrect.

There is **no existing SIL-only setting that makes this SCOUT route authorized**. To keep ABC's role unchanged and manage authorization in SIL, the next required action is to authorize a scoped SIL integration change: add an explicitly granted SCOUT-only manual-research permission for tenant_abc/property_abc_abc_hotel/user_info_abchotel_com, expose and revalidate it through the existing server-to-server login/session contract, and have SCOUT check that permission on every dispatch. This is a proposed contract, not a fabricated existing endpoint. Do not change the user's global/property role to admin; that could affect other applications and still would not satisfy the current SCOUT check. No SIL code or settings were changed in this repository task.

The existing Worker secret name was confirmed without reading its value. The free model connection check and all paid calls remain blocked by authorization. No provider request or live result is claimed. Token-based cost calculations must be labelled calculated from measured usage, not reconciled OpenAI invoices.

## Official provider references

- [Responses API create](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [GPT-6 Luna model and context](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
