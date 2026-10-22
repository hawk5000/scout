-- Additive Pass A storage. No fixture/customer records are inserted by this migration.
CREATE TABLE customer_expansion_config (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, revision INTEGER NOT NULL,
 document_json TEXT NOT NULL CHECK(json_valid(document_json)), actor TEXT NOT NULL,
 session_hash TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_properties(tenant_id,property_id)
);
CREATE TABLE customer_refresh_jobs (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, id TEXT NOT NULL,
 request_key TEXT NOT NULL, compatibility TEXT NOT NULL, actor TEXT NOT NULL, session_hash TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('queued','running','complete','partial','blocked','failed','no-change')),
 created_at TEXT NOT NULL, finished_at TEXT, month TEXT NOT NULL,
 reserved INTEGER NOT NULL CHECK(reserved>=0 AND reserved<=6), spent INTEGER NOT NULL DEFAULT 0 CHECK(spent>=0 AND spent<=6),
 monthly_limit INTEGER NOT NULL CHECK(monthly_limit>0 AND monthly_limit<=120),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 step INTEGER NOT NULL DEFAULT 0 CHECK(step BETWEEN 0 AND 5),
 lease TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,id), UNIQUE(tenant_id,property_id,request_key),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_properties(tenant_id,property_id)
);
CREATE UNIQUE INDEX customer_refresh_active ON customer_refresh_jobs(tenant_id,property_id) WHERE state IN('queued','running');
CREATE TABLE customer_refresh_requests (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, request_key TEXT NOT NULL, job_id TEXT NOT NULL, compatibility TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,request_key),
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_refresh_jobs(tenant_id,property_id,id)
);
CREATE TABLE customer_briefings (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, id TEXT NOT NULL, job_id TEXT NOT NULL,
 version INTEGER NOT NULL, created_at TEXT NOT NULL, document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,id), UNIQUE(tenant_id,property_id,job_id), UNIQUE(tenant_id,property_id,version),
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_refresh_jobs(tenant_id,property_id,id)
);
CREATE TRIGGER customer_brief_immutable BEFORE UPDATE ON customer_briefings BEGIN SELECT RAISE(ABORT,'immutable_brief'); END;
CREATE TRIGGER customer_brief_no_delete BEFORE DELETE ON customer_briefings BEGIN SELECT RAISE(ABORT,'immutable_brief'); END;
CREATE TRIGGER customer_job_budget BEFORE INSERT ON customer_refresh_jobs WHEN NEW.reserved>0 BEGIN
 SELECT CASE WHEN NEW.tenant_id NOT LIKE 'fixture\_%' ESCAPE '\' OR NEW.property_id NOT LIKE 'fixture\_%' ESCAPE '\' THEN RAISE(ABORT,'fixture_scope_required') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(spent+reserved) FROM customer_refresh_jobs WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month),0)+NEW.reserved>NEW.monthly_limit THEN RAISE(ABORT,'expansion_budget_exceeded') END;
END;
CREATE TRIGGER customer_brief_complete AFTER INSERT ON customer_briefings BEGIN
 UPDATE customer_refresh_jobs SET state=json_extract(NEW.document_json,'$.status'),finished_at=NEW.created_at,spent=spent+1,reserved=0,lease=NULL,lease_until=0 WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND id=NEW.job_id AND state='running';
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at) SELECT tenant_id,property_id,actor,'brief_created',NEW.version,NEW.created_at FROM customer_refresh_jobs WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND id=NEW.job_id;
END;

CREATE TRIGGER customer_expansion_config_insert_auth BEFORE INSERT ON customer_expansion_config BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE s.token_hash=NEW.session_hash AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.user_id=NEW.actor AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND p.active=1 AND m.role IN('editor','admin')) THEN RAISE(ABORT,'expansion_access_denied') END;
END;

CREATE TRIGGER customer_expansion_config_update_auth BEFORE UPDATE ON customer_expansion_config BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE s.token_hash=NEW.session_hash AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.user_id=NEW.actor AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND p.active=1 AND m.role IN('editor','admin')) THEN RAISE(ABORT,'expansion_access_denied') END;
END;

CREATE TRIGGER customer_expansion_config_audit AFTER INSERT ON customer_expansion_config BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'customer_expansion_config_created',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;

CREATE TRIGGER customer_refresh_jobs_insert_auth BEFORE INSERT ON customer_refresh_jobs BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE s.token_hash=NEW.session_hash AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.user_id=NEW.actor AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND p.active=1 AND m.role IN('editor','admin')) THEN RAISE(ABORT,'expansion_access_denied') END;
END;

CREATE TRIGGER customer_refresh_jobs_update_auth BEFORE UPDATE ON customer_refresh_jobs BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE s.token_hash=NEW.session_hash AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.user_id=NEW.actor AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND p.active=1 AND m.role IN('editor','admin')) THEN RAISE(ABORT,'expansion_access_denied') END;
END;

CREATE TRIGGER customer_refresh_jobs_audit AFTER INSERT ON customer_refresh_jobs BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'customer_refresh_jobs_created',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;

CREATE TRIGGER customer_expansion_config_revision BEFORE UPDATE ON customer_expansion_config BEGIN
 SELECT CASE WHEN NEW.revision<>OLD.revision+1 THEN RAISE(ABORT,'expansion_revision_conflict') END;
END;
CREATE TRIGGER customer_brief_guard BEFORE INSERT ON customer_briefings BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_refresh_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash JOIN customer_memberships m ON m.tenant_id=s.tenant_id AND m.property_id=s.property_id AND m.user_id=s.user_id WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.step=5 AND j.reserved>=1 AND j.state='running' AND j.lease=json_extract(NEW.document_json,'$.fence') AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND m.role IN('editor','admin')) THEN RAISE(ABORT,'brief_job_not_ready') END;
END;

CREATE TRIGGER customer_expansion_config_updated_audit AFTER UPDATE ON customer_expansion_config BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'expansion_config_updated',NEW.revision,NEW.updated_at);
END;
