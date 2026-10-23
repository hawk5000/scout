-- Bounded owner-authorized retry; original attempts and customer records stay immutable.
CREATE TABLE customer_openai_retry_approvals (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, policy_id TEXT NOT NULL, original_job_id TEXT NOT NULL,
 approval_note TEXT NOT NULL CHECK(length(approval_note)>0), approved_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,policy_id),
 FOREIGN KEY(tenant_id,property_id,original_job_id) REFERENCES customer_openai_pilot_jobs(tenant_id,property_id,id)
);
CREATE TRIGGER customer_openai_retry_approval_guard BEFORE INSERT ON customer_openai_retry_approvals BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.original_job_id AND j.policy_id=NEW.policy_id AND j.step=5 AND j.state IN('blocked','partial','failed')) THEN RAISE(ABORT,'RETRY_ORIGINAL_NOT_FINAL') END;
END;
CREATE TRIGGER customer_openai_retry_approval_no_update BEFORE UPDATE ON customer_openai_retry_approvals BEGIN SELECT RAISE(ABORT,'RETRY_APPROVAL_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_retry_approval_no_delete BEFORE DELETE ON customer_openai_retry_approvals BEGIN SELECT RAISE(ABORT,'RETRY_APPROVAL_IMMUTABLE'); END;
CREATE TABLE customer_openai_retry_jobs (
 tenant_id TEXT NOT NULL,
 property_id TEXT NOT NULL,
 id TEXT NOT NULL,
 policy_id TEXT NOT NULL,
 request_key TEXT NOT NULL,
 actor TEXT NOT NULL,
 session_hash TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('queued','running','complete','partial','blocked','failed')),
 step INTEGER NOT NULL DEFAULT 0 CHECK(step BETWEEN 0 AND 5),
 lease TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 document_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,id),
 UNIQUE(tenant_id,property_id,request_key),
 UNIQUE(tenant_id,property_id,policy_id),
 FOREIGN KEY(tenant_id,property_id,policy_id) REFERENCES customer_openai_pilot_policies(tenant_id,property_id,id)
);
CREATE TABLE customer_openai_retry_drafts (
 tenant_id TEXT NOT NULL,
 property_id TEXT NOT NULL,
 job_id TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN('corporate','project','event','competitor','property')),
 outcome TEXT NOT NULL CHECK(outcome IN('cited','uncited','no_sources','failed')),
 summary TEXT NOT NULL DEFAULT '' CHECK(length(summary)<=24000),
 sources_json TEXT NOT NULL CHECK(json_valid(sources_json)),
 citations_json TEXT NOT NULL CHECK(json_valid(citations_json)),
 usage_json TEXT CHECK(usage_json IS NULL OR json_valid(usage_json)),
 observed_at TEXT NOT NULL,
 identity_note TEXT NOT NULL,
 lease TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,job_id,category),
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_openai_retry_jobs(tenant_id,property_id,id)
);
CREATE TABLE customer_openai_retry_briefings (
 tenant_id TEXT NOT NULL,
 property_id TEXT NOT NULL,
 job_id TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version=2),
 created_at TEXT NOT NULL,
 document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,job_id,version),
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_openai_retry_jobs(tenant_id,property_id,id)
);
CREATE TRIGGER customer_openai_retry_job_guard BEFORE INSERT ON customer_openai_retry_jobs
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
CREATE TRIGGER customer_openai_retry_job_update_guard BEFORE UPDATE ON customer_openai_retry_jobs
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
CREATE TRIGGER customer_openai_retry_draft_insert_guard BEFORE INSERT ON customer_openai_retry_drafts
BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_retry_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash
  JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id)
  WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id
   AND j.state='running' AND j.step<5 AND j.lease=NEW.lease AND NEW.category=json_extract('["corporate","project","event","competitor","property"]','$['||j.step||']') AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000
   AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.user_id=j.actor AND m.active=1 AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000) AND p.active=1
 ) THEN RAISE(ABORT,'OPENAI_PILOT_DRAFT_ACCESS_DENIED') END;
END;
CREATE TRIGGER customer_openai_retry_briefing_guard BEFORE INSERT ON customer_openai_retry_briefings
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_retry_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash JOIN customer_memberships m USING(tenant_id,property_id,user_id) WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running' AND j.step=4 AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000)) THEN RAISE(ABORT,'OPENAI_BRIEFING_NOT_READY') END;
END;
CREATE TRIGGER customer_openai_retry_draft_no_update BEFORE UPDATE ON customer_openai_retry_drafts BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_DRAFT_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_retry_draft_no_delete BEFORE DELETE ON customer_openai_retry_drafts BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_DRAFT_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_retry_briefing_no_update BEFORE UPDATE ON customer_openai_retry_briefings BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_BRIEFING_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_retry_briefing_no_delete BEFORE DELETE ON customer_openai_retry_briefings BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_BRIEFING_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_retry_requires_approval BEFORE INSERT ON customer_openai_retry_jobs BEGIN
 SELECT CASE WHEN NEW.step!=0 OR NEW.state!='queued' OR NOT EXISTS(SELECT 1 FROM customer_openai_retry_approvals a JOIN customer_openai_pilot_jobs j ON j.tenant_id=a.tenant_id AND j.property_id=a.property_id AND j.id=a.original_job_id WHERE a.tenant_id=NEW.tenant_id AND a.property_id=NEW.property_id AND a.policy_id=NEW.policy_id AND json_extract(NEW.document_json,'$.configurationHash')=json_extract(j.document_json,'$.configurationHash')) THEN RAISE(ABORT,'RETRY_NOT_APPROVED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.state IN('unknown','reserved') AND NOT EXISTS(SELECT 1 FROM customer_openai_reconciled_call_keys k WHERE k.tenant_id=c.tenant_id AND k.property_id=c.property_id AND k.job_id=c.job_id AND k.call_key=c.call_key)) THEN RAISE(ABORT,'RETRY_UNRECONCILED_USAGE') END;
END;
-- An aggregate receipt is charged once, on its lexically first covered key.
-- This allocation is only budget arithmetic, not an assertion of individual billing.
CREATE VIEW customer_provider_effective_calls AS
 SELECT c.tenant_id,c.property_id,c.month,c.job_id,c.call_key,c.state,
 CASE WHEN r.job_id IS NOT NULL THEN CASE WHEN c.call_key=(SELECT min(value) FROM json_each(r.covered_keys_json)) THEN r.billed_micros ELSE 0 END
 ELSE COALESCE(s.accounted_micros,c.accounted_micros) END AS accounted_micros
 FROM customer_provider_calls c
 LEFT JOIN customer_openai_usage_reconciliations r ON r.tenant_id=c.tenant_id AND r.property_id=c.property_id AND r.job_id=c.job_id AND EXISTS(SELECT 1 FROM json_each(r.covered_keys_json) k WHERE k.value=c.call_key)
 LEFT JOIN customer_openai_usage_call_receipts s ON s.tenant_id=c.tenant_id AND s.property_id=c.property_id AND s.job_id=c.job_id AND s.call_key=c.call_key;
CREATE VIEW customer_openai_all_jobs AS SELECT tenant_id,property_id,id,policy_id FROM customer_openai_pilot_jobs UNION ALL SELECT tenant_id,property_id,id,policy_id FROM customer_openai_retry_jobs;
DROP TRIGGER customer_provider_reserve;
CREATE TRIGGER customer_provider_reserve BEFORE INSERT ON customer_provider_calls BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_provider_limits WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month) THEN RAISE(ABORT,'PROVIDER_POLICY_MISSING') END;
 SELECT CASE WHEN NEW.accounted_micros!=NEW.maximum_micros OR NEW.state!='reserved' THEN RAISE(ABORT,'PROVIDER_RESERVATION_INVALID') END;
 SELECT CASE WHEN (SELECT COALESCE(SUM(accounted_micros),0) FROM customer_provider_effective_calls WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month)+NEW.maximum_micros > (SELECT monthly_limit_micros FROM customer_provider_limits WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month) THEN RAISE(ABORT,'PROVIDER_MONTH_BUDGET') END;
 SELECT CASE WHEN (SELECT COALESCE(SUM(accounted_micros),0) FROM customer_provider_effective_calls WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND job_id=NEW.job_id)+NEW.maximum_micros > (SELECT job_limit_micros FROM customer_provider_limits WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND month=NEW.month) THEN RAISE(ABORT,'PROVIDER_JOB_BUDGET') END;
END;
DROP TRIGGER customer_openai_pilot_call_guard;
CREATE TRIGGER customer_openai_pilot_call_guard BEFORE INSERT ON customer_provider_calls
WHEN EXISTS(SELECT 1 FROM customer_openai_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id)
BEGIN
 SELECT CASE WHEN NEW.maximum_micros>464000 OR (SELECT count(*) FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.job_id=NEW.job_id)>=5 THEN RAISE(ABORT,'OPENAI_PILOT_CALL_LIMIT') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_jobs j JOIN customer_openai_pilot_policies pol ON pol.tenant_id=j.tenant_id AND pol.property_id=j.property_id AND pol.id=j.policy_id
  WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running'
   AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND pol.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000
   AND (SELECT COALESCE(sum(c.accounted_micros),0) FROM customer_provider_effective_calls c JOIN customer_openai_all_jobs x ON x.tenant_id=c.tenant_id AND x.property_id=c.property_id AND x.id=c.job_id WHERE x.tenant_id=pol.tenant_id AND x.property_id=pol.property_id AND x.policy_id=pol.id)+NEW.maximum_micros<=pol.total_micros
 ) THEN RAISE(ABORT,'OPENAI_PILOT_BUDGET_OR_LEASE') END;
END;
CREATE TRIGGER customer_openai_retry_call_guard BEFORE INSERT ON customer_provider_calls
WHEN EXISTS(SELECT 1 FROM customer_openai_retry_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id)
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_retry_jobs j JOIN customer_openai_retry_approvals a USING(tenant_id,property_id,policy_id) JOIN customer_openai_pilot_drafts d ON d.tenant_id=a.tenant_id AND d.property_id=a.property_id AND d.job_id=a.original_job_id WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND d.outcome='failed' AND NEW.call_key=d.category||':search' AND d.category=json_extract('["corporate","project","event","competitor","property"]','$['||j.step||']')) THEN RAISE(ABORT,'RETRY_CATEGORY_NOT_FAILED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.state IN('unknown','reserved') AND NOT EXISTS(SELECT 1 FROM customer_openai_reconciled_call_keys k WHERE k.tenant_id=c.tenant_id AND k.property_id=c.property_id AND k.job_id=c.job_id AND k.call_key=c.call_key)) THEN RAISE(ABORT,'RETRY_UNRECONCILED_USAGE') END;
 SELECT CASE WHEN NEW.maximum_micros>464000 OR (SELECT count(*) FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.job_id=NEW.job_id)>=4 THEN RAISE(ABORT,'OPENAI_PILOT_CALL_LIMIT') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_retry_jobs j JOIN customer_openai_pilot_policies pol ON pol.tenant_id=j.tenant_id AND pol.property_id=j.property_id AND pol.id=j.policy_id
  WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running'
   AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND pol.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000
   AND (SELECT COALESCE(sum(c.accounted_micros),0) FROM customer_provider_effective_calls c JOIN customer_openai_all_jobs x ON x.tenant_id=c.tenant_id AND x.property_id=c.property_id AND x.id=c.job_id WHERE x.tenant_id=pol.tenant_id AND x.property_id=pol.property_id AND x.policy_id=pol.id)+NEW.maximum_micros<=pol.total_micros
 ) THEN RAISE(ABORT,'OPENAI_PILOT_BUDGET_OR_LEASE') END;
END;
