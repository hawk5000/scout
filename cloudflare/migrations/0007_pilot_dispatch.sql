-- Local synthetic preparation only. No seeds or activation.
CREATE TABLE customer_pilot_policy (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, id TEXT NOT NULL,
 expires_at INTEGER NOT NULL, max_jobs INTEGER NOT NULL CHECK(max_jobs BETWEEN 1 AND 2),
 total_micros INTEGER NOT NULL CHECK(total_micros BETWEEN 1 AND 200000),
 document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,id)
);
CREATE TRIGGER customer_pilot_policy_immutable BEFORE UPDATE ON customer_pilot_policy
BEGIN SELECT RAISE(ABORT,'pilot_policy_immutable'); END;
CREATE TRIGGER customer_pilot_policy_bounds BEFORE INSERT ON customer_pilot_policy BEGIN
 SELECT CASE WHEN NEW.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000+604800000 THEN RAISE(ABORT,'PILOT_EXPIRY_TOO_LONG') END;
END;
CREATE TABLE customer_pilot_jobs (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, id TEXT NOT NULL, pilot_id TEXT NOT NULL,
 request_key TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN('running','pending-review','failed','blocked')),
 lease TEXT NOT NULL, lease_until INTEGER NOT NULL, created_at INTEGER NOT NULL,
 actor TEXT NOT NULL, session_hash TEXT NOT NULL,
 document_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,id), UNIQUE(tenant_id,property_id,request_key),
 FOREIGN KEY(tenant_id,property_id,pilot_id) REFERENCES customer_pilot_policy(tenant_id,property_id,id)
);
CREATE UNIQUE INDEX customer_pilot_active ON customer_pilot_jobs(tenant_id,property_id) WHERE state='running';
CREATE TRIGGER customer_pilot_job_limit BEFORE INSERT ON customer_pilot_jobs BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE s.token_hash=NEW.session_hash AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.user_id=NEW.actor AND s.expires_at>NEW.created_at AND m.active=1 AND p.active=1 AND m.role IN('editor','admin')) THEN RAISE(ABORT,'PILOT_ACCESS_DENIED') END;
 SELECT CASE WHEN NEW.tenant_id NOT LIKE 'fixture\_%' ESCAPE '\' OR NEW.property_id NOT LIKE 'fixture\_%' ESCAPE '\' THEN RAISE(ABORT,'LIVE_DISABLED') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_pilot_policy p WHERE p.tenant_id=NEW.tenant_id AND p.property_id=NEW.property_id AND p.id=NEW.pilot_id AND p.expires_at>NEW.created_at AND (SELECT count(*) FROM customer_pilot_jobs j WHERE j.tenant_id=p.tenant_id AND j.property_id=p.property_id AND j.pilot_id=p.id)<p.max_jobs) THEN RAISE(ABORT,'PILOT_EXPIRED_OR_EXHAUSTED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM customer_pilot_jobs j LEFT JOIN customer_import_reviews r ON r.tenant_id=j.tenant_id AND r.property_id=j.property_id AND r.review_id=j.id WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.pilot_id=NEW.pilot_id AND (j.state!='pending-review' OR r.status IS NULL OR r.status='pending')) THEN RAISE(ABORT,'BASELINE_REVIEW_REQUIRED') END;
END;
CREATE TRIGGER customer_pilot_stage_guard BEFORE INSERT ON customer_import_reviews
WHEN EXISTS(SELECT 1 FROM customer_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.review_id) BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_pilot_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash JOIN customer_memberships m ON m.tenant_id=j.tenant_id AND m.property_id=j.property_id AND m.user_id=j.actor JOIN customer_properties p ON p.tenant_id=j.tenant_id AND p.property_id=j.property_id WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.review_id AND j.state='running' AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND p.active=1 AND m.role IN('editor','admin') AND NOT EXISTS(SELECT 1 FROM customer_expansion_config c WHERE c.tenant_id=j.tenant_id AND c.property_id=j.property_id AND json_extract(c.document_json,'$.paused')=1)) THEN RAISE(ABORT,'PILOT_STAGE_DENIED') END;
END;
CREATE TRIGGER customer_pilot_publish_guard BEFORE UPDATE OF status ON customer_import_reviews
WHEN NEW.status='approved' AND EXISTS(SELECT 1 FROM customer_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.review_id) BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.review_id AND j.state='pending-review') THEN RAISE(ABORT,'PILOT_NOT_REVIEWABLE') END;
END;
CREATE TRIGGER customer_pilot_call_limit BEFORE INSERT ON customer_provider_calls
WHEN EXISTS(SELECT 1 FROM customer_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id) BEGIN
 SELECT CASE WHEN (SELECT COALESCE(sum(accounted_micros),0) FROM customer_provider_calls WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND job_id=NEW.job_id)+NEW.maximum_micros>100000 THEN RAISE(ABORT,'PILOT_JOB_BUDGET') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_pilot_jobs j JOIN customer_pilot_policy p ON p.tenant_id=j.tenant_id AND p.property_id=j.property_id AND p.id=j.pilot_id WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running' AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND p.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND (SELECT COALESCE(sum(c.accounted_micros),0) FROM customer_provider_calls c JOIN customer_pilot_jobs k ON k.tenant_id=c.tenant_id AND k.property_id=c.property_id AND k.id=c.job_id WHERE k.tenant_id=p.tenant_id AND k.property_id=p.property_id AND k.pilot_id=p.id)+NEW.maximum_micros<=p.total_micros) THEN RAISE(ABORT,'PILOT_BUDGET_OR_LEASE') END;
END;
