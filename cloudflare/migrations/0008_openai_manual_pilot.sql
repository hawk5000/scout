-- One explicitly authorized, manually advanced OpenAI pilot per property.
-- Additive DDL only: no customer data, credentials, grants, budgets, or jobs seeded.
CREATE TABLE customer_openai_pilot_policies (
 tenant_id TEXT NOT NULL,
 property_id TEXT NOT NULL,
 id TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 total_micros INTEGER NOT NULL CHECK(total_micros=1250000),
 max_categories INTEGER NOT NULL CHECK(max_categories=5),
 allowed_domains_json TEXT NOT NULL CHECK(json_valid(allowed_domains_json)),
 retention_policy TEXT NOT NULL CHECK(length(trim(retention_policy)) BETWEEN 1 AND 500),
 approved_by TEXT NOT NULL,
 approved_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,id),
 UNIQUE(tenant_id,property_id),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_properties(tenant_id,property_id)
);

CREATE TABLE customer_openai_pilot_jobs (
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
CREATE UNIQUE INDEX customer_openai_pilot_active ON customer_openai_pilot_jobs(tenant_id,property_id) WHERE state IN('queued','running');

CREATE TABLE customer_openai_pilot_drafts (
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
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_openai_pilot_jobs(tenant_id,property_id,id)
);

CREATE TABLE customer_openai_pilot_briefings (
 tenant_id TEXT NOT NULL,
 property_id TEXT NOT NULL,
 job_id TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version=1),
 created_at TEXT NOT NULL,
 document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,job_id,version),
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_openai_pilot_jobs(tenant_id,property_id,id)
);

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
   AND s.expires_at>NEW.created_at AND m.active=1 AND m.role='admin' AND p.active=1
   AND json_extract(e.document_json,'$.paused') IS NOT 1
   AND l.rate_version='2026-10-21-standard-v1'
   AND l.job_limit_micros<=1250000 AND l.monthly_limit_micros<=1250000
   AND NOT EXISTS(SELECT 1 FROM customer_markets mk WHERE mk.tenant_id=NEW.tenant_id AND mk.property_id=NEW.property_id AND mk.data_mode='synthetic')
 ) THEN RAISE(ABORT,'OPENAI_PILOT_POLICY_OR_ACCESS_DENIED') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_pilot_policies pol WHERE pol.tenant_id=NEW.tenant_id AND pol.property_id=NEW.property_id AND pol.id=NEW.policy_id AND json_array_length(pol.allowed_domains_json,'$.domains.corporate')>0) THEN RAISE(ABORT,'OPENAI_SOURCE_GRANTS_MISSING') END;
END;
CREATE TRIGGER customer_openai_pilot_policy_immutable_update BEFORE UPDATE ON customer_openai_pilot_policies BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_POLICY_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_pilot_policy_immutable_delete BEFORE DELETE ON customer_openai_pilot_policies BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_POLICY_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_pilot_policy_guard BEFORE INSERT ON customer_openai_pilot_policies
BEGIN
 SELECT CASE WHEN NEW.tenant_id GLOB 'fixture_*' OR NEW.property_id GLOB 'fixture_*' OR NEW.tenant_id=NEW.property_id THEN RAISE(ABORT,'OPENAI_REAL_SCOPE_REQUIRED') END;
 SELECT CASE WHEN NEW.expires_at<=CAST(strftime('%s','now') AS INTEGER)*1000 OR NEW.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000+604800000 THEN RAISE(ABORT,'OPENAI_PILOT_EXPIRY_INVALID') END;
 SELECT CASE WHEN COALESCE(json_array_length(NEW.allowed_domains_json,'$.domains.corporate'),0)<1 OR COALESCE(json_array_length(NEW.allowed_domains_json,'$.domains.project'),0)<1 OR COALESCE(json_array_length(NEW.allowed_domains_json,'$.domains.event'),0)<1 OR COALESCE(json_array_length(NEW.allowed_domains_json,'$.domains.competitor'),0)<1 OR COALESCE(json_array_length(NEW.allowed_domains_json,'$.domains.property'),0)<1 THEN RAISE(ABORT,'OPENAI_SOURCE_GRANTS_INCOMPLETE') END;
END;

CREATE TRIGGER customer_openai_pilot_job_update_guard BEFORE UPDATE ON customer_openai_pilot_jobs
BEGIN
 SELECT CASE WHEN NEW.tenant_id!=OLD.tenant_id OR NEW.property_id!=OLD.property_id OR NEW.id!=OLD.id OR NEW.policy_id!=OLD.policy_id OR NEW.request_key!=OLD.request_key OR NEW.actor!=OLD.actor OR NEW.session_hash!=OLD.session_hash OR NEW.created_at!=OLD.created_at THEN RAISE(ABORT,'OPENAI_PILOT_JOB_IMMUTABLE') END;
 SELECT CASE WHEN OLD.state NOT IN('queued','running') OR NEW.state NOT IN('queued','running','complete','partial','blocked','failed') THEN RAISE(ABORT,'OPENAI_PILOT_JOB_STATE_INVALID') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_policies pol JOIN customer_sessions s ON s.token_hash=OLD.session_hash
  JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id)
  JOIN customer_expansion_config e USING(tenant_id,property_id)
  WHERE pol.tenant_id=OLD.tenant_id AND pol.property_id=OLD.property_id AND pol.id=OLD.policy_id AND pol.expires_at>NEW.updated_at
   AND s.expires_at>NEW.updated_at AND m.active=1 AND m.role='admin' AND p.active=1
   AND json_extract(e.document_json,'$.paused') IS NOT 1
 ) THEN RAISE(ABORT,'OPENAI_PILOT_ACCESS_OR_EXPIRY') END;
END;

CREATE TRIGGER customer_openai_pilot_draft_insert_guard BEFORE INSERT ON customer_openai_pilot_drafts
BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash
  JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id)
  WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id
   AND j.state='running' AND j.step<5 AND j.lease=NEW.lease AND NEW.category=json_extract('["corporate","project","event","competitor","property"]','$['||j.step||']') AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000
   AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.user_id=j.actor AND m.active=1 AND m.role='admin' AND p.active=1
 ) THEN RAISE(ABORT,'OPENAI_PILOT_DRAFT_ACCESS_DENIED') END;
END;
CREATE TRIGGER customer_openai_pilot_draft_no_update BEFORE UPDATE ON customer_openai_pilot_drafts BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_DRAFT_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_pilot_draft_no_delete BEFORE DELETE ON customer_openai_pilot_drafts BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_DRAFT_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_pilot_briefing_guard BEFORE INSERT ON customer_openai_pilot_briefings
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_pilot_jobs j JOIN customer_sessions s ON s.token_hash=j.session_hash JOIN customer_memberships m USING(tenant_id,property_id,user_id) WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running' AND j.step=4 AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND m.role='admin') THEN RAISE(ABORT,'OPENAI_BRIEFING_NOT_READY') END;
END;
CREATE TRIGGER customer_openai_pilot_briefing_no_update BEFORE UPDATE ON customer_openai_pilot_briefings BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_BRIEFING_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_pilot_briefing_no_delete BEFORE DELETE ON customer_openai_pilot_briefings BEGIN SELECT RAISE(ABORT,'OPENAI_PILOT_BRIEFING_IMMUTABLE'); END;

CREATE TRIGGER customer_openai_pilot_call_guard BEFORE INSERT ON customer_provider_calls
WHEN EXISTS(SELECT 1 FROM customer_openai_pilot_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id)
BEGIN
 SELECT CASE WHEN NEW.maximum_micros>221500 OR (SELECT count(*) FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.job_id=NEW.job_id)>=5 THEN RAISE(ABORT,'OPENAI_PILOT_CALL_LIMIT') END;
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM customer_openai_pilot_jobs j JOIN customer_openai_pilot_policies pol ON pol.tenant_id=j.tenant_id AND pol.property_id=j.property_id AND pol.id=j.policy_id
  WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running'
   AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND pol.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000
   AND (SELECT COALESCE(sum(c.accounted_micros),0) FROM customer_provider_calls c JOIN customer_openai_pilot_jobs x ON x.tenant_id=c.tenant_id AND x.property_id=c.property_id AND x.id=c.job_id WHERE x.tenant_id=pol.tenant_id AND x.property_id=pol.property_id AND x.policy_id=pol.id)+NEW.maximum_micros<=pol.total_micros
 ) THEN RAISE(ABORT,'OPENAI_PILOT_BUDGET_OR_LEASE') END;
END;
