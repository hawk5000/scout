# SCOUT by SalesHospitality

Your hotel’s market research assistant.

Build Passes 1–4 provide a persistent fictional demo, an offline research engine and durable fixture subscription jobs, plus a repeatable two-market pilot rehearsal. This is **not production-ready**. Live research, automatic scheduling, notification sending, SIL integration and payments remain disabled.

## Run locally

Node 24 and npm are required. From the nested project root:

```powershell
Set-Location 'C:\Users\Admin\Documents\Playground\SCOUT\SCOUT'
npm ci
npm run dev:demo
```

Open [SCOUT locally](http://127.0.0.1:3000), then choose **Explore the fictional demo**. No credentials are required for this explicitly fictional local demo. For the compiled application, run `npm run build`, then `npm run start:demo`.

The demo launchers bind to loopback and disable Next telemetry. They do not alter `.env`, provision resources or start research. `npm run dev` and `npm start` leave demo access disabled unless explicitly enabled. Node 24's built-in SQLite emits an experimental warning; no native database package is required.

## Working interface

- Public service explanation and $99 setup + $50/month working offer. The setup form downloads a local brief; it does not submit an order or inquiry.
- Overview, searchable/filterable Market Blueprint, finding details, evidence, dates, lodging relevance, unknowns and version history.
- Corporate SCOUT, Project SCOUT and Event SCOUT pages with coverage controls and run history.
- Updates, quiet/partial outcomes, selected/filtered CSV export, copy and print briefs.
- Persistent save/dismiss/restore, validated Hotel Profile, recipients, schedule preferences and guided administrator setup.
- Server-derived session/tenant/property boundaries and spreadsheet-safe CSV encoding.

## Synthetic research and subscription rehearsal

For the Pass 2 engine workbench, open **Administrator setup → Synthetic research workbench** and run baseline → update → quiet. Other scenarios cover conflicts, outages, cancellation, event editions, malformed input, injection, budget cutoff, retry and interruption. A confirmed profile and administrator session are required. See [Pass 2 acceptance](docs/PASS_2_ACCEPTANCE.md).

For Pass 3:

1. Unpause the desired scouts on their agent pages. New demos intentionally start paused.
2. Open **Administrator setup → Subscription & delivery rehearsal**, activate fictional entitlement, and queue the initial blueprint.
3. Run `npm run worker:fixtures` in a second terminal in this project root. This separate worker processes at most 20 attempts and exits.
4. Refresh job status, then refresh the page to see findings and run history. Queue synthetic update and quiet-check jobs to review change detection.
5. Add fictional recipients in Hotel Profile to prepare delivery previews. Nothing is sent. Pause or revoke fictional entitlement to stop new work.

The due-slot button explicitly checks the configured two weekly days, time and timezone. No recurring scheduler is installed. Artificial credits are test units, not USD or provider prices. The offline adapter has no network capability. Actual charged USD is zero; live research budgets in `config/research-policy.example.json` remain zero. Direct engine replay cannot overlap pending jobs and respects configured subscription activation and credit ceilings.

See [Pass 3 acceptance and recovery limits](docs/PASS_3_ACCEPTANCE.md). Fixture crash recovery is not a guarantee for external paid calls.

## Persistence and isolation

The application creates `local-data/scout-demo.sqlite` when demo access is used. Each demo receives random tenant/property IDs and a random session token; only its hash is stored. An HttpOnly, SameSite=Strict cookie carries the browser token. Private profiles, annotations, jobs, usage, previews and exports are scoped server-side; requests cannot choose another property. Private responses are not cached.

Sessions expire after seven days without renewal. Creating a new session cleans up expired private properties. **Exit & clear demo** deletes that property's private data, including jobs and previews; shared fictional facts remain. Clearing only the browser cookie leaves private rows until expiry cleanup. Do not enter real hotel/customer information.

The local adapter is unavailable when `VERCEL` or `VERCEL_ENV` is present. An authorized preview requires isolated persistent storage and access controls. Production `/app` remains closed and `/api/workspace` returns 503; no mock identity fallback exists.

## Verification

```powershell
npm test
npm run typecheck
npm run format:check
npm run build
npm run test:http
```

HTTP smoke checks start and stop loopback production servers, create temporary demo sessions and remove their private data. They use no browser, model or research API. Browser acceptance, including responsive layout, keyboard, clipboard, print and download behavior, remains pending an authorized Vercel deployment.

## Architecture and production dependencies

Next.js App Router / React / TypeScript / Zod, server-only local runtime, and a prepared D1 foundation under `cloudflare/migrations`. The browser calls the app backend; later SIL/Worker access must be server-to-server with verified contracts. No resource IDs or endpoints were invented.

Pass 4 requires authorized identity/entitlement and cloud resources, a persistent preview adapter, approved research providers and hard spending limits, confirmed pilot hotels, and separately authorized notification configuration. See [Project status](docs/PROJECT_STATUS.md).

Dependency versions were checked against npm on 2026-10-21 and resolved in `package-lock.json`; Passes 2–3 added no dependencies. References: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Node SQLite](https://nodejs.org/api/sqlite.html), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).


## Pass 4 synthetic pilot

Run `npm run pilot:fixtures` to evaluate two fictional Seattle/Portland profiles through one baseline and four shared update slots each. It uses disposable in-memory storage and writes `reports/synthetic-pilot/REPORT.md`, structured results, two CSV blueprints and a blank human-review template. No live work or changes to the existing demo database occur. Review the local public sample at `/sample` and its CSV at `/sample/export`. Administrator setup includes a cost-assumption calculator; unknown inputs remain unknown.

See [Pass 4 acceptance](docs/PASS_4_ACCEPTANCE.md) for results, optional manual fixture review and live-launch gates. Production remains blocked; this is not a real pilot or a verified public market sample.
