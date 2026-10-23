CREATE TABLE customer_openai_usage_call_receipts (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, job_id TEXT NOT NULL, call_key TEXT NOT NULL,
 accounted_micros INTEGER NOT NULL CHECK(accounted_micros>=0), basis TEXT NOT NULL CHECK(basis IN('billing-export','provider-usage-upper-bound')), evidence_sha256 TEXT NOT NULL CHECK(length(evidence_sha256)=64), evidence_note TEXT NOT NULL, recorded_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,job_id,call_key),
 FOREIGN KEY(tenant_id,property_id,job_id,call_key) REFERENCES customer_provider_calls(tenant_id,property_id,job_id,call_key)
);
CREATE TRIGGER customer_openai_call_receipt_guard BEFORE INSERT ON customer_openai_usage_call_receipts BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.job_id=NEW.job_id AND c.call_key=NEW.call_key AND c.state!='reserved' AND c.accounted_micros>=NEW.accounted_micros) OR EXISTS(SELECT 1 FROM customer_openai_usage_reconciliations r JOIN json_each(r.covered_keys_json) k ON k.value=NEW.call_key WHERE r.tenant_id=NEW.tenant_id AND r.property_id=NEW.property_id AND r.job_id=NEW.job_id) THEN RAISE(ABORT,'CALL_RECEIPT_INVALID') END;
END;
CREATE TRIGGER customer_openai_call_receipt_immutable_update BEFORE UPDATE ON customer_openai_usage_call_receipts BEGIN SELECT RAISE(ABORT,'CALL_RECEIPT_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_call_receipt_immutable_delete BEFORE DELETE ON customer_openai_usage_call_receipts BEGIN SELECT RAISE(ABORT,'CALL_RECEIPT_IMMUTABLE'); END;
CREATE VIEW customer_openai_reconciled_call_keys AS
 SELECT r.tenant_id,r.property_id,r.job_id,k.value AS call_key FROM customer_openai_usage_reconciliations r JOIN json_each(r.covered_keys_json) k
 UNION ALL SELECT tenant_id,property_id,job_id,call_key FROM customer_openai_usage_call_receipts;
DROP TRIGGER customer_openai_pilot_call_guard;
CREATE TRIGGER customer_openai_pilot_call_guard BEFORE INSERT ON customer_provider_calls
WHEN EXISTS(SELECT 1 FROM customer_openai_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id)
BEGIN
 SELECT CASE WHEN NEW.maximum_micros>464000 OR (SELECT count(*) FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.job_id=NEW.job_id)>=5 THEN RAISE(ABORT,'OPENAI_PILOT_CALL_LIMIT') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_jobs j JOIN customer_openai_pilot_policies pol ON pol.tenant_id=j.tenant_id AND pol.property_id=j.property_id AND pol.id=j.policy_id
  WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running'
   AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND pol.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000
   AND (SELECT COALESCE(sum(c.accounted_micros),0) FROM customer_provider_calls c JOIN customer_openai_pilot_jobs x ON x.tenant_id=c.tenant_id AND x.property_id=c.property_id AND x.id=c.job_id WHERE x.tenant_id=pol.tenant_id AND x.property_id=pol.property_id AND x.policy_id=pol.id)+NEW.maximum_micros<=pol.total_micros
 ) THEN RAISE(ABORT,'OPENAI_PILOT_BUDGET_OR_LEASE') END;
END;
