# Prepared Cloudflare direction

`migrations/0001_foundation.sql` is a D1-compatible SQL foundation, tested on local SQLite only. It is not a deployed database or a functioning research engine. No resource IDs, Worker endpoints, queues or crons are invented. Do not apply it to any existing database without a migration review.

Later: authorized Vercel frontend/backend -> verified server identity and entitlement -> scoped Worker/D1 adapter. The browser must not call SIL or the Worker directly. Records, assessments, private state, runs, usage and deliveries use tenant/property composite constraints. Server queries must still enforce authorized membership; foreign keys alone are not authorization.

The demo uses a separate local SQLite database and random demo sessions, never this production schema. A persistent preview demo adapter and protected Vercel project are required before deployed browser acceptance. Local filesystem storage is intentionally disabled on Vercel.

Pass 2 implements candidate validation, deterministic entity matching, material-change logic and transactional synthetic credit reservations in the isolated local engine (`src/research`). Its `synthetic_*` tables are created locally and are not a D1 deployment or a live research service. Pass 3 implements leased local fixture jobs, crash recovery, explicit timezone-aware slot evaluation, fictional entitlement rechecks and idempotent disabled delivery previews. Its `fixture_*` tables and finite Node worker are not a D1/Queues deployment. Atomic fixture computation must not be copied into a paid provider adapter: external calls require durable operation receipts and provider-aware recovery. Verified live entitlement and sending remain unavailable. The production tables remain unconnected contracts.

Current documentation checked: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) and [foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/). Live database behavior remains unverified.
