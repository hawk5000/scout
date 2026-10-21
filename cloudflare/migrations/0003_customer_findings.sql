-- Additive, opt-in market storage. No customer scope is enrolled by this migration.
CREATE TABLE customer_markets (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL,
 data_mode TEXT NOT NULL CHECK(data_mode IN('synthetic','reviewed')) CHECK(data_mode!='synthetic' OR (tenant_id GLOB 'fixture_*' AND property_id GLOB 'fixture_*')),
 revision INTEGER NOT NULL DEFAULT 0,
 document_json TEXT NOT NULL DEFAULT '{"records":[],"assessments":{},"runs":[]}' CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_properties(tenant_id,property_id) ON DELETE CASCADE
);
CREATE TABLE customer_ingestion_batches (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, batch_key TEXT NOT NULL,
 payload_hash TEXT NOT NULL, expected_revision INTEGER NOT NULL,
 actor TEXT NOT NULL, at TEXT NOT NULL, document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,batch_key),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_markets(tenant_id,property_id) ON DELETE CASCADE
);
CREATE TRIGGER customer_ingestion_guard BEFORE INSERT ON customer_ingestion_batches BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_markets m JOIN customer_properties p USING(tenant_id,property_id) WHERE m.tenant_id=NEW.tenant_id AND m.property_id=NEW.property_id AND m.revision=NEW.expected_revision AND p.active=1) THEN RAISE(ABORT,'market_revision_conflict') END;
END;
CREATE TRIGGER customer_ingestion_commit AFTER INSERT ON customer_ingestion_batches BEGIN
 UPDATE customer_markets SET document_json=NEW.document_json,revision=revision+1 WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id;
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'findings_ingested',NEW.expected_revision+1,NEW.at);
END;
CREATE TABLE customer_finding_states (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, finding_id TEXT NOT NULL,
 saved INTEGER NOT NULL CHECK(saved IN(0,1)), dismissed INTEGER NOT NULL CHECK(dismissed IN(0,1)),
 revision INTEGER NOT NULL DEFAULT 1, actor TEXT NOT NULL, at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,finding_id),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_markets(tenant_id,property_id) ON DELETE CASCADE
);
CREATE TRIGGER customer_finding_state_insert AFTER INSERT ON customer_finding_states BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'finding_state_updated',NEW.revision,NEW.at);
END;
CREATE TRIGGER customer_finding_state_update AFTER UPDATE ON customer_finding_states BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'finding_state_updated',NEW.revision,NEW.at);
END;
CREATE TRIGGER customer_market_mode_immutable BEFORE UPDATE OF data_mode ON customer_markets WHEN NEW.data_mode!=OLD.data_mode BEGIN
 SELECT RAISE(ABORT,'market_data_mode_is_immutable');
END;
