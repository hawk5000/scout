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
- The new connector is not yet wired to `PilotDispatcher` or `ReviewedImports`. The dispatch path remains synthetic-only and no live research can start. This is intentional until evidence staging semantics and operator grants are implemented and the budget gate is approved.

## Approved one-cycle limit

The earlier $0.20 limit applied to the fixture-prepared pilot proposal and cannot cover the current OpenAI web-search request reservation. The owner approved **$1.25 total for one manual five-category cycle** on October 22, 2026. No second cycle, recurring research or rollover is approved.

The $1.25 maximum covers zero retries and at most one web-search tool call per category, with at most 2,000 output tokens per request and no cache/Fast/regional uplift assumptions. One call reserves $0.2215: up to 1,050,000 input tokens at the documented long-context rate ($0.21), 2,000 output tokens ($0.0015), and one web-search call ($0.01). Five calls reserve at most $1.1075; the remaining $0.1425 is a ceiling buffer. Search context `low` is not treated as a token cap. Actual billing still must be reconciled per response; pilot policy must stop before dispatch if it cannot reserve the full conservative amount. Hosting and support costs are excluded. Approval of this ceiling does not activate the connector or grant any unlisted source host/path.

Migration `0007_pilot_dispatch.sql` currently permits at most $0.10 per pilot job and $0.20 per policy, and explicitly rejects non-fixture tenant/property IDs. It cannot execute this OpenAI plan. A reviewed additive migration plus a live-only dispatcher/evidence-staging path is required; neither is applied to production. Do not alter the existing customer market or migrate until that scoped release is reviewed.

## Remaining pilot inputs and current checks

- The Worker secret name is present. The no-research connection check still needs this code released before it can be run from the hosted administrator screen.
- The owner approved the $1.25 maximum for one manual five-category cycle. No call has been made and no spend has been incurred.
- Read-only production configuration confirms the saved ABC Hotel market anchor at 9790 Northeast Tanasbourne Dr, Hillsboro, Oregon 97124, a 10-mile radius including Hillsboro and Beaverton, and three active explicitly selected competitors (Residence Inn by Marriott Portland Hillsboro, Holiday Inn Portland West - Hillsboro by IHG, and Embassy Suites by Hilton Portland Hillsboro, Oregon). ABC Hotel has no official hotel domain. Use the saved address as the geographic anchor; property-mention identity remains uncertain and must not be promoted as a confirmed match based on the display name alone.
- Approve and install exact source-host/path grants and permitted retention for the five research categories. The production pilot has no active grants. The connector refuses a request with no server-owned allowed domains.
- Complete an evidence review-stage format that preserves OpenAI citations without claiming the model's paraphrases are source-verbatim quotes; wire the manual job into durable pilot state and the review surface.
- Apply and verify a new scoped D1 migration and Worker/Vercel release only after approval; keep schedules, live recurring research and notifications disabled.

## Official provider references

- [Responses API create](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [GPT-6 Luna model and context](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
