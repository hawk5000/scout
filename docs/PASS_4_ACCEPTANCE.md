# Pass 4 — synthetic pilot and launch rehearsal

Completed locally on 2026-10-21 under the user's synthetic-only authorization. This completes the local rehearsal scope of Pass 4. It does **not** complete a real Seattle/Portland pilot, deployed browser acceptance or production launch.

## Repeatable evaluation

Run `npm run pilot:fixtures` from the nested SCOUT project root. No running web server is required. The command uses a disposable in-memory repository, the existing scoped subscription queue/worker and offline evidence engine. It never opens `local-data/scout-demo.sqlite`, modifies an existing demo property, contacts a research provider or sends a notification. Cloud/live flags are rejected.

The two profiles are explicitly named **Seattle Fictional Pilot Hotel** and **Portland Fictional Pilot Hotel**. Their fictional district names, organizations and identities are distinct. They do not correspond to real hotels, addresses, neighborhoods, market boundaries or researched companies. The scenarios use a virtual calendar from October 19–30, 2026, independent of execution date. A local-only fixture session lifetime accommodates that simulated interval without changing the app's seven-day policy.

Each property has an initial blueprint and four shared Tuesday/Friday update slots over two weeks. Repeating enqueue for each slot verifies idempotency. A fixture-provider input supplies the recorded update, quiet, outage and cancellation responses to the normal scheduled job; this injection is internal code, not a browser/provider override API. All enabled scouts share each slot.

| Fixture result | Seattle | Portland |
|---|---:|---:|
| Baseline jobs | 1 | 1 |
| Shared update jobs | 4 | 4 |
| Final unique records | 3 | 3 |
| Duplicate records / final records | 0 / 3 | 0 / 3 |
| Meaningful version updates | 6 | 6 |
| Disabled delivery previews | 9 | 9 |
| Baseline artificial credits | 84 | 84 |
| Four updates' artificial credits | 336 | 336 |
| Actual charged USD | $0 | $0 |

These are fixture measurements, not market performance claims or provider price estimates. Five sources for a project still resolve to one record. A quiet cycle prepares no previews. The outage cycle is Partial and preserves the accepted contractor. Cancellation/completion changes produce new versions without duplicating identities. Evidence remains fictional, live verification dates remain null, and lodging inference and unknowns remain separate.

## Artifacts and human review

The command writes a repeatable local report bundle to `reports/synthetic-pilot/`:

- `REPORT.md`: readable outcomes, cycle checks and launch blockers.
- `results.json`: structured metrics, cycle coverage, fixture checks, findings and review fields. No demo session tokens or tenant/property IDs are exported.
- `seattle-blueprint.csv` and `portland-blueprint.csv`: clearly labeled fictional exports using the existing formula-safe CSV encoder.
- `review-template.json`: blank human-review observations, with null times/counts rather than fabricated measurements.

Copy the review template to another local file before editing it. After a person actually reviews the fictional outputs, enter onboarding minutes, correction minutes, useful findings (0–3) and notes, then run:

```powershell
npm run pilot:fixtures -- --review-file .\my-fixture-review.json
```

The strict input is limited to 16 KB; its mode must be `synthetic-review`. It rejects unknown fields, negative times, impossible usefulness counts and a live-mode label. Reruns replace the generated report bundle and blank template, but do not overwrite the separately named review file. Observations appear in `results.json` as human fixture review; they do not establish live evidence accuracy. No human evaluation was supplied during this build, so all human measurements remain null.

## Commercial review

Administrator setup now includes an assumption calculator for the $99 setup/$50 monthly offer. It accepts baseline research cost, onboarding time, recurring research/hosting allocation, support time and labor rate. It computes setup and monthly contribution separately. Blank inputs remain unknown; negative contribution is not clamped away. Inputs stay in the page and are not saved or sent.

The report deliberately leaves live contribution unknown. Artificial credits cannot be converted to provider dollars. Even a fully populated assumption calculation excludes acquisition, payment, taxes and other overhead and is not measured profit. No pricing, support effort, customer outcome or profitability conclusion was invented.

## Public sample and launch pages

`/sample` is linked from the public website. It explains three fictional examples with fact/inference/unknown separation, evidence metadata, dates and material-change context. `/sample/export` downloads those same three bundled examples without requiring a demo session or running research. The allowlist cannot include private pilot/customer records. Fictional source addresses are displayed as illustrative text, not represented as verified citations. The footer no longer calls the application Build Pass 1.

Real source verification is not available under this pass's constraints; no fictional finding was upgraded to a verified public sample. The commercial offer still does not take orders or payments. Existing launch explanation, assisted setup brief, demo access and scope limits remain intact.

## Final verification

- `npm run pilot:fixtures`: passed both five-cycle campaigns and wrote the bundle.
- `npm test`: **43/43 passed**, including repeatable pilot results, review schema, unknown/negative commercial results and public sample isolation. Prior tenant/property, evidence, cost, process-crash, lease and duplicate-prevention tests remain passing.
- `npm run typecheck`, `npm run format:check`, `npm run build`: passed.
- `npm run test:http`: **89 assertions passed**, including public sample/CSV availability with demo disabled and existing production fail-closed checks.
- Browser acceptance: not performed. The user's authorized-Vercel preference remains in force; no local browser automation was substituted.
- No new dependencies, SDKs, credentials, resource IDs, provider endpoints or cloud configuration were introduced. The lockfile remains valid.

## Launch decision: blocked

| Gate | Current evidence / dependency |
|---|---|
| Fixture mechanics | Passed locally; not live coverage or quality evidence |
| Real pilot properties | Need confirmed Seattle/Portland hotel briefs and research authorization |
| Production identity/entitlement | Need verified server identity, membership and SIL contracts plus test identity; production remains closed |
| Research transport and costs | Need approved provider/model, credentials, current rate card, explicit hard budgets, durable operation receipts and safe unknown-outcome recovery |
| Cloud persistence/jobs | Need authorized Vercel/Cloudflare resources and isolated preview storage; local SQLite is not deployed D1/Queues |
| Human quality/effort | Need real evidence accuracy, usefulness, coverage, correction/support and onboarding observations |
| Responsive/browser acceptance | Need authorized protected Vercel deployment and persistent preview adapter |
| Notification delivery | Need separate authorization and provider/sender/recipient configuration; no sender exists |
| Commercial viability | Unmeasured; fixture success and zero charges cannot support a margin claim |

Next work is an explicitly authorized integration/pilot release pass after the applicable dependencies exist. There is no implied permission to deploy, spend, provision resources, send messages or publish this report.
