import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import type { Database, Statement } from "../../src/customer/store";
import type { AuthProvider } from "../../src/customer/sil";
import type { Ingestion } from "../../src/customer/market-contracts";
export const scope = {
  tenantId: "fixture_tenant",
  propertyId: "fixture_hotel",
  actor: "fixture_operator",
  dataMode: "synthetic" as const,
};
export function adapter(db: DatabaseSync): Database {
  return {
    prepare(sql) {
      let values: unknown[] = [];
      const s: Statement = {
        bind(...v) {
          values = v;
          return s;
        },
        async first<T>() {
          return (db.prepare(sql).get(...(values as never[])) ??
            null) as T | null;
        },
        async run() {
          db.prepare(sql).run(...(values as never[]));
          return { meta: { changes: 1 } };
        },
      };
      return s;
    },
  };
}
export function provision(
  db: DatabaseSync,
  tenant = scope.tenantId,
  property = scope.propertyId,
  user = "fixture_user",
  role = "editor",
) {
  db.prepare(
    "INSERT OR IGNORE INTO customer_properties(tenant_id,property_id,property_name) VALUES(?,?,?)",
  ).run(tenant, property, "Fictional acceptance hotel");
  db.prepare(
    "INSERT OR IGNORE INTO customer_memberships(tenant_id,property_id,user_id,role) VALUES(?,?,?,?)",
  ).run(tenant, property, user, role);
}
export function database(filename = ":memory:") {
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of [
    "0002_customer_accounts.sql",
    "0003_customer_findings.sql",
  ])
    db.exec(readFileSync(`cloudflare/migrations/${file}`, "utf8"));
  provision(db);
  db.prepare(
    "INSERT INTO customer_markets(tenant_id,property_id,data_mode) VALUES(?,?,'synthetic')",
  ).run(scope.tenantId, scope.propertyId);
  return db;
}
export function auth(
  tenant = scope.tenantId,
  property = scope.propertyId,
  user = "fixture_user",
): AuthProvider {
  return {
    async login() {
      return {
        tenantId: tenant,
        propertyId: property,
        userId: user,
        propertyName: "Fictional hotel",
        appKey: "scout",
        credentialVersion: 1,
        sessionIssuedAt: "2026-10-21T00:00:00.000Z",
      };
    },
    async validate() {},
  };
}
export function batch(revision = 0, key = "fixture_baseline"): Ingestion {
  return {
    batchKey: key,
    expectedRevision: revision,
    observedAt: `2026-10-${String(10 + revision).padStart(2, "0")}T12:00:00.000Z`,
    status: "Completed",
    categories: ["corporate", "project", "event"],
    warnings: [],
    items: (["corporate", "project", "event"] as const).map((kind, i) => {
      const facts = {
        activity:
          kind === "event"
            ? ("event" as const)
            : kind === "project"
              ? ("construction" as const)
              : ("training" as const),
        status: "Active" as const,
        start: "2026-11-01",
        end: "2026-11-03",
        venue: "Fictional venue",
        contractor: null,
        organizations: ["Fictional organization"],
      };
      const url = `https://sources.example/${kind}`;
      return {
        candidate: {
          kind,
          categories: [kind],
          name: `Fictional ${kind} finding`,
          identity: `fictional-activity-${i}`,
          location: "Fictional market",
          edition: kind === "event" ? "2026" : null,
          facts,
          sources: [
            {
              url,
              publisher: "Fictional source",
              publishedAt: "2026-10-09",
              claims: Object.entries(facts)
                .filter(([, v]) => v !== null)
                .map(([field, value]) => ({
                  field: field as keyof typeof facts,
                  quote: String(value),
                })),
            },
          ],
        },
        summary: `Fictional ${kind} activity; synthetic acceptance data.`,
        assessment: {
          inference: "Possible visitors; no overnight demand is established.",
          rationale: "Synthetic assessment only.",
          unknowns: ["Actual lodging needs are unknown."],
        },
        receipts: [
          {
            url,
            retrievedAt: "2026-10-10T10:00:00.000Z",
            contentHash: "a".repeat(64),
          },
        ],
      };
    }),
  };
}
