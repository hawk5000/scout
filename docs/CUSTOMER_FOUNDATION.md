# Customer account and persistent data foundation

## Activated integration — 2026-10-21

This section supersedes the historical local-only blockers below. SCOUT is registered as `scout` in SIL with explicit mappings, direct entitlements and a dedicated auth-only service principal. Its scope is restricted to two newly created internal QA hotels. Existing SIL service registrations and customer accounts were preserved.

The deployed customer boundary is Vercel -> `scout-customer-foundation` Worker -> SIL authentication / dedicated `scout-customer-production` D1. `cloudflare/wrangler.toml` contains the verified resource identifiers. Migrations 0001 and 0002 are applied. Credentials are stored only in provider secrets and ignored operator files. There are no research, AI, cron, queue or delivery bindings.

Both customer flags are enabled for this scoped integration. Actual SIL login and Worker/D1 workspace checks passed for both internal accounts. Deployed browser acceptance is in progress; see the latest PROJECT_STATUS entry for final results. New customer onboarding requires verified SIL identities, active mappings and entitlements, an explicit principal scope, and local SCOUT membership. No self-registration or broad service access was enabled.

Worker transport rejects redirects using manual handling (Cloudflare does not support redirect:error). SQL writes use RETURNING rows instead of D1 meta.changes, which includes audit-trigger writes. Auth calls have a bounded 15-second timeout; the Vercel broker has 25 seconds.


## Inspected contracts (2026-10-21)

Read the sibling SIL checkout's `CANONICAL_APP_ACCESS_STANDARD.md`, `PRODUCTION_PERSISTENCE_STANDARD.md`, `src/schemas/customer-portal.ts`, `src/services/customer-app-auth-service.ts`, `src/services/customer-app-auth-resolver.ts`, `src/services/auth.ts`, and its two customer-auth API routes. Also inspected Hotel Review Desk's server-side SIL client for trusted-context patterns. No sibling repository was modified.

Verified existing SIL operations:
- `POST /api/apps/customer-auth/login`: authenticated service call with email, password and appKey. A successful response supplies tenant/property/user identity, credentialVersion, accessAllowed and mustChangePassword.
- `POST /api/apps/customer-auth/session-status`: service call using server-held tenantId, propertyId, userId, appKey, credentialVersion and sessionIssuedAt. Checks active identity, current credentials and application access again.
- The canonical evaluator owns entitlement/mapping/subscription decisions. Explicit direct entitlements can allow access without Stripe. SCOUT does not implement subscription policy locally.

**SCOUT was absent from the inspected auth registry/configuration and application schemas.** There is no verified SCOUT app key, service-principal grant, mapping, authorized customer or live resource in this checkout. `SIL_APP_KEY` therefore has no default. It must be supplied only after SIL's owner registers SCOUT and confirms the canonical key and service capabilities. Never substitute another application's key or credential. A generic endpoint implementation does not establish that SCOUT is accepted by production SIL.

## Implemented boundary

Browser -> same-origin Next.js API -> authenticated SCOUT Worker -> SIL for authentication/revalidation; Worker -> D1 binding for SCOUT private data. Browsers never receive service credentials, tenant/property selectors or the session token in JSON. The browser gets a Secure, HttpOnly, SameSite=Strict, host-only cookie, while D1 stores only its SHA-256 hash. Sessions expire after eight hours. Login rotates the current browser session; logout deletes the server session. Every read, edit and export revalidates SIL and checks current local membership/property state. Credential resets requiring a password change deny access; reset management stays in SIL.

No browser journals or demo records migrate to customer data. Separate `customer_*` tables hold approved hotel assignments, local viewer/editor/admin restrictions, hashed sessions, profile/coverage data, revision counters, sanitized audit metadata and durable login limits. Local assignments can only restrict SIL authorization, never replace it. Editor/admin can edit profiles; viewer can read/export. No customer can self-grant membership. The operator prepares reviewed access SQL using verified SIL identities.

The Worker exposes typed operations, not arbitrary SQL. An unconfigured Worker fails closed. There is no fallback database, in-memory production state, mock identity or default tenant. Prepared statements and session-derived queries enforce property scope. Updates use optimistic revisions and database triggers so audit failure rolls back the write. Local membership/role changes and property access changes invalidate sessions. SIL outages deny access without deleting saved data; explicit SIL revocation invalidates the local session.

Login limits are durable: ten attempts per normalized email and sixty across the SCOUT web service in each fifteen-minute window. The global service limit intentionally avoids trusting caller IP headers; tune only with an approved trusted proxy strategy. Normal customer data has no seven-day expiry. Expired sessions and rate buckets are cleaned at login; no customer data is auto-deleted.

The customer UI includes sign-in/out, Overview, Blueprint and all three scout empty states, Updates, editable hotel profile/market/coverage preferences, read-only accounts, conflict feedback, reload and authenticated JSON profile export. No researched finding ingestion or customer research jobs are exposed in this phase. Account creation, password resets, property selection/defaults and primary entitlement administration remain in SIL; SCOUT does not fork them. Multiple authorized properties require SIL's verified default resolution; ambiguity denies login.

## Configuration and activation dependencies

Vercel: `SCOUT_CUSTOMER_ENABLED=false`, `SCOUT_CUSTOMER_WORKER_ORIGIN` (approved HTTPS origin), `SCOUT_CUSTOMER_SERVICE_TOKEN` (dedicated secret).

Worker: D1 binding `DB`; `CUSTOMER_ENABLED=false`; matching `SERVICE_TOKEN` (at least 32 characters); `SIL_ORIGIN`; scoped `SIL_SERVICE_TOKEN`; confirmed `SIL_APP_KEY`. No credential values belong in committed configuration. Use `cloudflare/customer.wrangler.example.toml` only as a template: it has no database ID, account ID or route and is not an active deployment configuration.

Apply reviewed migrations 0001 and 0002 to a dedicated approved SCOUT database only after provisioning/migration authorization. The new customer tables do not reuse demo storage. The prepared market schema remains unused until a later authorized data integration. Supply real DB/route configuration and provision approved local memberships; prove the scoped SIL principal can call both auth endpoints for SCOUT. Do not reuse a broad legacy service key. Verify runtime contract responses before opening access.

Cloudflare D1 binding/batch behavior checked against official documentation: https://developers.cloudflare.com/d1/worker-api/d1-database/ . Worker bindings avoid the administrative REST API for ordinary customer requests. No new dependency was required.

## Operator preparation (offline)

`npm run customer:prepare-access -- <approved-input.json> <new-output.sql>` prepares SQL only; it never executes it and will not overwrite an existing output file. Keep inputs/outputs outside the repo or in ignored `local-data/`.

Assignment input: operation `assign`, verified tenantId, propertyId, userId, propertyName and role (`viewer`, `editor`, `admin`). It creates an empty local hotel and explicit membership, not a SIL user or entitlement. Existing membership conflicts fail for manual review. Revocation input: operation `revoke` with the same scope/user. Property erasure input: operation `delete-property`, verified tenantId/propertyId and confirmation `DELETE PRIVATE SCOUT DATA`. Erasure cascades local memberships/sessions and profile data; audit metadata remains separately retained. Review and apply prepared statements together in the authorized database, never against SIL's database.

Before live activation: check database identity and schema, both auth contracts, denied/allowed account behavior, cross-property isolation, password-reset/revocation behavior, profile persistence across devices/redeploys, and deployed cookie/browser behavior. Test the authorized Worker runtime and D1 service, not just SQLite compatibility. Take a backup/export, restore into an isolated approved database and verify a known profile/revision before claiming recovery readiness. Set an approved audit retention policy and operational alerts without enabling customer notifications. Rollback closes both customer flags; it must not drop data or fall back to demo. Restore only against an explicitly verified target with approval.

## Inactive features

Customer contracts hardcode researchEnabled=false, paidCallsEnabled=false and notificationsEnabled=false. Worker accepts only login, logout, read and profile update operations. No research, scheduling, payment, notification, queue, model or tool bindings are configured. HTTP transport is limited to SIL authentication and the private Worker. The existing synthetic demo remains independent.

## Verification boundary

Tests use a disposable SQLite implementation of the D1 statement interface and a stub of the inspected SIL HTTP response contract. They verify real SQL persistence/reopen, isolation, role enforcement, stale writes, audit atomicity, session invalidation, throttling, transport validation and deny-by-default boundaries. This is evidence of local implementation correctness, not live D1 or real SIL acceptance. Browser acceptance remains reserved for an authorized Vercel deployment with the real external dependencies configured.
