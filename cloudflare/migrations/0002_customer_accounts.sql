-- Customer account foundation. Separate from synthetic repository and existing market schema.
CREATE TABLE customer_properties (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, property_name TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 profile_json TEXT CHECK(profile_json IS NULL OR json_valid(profile_json)),
 coverage_json TEXT NOT NULL DEFAULT '{"corporate":"","project":"","event":""}' CHECK(json_valid(coverage_json)),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0), last_actor TEXT, updated_at TEXT,
 PRIMARY KEY(tenant_id,property_id)
);
CREATE TABLE customer_memberships (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, user_id TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN('viewer','editor','admin')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 PRIMARY KEY(tenant_id,property_id,user_id),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_properties(tenant_id,property_id) ON DELETE CASCADE
);
CREATE TABLE customer_sessions (
 token_hash TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, user_id TEXT NOT NULL,
 app_key TEXT NOT NULL, credential_version INTEGER NOT NULL, issued_at TEXT NOT NULL, expires_at INTEGER NOT NULL,
 FOREIGN KEY(tenant_id,property_id,user_id) REFERENCES customer_memberships(tenant_id,property_id,user_id) ON DELETE CASCADE
);
CREATE INDEX customer_session_expiry ON customer_sessions(expires_at);
CREATE TABLE customer_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, property_id TEXT NOT NULL,
 actor TEXT NOT NULL, action TEXT NOT NULL, revision INTEGER, at TEXT NOT NULL
);
CREATE INDEX customer_audit_scope ON customer_audit(tenant_id,property_id,id);
CREATE TRIGGER customer_workspace_audit AFTER UPDATE OF profile_json,coverage_json ON customer_properties BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at)
 VALUES(NEW.tenant_id,NEW.property_id,NEW.last_actor,'workspace_updated',NEW.revision,NEW.updated_at);
END;
CREATE TRIGGER customer_membership_revoke AFTER UPDATE OF active,role ON customer_memberships BEGIN
 DELETE FROM customer_sessions WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND user_id=NEW.user_id;
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.user_id,'membership_changed',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TABLE customer_login_limits (key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_end INTEGER NOT NULL);
CREATE TRIGGER customer_session_created AFTER INSERT ON customer_sessions BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.user_id,'session_started',NEW.issued_at);
END;
CREATE TRIGGER customer_session_removed AFTER DELETE ON customer_sessions BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,at) VALUES(OLD.tenant_id,OLD.property_id,OLD.user_id,'session_ended',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER customer_property_access_changed AFTER UPDATE OF active ON customer_properties BEGIN
 DELETE FROM customer_sessions WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id;
END;
