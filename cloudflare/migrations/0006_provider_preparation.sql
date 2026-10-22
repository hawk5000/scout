-- Additive preparation only. No customer seeds, runtime activation or existing-table writes.
CREATE TABLE IF NOT EXISTS customer_provider_limits (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, month TEXT NOT NULL,
 job_limit_micros INTEGER NOT NULL CHECK(job_limit_micros>0),
 monthly_limit_micros INTEGER NOT NULL CHECK(monthly_limit_micros>=job_limit_micros),
 rate_version TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,month)
);
CREATE TABLE IF NOT EXISTS customer_provider_calls (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, month TEXT NOT NULL,
 job_id TEXT NOT NULL, call_key TEXT NOT NULL,
 maximum_micros INTEGER NOT NULL CHECK(maximum_micros>=0),
 accounted_micros INTEGER NOT NULL CHECK(accounted_micros>=0 AND accounted_micros<=maximum_micros),
 state TEXT NOT NULL CHECK(state IN('reserved','known','unknown')),
 PRIMARY KEY(tenant_id,property_id,job_id,call_key),
 FOREIGN KEY(tenant_id,property_id,month) REFERENCES customer_provider_limits(tenant_id,property_id,month)
);
CREATE TRIGGER IF NOT EXISTS customer_provider_reserve BEFORE INSERT ON customer_provider_calls BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_provider_limits WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month) THEN RAISE(ABORT,'PROVIDER_POLICY_MISSING') END;
 SELECT CASE WHEN NEW.accounted_micros!=NEW.maximum_micros OR NEW.state!='reserved' THEN RAISE(ABORT,'PROVIDER_RESERVATION_INVALID') END;
 SELECT CASE WHEN (SELECT COALESCE(SUM(accounted_micros),0) FROM customer_provider_calls WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month)+NEW.maximum_micros > (SELECT monthly_limit_micros FROM customer_provider_limits WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month) THEN RAISE(ABORT,'PROVIDER_MONTH_BUDGET') END;
 SELECT CASE WHEN (SELECT COALESCE(SUM(accounted_micros),0) FROM customer_provider_calls WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND job_id=NEW.job_id)+NEW.maximum_micros > (SELECT job_limit_micros FROM customer_provider_limits WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month) THEN RAISE(ABORT,'PROVIDER_JOB_BUDGET') END;
END;
CREATE TRIGGER IF NOT EXISTS customer_provider_settle BEFORE UPDATE ON customer_provider_calls BEGIN
 SELECT CASE WHEN OLD.state!='reserved' OR NEW.state='reserved' OR NEW.tenant_id!=OLD.tenant_id OR NEW.property_id!=OLD.property_id OR NEW.month!=OLD.month OR NEW.job_id!=OLD.job_id OR NEW.call_key!=OLD.call_key OR NEW.maximum_micros!=OLD.maximum_micros OR (NEW.state='unknown' AND NEW.accounted_micros!=OLD.maximum_micros) THEN RAISE(ABORT,'PROVIDER_SETTLEMENT_INVALID') END;
END;
