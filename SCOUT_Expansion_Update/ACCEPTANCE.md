# Acceptance checks
Use existing tests and extend only for meaningful new behavior. Track pass/fail/not-run with evidence; fixture checks do not certify live sources.

| Scenario | Required result |
|---|---|
| Selected comp set | Only active explicitly selected competitors are scanned; unrelated nearby hotels excluded |
| Similar property names | Ambiguous own-hotel mention flagged, not attributed confidently |
| Brand-wide announcement | Not represented as a property-specific change without supporting evidence |
| Unchanged second run | No duplicate observations or material-change alerts |
| Syndicated article | One underlying mention with source relationships retained |
| Published earlier, discovered now | Publication and discovery dates distinguished |
| Cross-agent event | Related competitor/event observations linked, not double-counted as independent opportunities |
| Canceled/expired item | Status/history updated; not portrayed as an active offer/event |
| Sentiment ambiguity | Mixed/unclear allowed with context; no invented rating |
| Source inaccessible | Coverage incomplete; never asserted as zero mentions |
| Fresh briefing | Refresh outcome persisted first; brief references exact finding/evidence versions |
| Quiet refresh | Honest no-change brief with labeled ongoing context |
| Partial refresh | Failed/skipped categories and last successful times visible |
| Double-click/concurrent schedule | Compatible job joined or serialized; no duplicate provider spend |
| Budget boundary | Provider call blocked before exceeding approved reservation; unused budget released |
| Disabled live mode | No paid research or sending possible through any new endpoint |
| Interrupted job | Safe recovery without duplicate ingestion or uncontrolled retry cost |
| Entitlement revoked | Server denies new reads/writes/refresh/exports as required by existing contract |
| Tenant isolation | A second tenant cannot read/edit/export first tenant's findings, comp set or briefs |
| Fixture separation | ABC Hotel/customer data unchanged; synthetic records remain isolated |
| Durable data | Findings, history, saved states and briefs survive sessions and deployments |
| Brief support | Every material factual claim cites available supporting evidence; implications labeled |
| Frontend | New routes, filters, source links, status and exports usable on desktop/390px/320px |
| Production proof | Real source retrieval and actual cost recorded before claiming live readiness |

Do not fabricate successful checks. If live validation is unauthorized, report those cases as not run and name the concrete dependency.
