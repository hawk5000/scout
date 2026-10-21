# Pass 1 acceptance record

Date: 2026-10-21. Scope: local foundation and fictional interface only.

## Implemented and automated

| Area | Evidence |
|---|---|
| Persistent private state | Repository test closes and reopens SQLite, verifies saved state and setup progress, then tests revocation and cascading deletion |
| Access isolation | Distinct tenant sessions plus two properties in one tenant; unauthorized finding mutations rejected; admin-only mutation gate |
| Production denial | No demo flag denies access; Vercel production and preview flags deny even with demo enabled; compiled production API remains 503 |
| CSRF | Same-origin Host check; foreign/missing origin and spoofed forwarded-host rejection |
| Filters / exports | Shared filter function; API filters and selected IDs; unauthorized/unknown IDs rejected; safe formula/quote/newline CSV; source URLs, dates, unknowns and demo labels retained |
| Profile / setup | Invalid URLs, timezones, geometry range, categories, recipients, cycle times/days and scope overrides rejected; setup requires confirmation and sequential progress |
| D1 contract | Migration parses on local SQLite; composite foreign keys, cycle uniqueness and per-recipient finding/version delivery uniqueness tested |
| Application | TypeScript, formatting, production build, compiled page/API smoke checks |

## Browser acceptance pending

The user explicitly requires browser acceptance on an authorized Vercel deployment rather than local browser testing. No browser was launched. Source implementation and HTTP checks do not establish visual or browser-interaction sign-off.

At the authorized preview, verify:

1. Desktop at 1440/1600px, laptop at 1024px, and mobile at 390px: navigation, table/card presentation, readable text, focus, wrapping and no page overflow.
2. Enter demo; search/filter; open details; save/dismiss/restore; navigate and reload; verify private state remains.
3. Select and export a subset, then filtered results; confirm download names/content and UTF-8 handling in a spreadsheet.
4. Clipboard success/failure messaging, readable fallback and print layout with unmistakable fictional labeling.
5. Agent tabs using mouse and arrow/Home/End keys; coverage editing, pause preference, history and clear inactive status.
6. Profile validation and reload; every guided setup step; public local brief download; exit and session revocation.
7. Unauthorized, expired, cross-property, stale, quiet, partial and empty states remain distinct.

## Design fidelity ledger

Reference: `design/overview-concept.png` (built-in image generation).

| Point | Implemented source decision | Render evidence |
|---|---|---|
| Palette | Warm white canvas, forest rail, near-black type, restrained gold | Pending authorized preview |
| Hierarchy | Serif page headings, sans-serif controls, findings given most space | Pending |
| Layout | Desktop fixed rail; main findings area and coverage/history aside; mobile menu and stacked records | Pending |
| Components | Thin rules, 8px panels, category tags, quiet cycle and evidence status | Pending |
| Content | Counts derived from nine fixtures; generated-image dates/claims replaced by typed fictional data | HTTP/API data validated; render pending |
| Actions | Native buttons/links/forms, copy, CSV and print; no screenshot masquerading as UI | Browser interaction pending |

No live research quality, actual spend, margin, source rights, SIL contracts, provider calls, queue concurrency, production storage, notification delivery or customer outcomes are verified in Pass 1.
