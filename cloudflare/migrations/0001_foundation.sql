-- Prepared D1 production foundation. Not applied, provisioned or connected.
-- Authentication/entitlement mapping must come from a verified server adapter.
CREATE TABLE tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE properties (
 tenant_id TEXT NOT NULL REFERENCES tenants(id), id TEXT NOT NULL,
 profile_json TEXT NOT NULL CHECK(json_valid(profile_json)), confirmed INTEGER NOT NULL DEFAULT 0 CHECK(confirmed IN(0,1)),
 activated INTEGER NOT NULL DEFAULT 0 CHECK(activated IN(0,1)), PRIMARY KEY(tenant_id,id)
);
CREATE TABLE memberships (
 subject_id TEXT NOT NULL, tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN('viewer','editor','admin')),
 PRIMARY KEY(subject_id,tenant_id,property_id), FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE market_entities (
 id TEXT PRIMARY KEY, canonical_key TEXT NOT NULL UNIQUE, category TEXT NOT NULL CHECK(category IN('corporate','project','event')),
 normalized_name TEXT NOT NULL, location_json TEXT NOT NULL CHECK(json_valid(location_json)), edition_or_project_key TEXT, parent_entity_id TEXT REFERENCES market_entities(id)
);
CREATE TABLE findings (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES market_entities(id), facts_json TEXT NOT NULL CHECK(json_valid(facts_json)),
 first_seen_at TEXT NOT NULL, last_checked_at TEXT NOT NULL, last_verified_at TEXT
);
CREATE TABLE evidence (
 id TEXT PRIMARY KEY, url TEXT NOT NULL, publisher TEXT NOT NULL, published_at TEXT, retrieved_at TEXT NOT NULL, verified_at TEXT,
 verification_status TEXT NOT NULL CHECK(verification_status IN('verified','provisional','unavailable','conflicting')), rights_notes TEXT
);
CREATE TABLE finding_evidence (
 finding_id TEXT NOT NULL REFERENCES findings(id), evidence_id TEXT NOT NULL REFERENCES evidence(id), supported_claim TEXT NOT NULL,
 PRIMARY KEY(finding_id,evidence_id,supported_claim)
);
CREATE TABLE finding_versions (
 finding_id TEXT NOT NULL REFERENCES findings(id), version INTEGER NOT NULL, change_id TEXT NOT NULL UNIQUE,
 before_json TEXT, after_json TEXT NOT NULL CHECK(json_valid(after_json)), material INTEGER NOT NULL CHECK(material IN(0,1)),
 reason TEXT NOT NULL, evidence_ids_json TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(finding_id,version)
);
CREATE TABLE property_assessments (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, finding_id TEXT NOT NULL REFERENCES findings(id),
 inference TEXT NOT NULL, rationale TEXT NOT NULL, unknowns_json TEXT NOT NULL, version INTEGER NOT NULL,
 PRIMARY KEY(tenant_id,property_id,finding_id), FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE private_state (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, finding_id TEXT NOT NULL,
 saved INTEGER NOT NULL DEFAULT 0 CHECK(saved IN(0,1)), dismissed INTEGER NOT NULL DEFAULT 0 CHECK(dismissed IN(0,1)), updated_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,finding_id), FOREIGN KEY(tenant_id,property_id,finding_id) REFERENCES property_assessments(tenant_id,property_id,finding_id) ON DELETE CASCADE
);
CREATE TABLE research_runs (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, id TEXT NOT NULL, cycle_key TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN('baseline','update')), status TEXT NOT NULL CHECK(status IN('queued','researching','completed','partial','needs_attention','paused')),
 checkpoint_json TEXT, coverage_json TEXT NOT NULL, counts_json TEXT NOT NULL, warnings_json TEXT NOT NULL,
 started_at TEXT, completed_at TEXT, lease_until TEXT, attempts INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant_id,property_id,id), UNIQUE(tenant_id,property_id,cycle_key), FOREIGN KEY(tenant_id,property_id) REFERENCES properties(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE usage_ledger (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, run_id TEXT NOT NULL, entry_id TEXT NOT NULL, scout TEXT NOT NULL,
 provider TEXT, model TEXT, rate_card_version TEXT, input_tokens INTEGER, cached_tokens INTEGER, output_tokens INTEGER, reasoning_tokens INTEGER,
 search_calls INTEGER, tool_calls INTEGER, reserved_microusd INTEGER NOT NULL DEFAULT 0 CHECK(reserved_microusd>=0), actual_microusd INTEGER CHECK(actual_microusd>=0),
 reconciled_at TEXT, PRIMARY KEY(tenant_id,property_id,run_id,entry_id),
 FOREIGN KEY(tenant_id,property_id,run_id) REFERENCES research_runs(tenant_id,property_id,id)
);
CREATE TABLE deliveries (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, run_id TEXT NOT NULL, notification_key TEXT NOT NULL,
 recipient TEXT NOT NULL, finding_id TEXT NOT NULL, finding_version INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN('pending','sent','failed','suppressed')), attempts INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(tenant_id,property_id,notification_key), UNIQUE(tenant_id,property_id,recipient,finding_id,finding_version),
 FOREIGN KEY(tenant_id,property_id,run_id) REFERENCES research_runs(tenant_id,property_id,id),
 FOREIGN KEY(finding_id,finding_version) REFERENCES finding_versions(finding_id,version)
);
CREATE INDEX assessments_scope ON property_assessments(tenant_id,property_id);
CREATE INDEX runs_scope ON research_runs(tenant_id,property_id,started_at);
