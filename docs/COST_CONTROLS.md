# Cost and delivery rules

Treat a scan as many searches and model calls. Track actual costs, not just run count. Separate baseline, updates and exceptional retries. Two weekly cycles cover all three scouts together.

Provisional budget discussion: $5–$10 initial blueprint research and $5–$10 recurring monthly research per hotel; target total recurring delivery cost <= $15 only if measured quality and costs support it. None of these figures has been validated in this product. $20 net profit on $50 revenue would require all costs, including acquisition, overhead and owner time, to fit within $30.

Use a current versioned provider rate card. Reserve spend atomically before paid calls, enforce job/property limits including concurrent runs, reconcile actual usage, retain reservations safely through interruptions, and bound searches, tokens, retries and runtime. Do not assume provider alerts stop spend. A cutoff produces Partial/Needs attention rather than false success.

Opening screens, filtering and export must make no model calls. Keep manual rescans admin-only initially. Source caching, shared public facts and incremental comparison can reduce costs but do not replace evidence verification. Never reduce quality silently to hit a marketing claim.

The configuration template starts live research disabled with zero budgets. Set budgets and rates only after approval. Consult docs/ARCHITECTURE.md for full accounting and isolation requirements.
