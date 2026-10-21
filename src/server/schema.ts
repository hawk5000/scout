// SQLite demo schema. Private rows are bound to both tenant AND property.
export const demoSchema = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS properties (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, profile_json TEXT NOT NULL,
 coverage_json TEXT NOT NULL, setup_step INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant_id, property_id)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, property_id TEXT NOT NULL,
 expires_at INTEGER NOT NULL, role TEXT NOT NULL CHECK(role IN ('demo_admin','demo_viewer')),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,property_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public_findings (id TEXT PRIMARY KEY, entity_id TEXT NOT NULL UNIQUE, record_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assessments (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, finding_id TEXT NOT NULL REFERENCES public_findings(id), assessment_json TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,finding_id), FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,property_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS private_state (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, finding_id TEXT NOT NULL,
 saved INTEGER NOT NULL CHECK(saved IN (0,1)), dismissed INTEGER NOT NULL CHECK(dismissed IN (0,1)),
 PRIMARY KEY(tenant_id,property_id,finding_id),
 FOREIGN KEY(tenant_id,property_id,finding_id) REFERENCES assessments(tenant_id,property_id,finding_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS research_runs (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, id TEXT NOT NULL, cycle_key TEXT NOT NULL, record_json TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,id), UNIQUE(tenant_id,property_id,cycle_key),
 FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,property_id) ON DELETE CASCADE
);
`;
