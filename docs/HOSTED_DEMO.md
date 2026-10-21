# Isolated hosted synthetic demo

The full `/demo` workspace now works on Vercel without a shared database, credentials or new cloud resources. This is a public fictional sandbox, **not authenticated customer access**. `/app` and `/api/workspace` remain closed.

## Persistence and isolation

The browser saves a validated action journal plus its current display snapshot in localStorage under `scout-isolated-synthetic-v1`. State survives page reloads and browser restarts on that device/browser profile, expires after seven days, and is removed by **Exit & clear demo**. Tabs in the same browser profile share the demo; separate browser profiles/incognito contexts do not. This is not cross-device storage or an account. Use fictional information only, especially on shared devices.

Web Locks serialize changes across tabs. Failed requests never replace the stored state. Reads, filtering, copy and export use the saved snapshot and make no research requests. Edits and explicit fixture actions send the journal to `/api/sandbox` over HTTPS. The server validates strict commands, reconstitutes the submitted fictional state in a fresh in-memory SQLite repository, applies the action and returns a new snapshot. The memory database is closed in `finally`; no filesystem or shared database is used. No session tokens, scope identifiers or database paths are accepted or returned. A fresh tenant/property scope is generated server-side for each computation.

The journal is user-controlled synthetic input, not an authentication credential. Altering it can affect only the fictional state submitted in that request. There is no stored server record to retrieve from another visitor and no customer adapter to access. Private production profiles must never use this transport. The legacy local SQLite API/worker remain separate and are still blocked on Vercel.

## Bounds and capabilities

- Same-origin POST only; no CORS enablement, scope override, arbitrary URL, provider or tool configuration.
- Strict command schemas; 256 KB streamed body limit, 128 journal events and 12 research/worker actions per demo.
- Bounded offline fixture engine, six-second history evaluation deadline and 15-second function ceiling. No external research, model, search or notification client exists in this path.
- Browser-local profile, save/dismiss, setup, coverage, findings, versions, usage, job history and disabled delivery previews.
- Explicit **Process next fixture job** processes one queued synthetic job. This is a manual rehearsal step, not a cloud background worker or an automatically recurring service. Existing local durable-job tests do not imply a hosted durable queue.
- Historical pure fixture computation is replayed on writes to reconstruct state. This does not incur paid research or add duplicate run/delivery records. It must not be repurposed for side-effecting external providers.
- Both direct research scenarios and subscription jobs retain credit ceilings and meaningful-change checks. Browser demo starts with all three scout categories enabled, but fictional subscription activation remains explicit.
- No live notification transport. Configured recipients produce previews only. All real budgets, production identity and entitlement requirements remain unchanged.

## Review

Open the public site and click **Explore the full fictional demo**, or visit `/demo` and start a new demo. Review Overview, Blueprint, details, all three agents, Updates, Exports, Hotel Profile and Administrator setup. Save, dismiss, copy and export findings; reload to confirm persistence. In Administrator setup, activate the fictional subscription, queue the initial blueprint, then process the next fixture job. Repeat for update and quiet jobs. Use two incognito contexts to verify isolation. Clear the demo when finished.

The standalone `npm run pilot:fixtures` and `npm run worker:fixtures` remain local developer tools. Hosted visitors need neither command. No paid service or additional infrastructure was provisioned for this demo.
