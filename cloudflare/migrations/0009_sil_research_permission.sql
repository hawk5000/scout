-- Additive permission fence. Existing memberships, profiles and results are unchanged.
CREATE TABLE customer_research_authorizations (
 session_hash TEXT PRIMARY KEY REFERENCES customer_sessions(token_hash) ON DELETE CASCADE,
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, user_id TEXT NOT NULL, valid_until INTEGER NOT NULL
);
DROP TRIGGER customer_openai_pilot_job_guard;
CREATE TRIGGER customer_openai_pilot_job_guard BEFORE INSERT ON customer_openai_pilot_jobs
BEGIN
 SELECT CASE WHEN NEW.tenant_id GLOB 'fixture_*' OR NEW.property_id GLOB 'fixture_*' OR NEW.tenant_id=NEW.property_id THEN RAISE(ABORT,'OPENAI_REAL_SCOPE_REQUIRED') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_policies pol
  JOIN customer_sessions s ON s.token_hash=NEW.session_hash
  JOIN customer_memberships m USING(tenant_id,property_id,user_id)
  JOIN customer_properties p USING(tenant_id,property_id)
  JOIN customer_expansion_config e USING(tenant_id,property_id)
  JOIN customer_provider_limits l ON l.tenant_id=NEW.tenant_id AND l.property_id=NEW.property_id
   AND l.month=strftime('%Y-%m',NEW.created_at/1000,'unixepoch')
  WHERE pol.tenant_id=NEW.tenant_id AND pol.property_id=NEW.property_id AND pol.id=NEW.policy_id
   AND pol.expires_at>NEW.created_at AND pol.total_micros=1250000 AND pol.max_categories=5
   AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.user_id=NEW.actor
   AND s.expires_at>NEW.created_at AND m.active=1 AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000) AND p.active=1
   AND json_extract(e.document_json,'$.paused') IS NOT 1
   AND l.rate_version='2026-10-21-standard-v1'
   AND l.job_limit_micros<=1250000 AND l.monthly_limit_micros<=1250000
   AND NOT EXISTS(SELECT 1 FROM customer_markets mk WHERE mk.tenant_id=NEW.tenant_id AND mk.property_id=NEW.property_id AND mk.data_mode='synthetic')
 ) THEN RAISE(ABORT,'OPENAI_PILOT_POLICY_OR_ACCESS_DENIED') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_pilot_policies pol WHERE pol.tenant_id=NEW.tenant_id AND pol.property_id=NEW.property_id AND pol.id=NEW.policy_id AND json_array_length(pol.allowed_domains_json,'$.domains.corporate')>0) THEN RAISE(ABORT,'OPENAI_SOURCE_GRANTS_MISSING') END;
END;
DROP TRIGGER customer_openai_pilot_job_update_guard;
CREATE TRIGGER customer_openai_pilot_job_update_guard BEFORE UPDATE ON customer_openai_pilot_jobs
BEGIN
 SELECT CASE WHEN NEW.tenant_id!=OLD.tenant_id OR NEW.property_id!=OLD.property_id OR NEW.id!=OLD.id OR NEW.policy_id!=OLD.policy_id OR NEW.request_key!=OLD.request_key OR NEW.actor!=OLD.actor OR NEW.session_hash!=OLD.session_hash OR NEW.created_at!=OLD.created_at THEN RAISE(ABORT,'OPENAI_PILOT_JOB_IMMUTABLE') END;
 SELECT CASE WHEN OLD.state NOT IN('queued','running') OR NEW.state NOT IN('queued','running','complete','partial','blocked','failed') THEN RAISE(ABORT,'OPENAI_PILOT_JOB_STATE_INVALID') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_policies pol JOIN customer_sessions s ON s.token_hash=OLD.session_hash
  JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id)
  JOIN customer_expansion_config e USING(tenant_id,property_id)
  WHERE pol.tenant_id=OLD.tenant_id AND pol.property_id=OLD.property_id AND pol.id=OLD.policy_id AND pol.expires_at>NEW.updated_at
   AND s.expires_at>NEW.updated_at AND m.active=1 AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000) AND p.active=1
   AND json_extract(e.document_json,'$.paused') IS NOT 1
 ) THEN RAISE(ABORT,'OPENAI_PILOT_ACCESS_OR_EXPIRY') END;
END;
DROP TRIGGER customer_openai_pilot_draft_insert_guard;
CREATE TRIGGER customer_openai_pilot_draft_insert_guard BEFORE INSERT ON customer_openai_pilot_drafts
BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash
  JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id)
  WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id
   AND j.state='running' AND j.step<5 AND j.lease=NEW.lease AND NEW.category=json_extract('["corporate","project","event","competitor","property"]','$['||j.step||']') AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000
   AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.user_id=j.actor AND m.active=1 AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000) AND p.active=1
 ) THEN RAISE(ABORT,'OPENAI_PILOT_DRAFT_ACCESS_DENIED') END;
END;
DROP TRIGGER customer_openai_pilot_briefing_guard;
CREATE TRIGGER customer_openai_pilot_briefing_guard BEFORE INSERT ON customer_openai_pilot_briefings
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_pilot_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash JOIN customer_memberships m USING(tenant_id,property_id,user_id) WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running' AND j.step=4 AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000)) THEN RAISE(ABORT,'OPENAI_BRIEFING_NOT_READY') END;
END;
