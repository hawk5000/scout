-- Operator-installed aggregate billing receipt. No customer data or ledger rows rewritten.
-- No application endpoint creates receipts. Keep original reservations as conservative budget holds.
CREATE TABLE customer_openai_usage_reconciliations (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, job_id TEXT NOT NULL,
 billed_micros INTEGER NOT NULL CHECK(billed_micros>=0 AND billed_micros<=1250000),
 covered_keys_json TEXT NOT NULL CHECK(json_valid(covered_keys_json) AND json_array_length(covered_keys_json)>0),
 evidence_sha256 TEXT NOT NULL CHECK(length(evidence_sha256)=64),
 evidence_note TEXT NOT NULL CHECK(length(evidence_note) BETWEEN 1 AND 2000),
 recorded_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,job_id),
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_openai_pilot_jobs(tenant_id,property_id,id)
);
CREATE TRIGGER customer_openai_reconciliation_guard BEFORE INSERT ON customer_openai_usage_reconciliations BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='blocked' AND json_extract(j.document_json,'$.blockedCode')='PROVIDER_USAGE_RECONCILIATION_REQUIRED') THEN RAISE(ABORT,'RECONCILIATION_JOB_INVALID') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.covered_keys_json) k WHERE k.type!='text' OR NOT EXISTS(SELECT 1 FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.job_id=NEW.job_id AND c.call_key=k.value AND c.state!='reserved')) OR json_array_length(NEW.covered_keys_json)!=(SELECT COUNT(DISTINCT value) FROM json_each(NEW.covered_keys_json)) THEN RAISE(ABORT,'RECONCILIATION_KEYS_INVALID') END;
 SELECT CASE WHEN NEW.billed_micros>(SELECT SUM(c.accounted_micros) FROM customer_provider_calls c JOIN json_each(NEW.covered_keys_json) k ON k.value=c.call_key WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.job_id=NEW.job_id) THEN RAISE(ABORT,'RECONCILIATION_EXCEEDS_HOLDS') END;
END;
CREATE TRIGGER customer_openai_reconciliation_immutable_update BEFORE UPDATE ON customer_openai_usage_reconciliations BEGIN SELECT RAISE(ABORT,'RECONCILIATION_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_reconciliation_immutable_delete BEFORE DELETE ON customer_openai_usage_reconciliations BEGIN SELECT RAISE(ABORT,'RECONCILIATION_IMMUTABLE'); END;
DROP TRIGGER customer_openai_pilot_job_update_guard;
CREATE TRIGGER customer_openai_pilot_job_update_guard BEFORE UPDATE ON customer_openai_pilot_jobs
BEGIN
 SELECT CASE WHEN NEW.tenant_id!=OLD.tenant_id OR NEW.property_id!=OLD.property_id OR NEW.id!=OLD.id OR NEW.policy_id!=OLD.policy_id OR NEW.request_key!=OLD.request_key OR NEW.actor!=OLD.actor OR NEW.session_hash!=OLD.session_hash OR NEW.created_at!=OLD.created_at THEN RAISE(ABORT,'OPENAI_PILOT_JOB_IMMUTABLE') END;
 SELECT CASE WHEN (OLD.state NOT IN('queued','running') AND NOT (OLD.state='blocked' AND NEW.state='running' AND NEW.step=OLD.step AND json_extract(OLD.document_json,'$.blockedCode')='PROVIDER_USAGE_RECONCILIATION_REQUIRED' AND EXISTS(SELECT 1 FROM customer_openai_usage_reconciliations r WHERE r.tenant_id=OLD.tenant_id AND r.property_id=OLD.property_id AND r.job_id=OLD.id))) OR NEW.state NOT IN('queued','running','complete','partial','blocked','failed') THEN RAISE(ABORT,'OPENAI_PILOT_JOB_STATE_INVALID') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_policies pol JOIN customer_sessions s ON s.token_hash=OLD.session_hash
  JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id)
  JOIN customer_expansion_config e USING(tenant_id,property_id)
  WHERE pol.tenant_id=OLD.tenant_id AND pol.property_id=OLD.property_id AND pol.id=OLD.policy_id AND pol.expires_at>NEW.updated_at
   AND s.expires_at>NEW.updated_at AND m.active=1 AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000) AND p.active=1
   AND json_extract(e.document_json,'$.paused') IS NOT 1
 ) THEN RAISE(ABORT,'OPENAI_PILOT_ACCESS_OR_EXPIRY') END;
END;

DROP TRIGGER customer_openai_pilot_call_guard;
CREATE TRIGGER customer_openai_pilot_call_guard BEFORE INSERT ON customer_provider_calls
WHEN EXISTS(SELECT 1 FROM customer_openai_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id)
BEGIN
 SELECT CASE WHEN NEW.maximum_micros>274000 OR (SELECT count(*) FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.job_id=NEW.job_id)>=5 THEN RAISE(ABORT,'OPENAI_PILOT_CALL_LIMIT') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_jobs j JOIN customer_openai_pilot_policies pol ON pol.tenant_id=j.tenant_id AND pol.property_id=j.property_id AND pol.id=j.policy_id
  WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running'
   AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND pol.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000
   AND (SELECT COALESCE(sum(c.accounted_micros),0) FROM customer_provider_calls c JOIN customer_openai_pilot_jobs x ON x.tenant_id=c.tenant_id AND x.property_id=c.property_id AND x.id=c.job_id WHERE x.tenant_id=pol.tenant_id AND x.property_id=pol.property_id AND x.policy_id=pol.id)+NEW.maximum_micros<=pol.total_micros
 ) THEN RAISE(ABORT,'OPENAI_PILOT_BUDGET_OR_LEASE') END;
END;
