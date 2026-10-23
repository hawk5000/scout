-- Additive blueprint-first workflow. No customer identity, approval or job is seeded.
CREATE TABLE customer_public_identities (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, subject_id TEXT NOT NULL,
 document_json TEXT NOT NULL CHECK(json_valid(document_json)), configuration_hash TEXT NOT NULL,
 actor TEXT NOT NULL, session_hash TEXT NOT NULL, confirmed_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,subject_id),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_properties(tenant_id,property_id)
);
CREATE TRIGGER public_identity_auth BEFORE INSERT ON customer_public_identities BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE s.token_hash=NEW.session_hash AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.user_id=NEW.actor AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND m.role IN('editor','admin') AND p.active=1) THEN RAISE(ABORT,'identity_access_denied') END;
END;
CREATE TRIGGER public_identity_update_auth BEFORE UPDATE ON customer_public_identities BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_sessions s JOIN customer_memberships m USING(tenant_id,property_id,user_id) WHERE s.token_hash=NEW.session_hash AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.user_id=NEW.actor AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND m.role IN('editor','admin')) THEN RAISE(ABORT,'identity_access_denied') END;
END;
CREATE TRIGGER public_identity_audit AFTER INSERT ON customer_public_identities BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'public_identity_confirmed',NEW.confirmed_at);
END;
CREATE TRIGGER public_identity_update_audit AFTER UPDATE ON customer_public_identities BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'public_identity_reconfirmed',NEW.confirmed_at);
END;
CREATE TABLE customer_blueprint_approvals (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, id TEXT NOT NULL, plan_hash TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN('baseline','update')), max_calls INTEGER NOT NULL CHECK(max_calls BETWEEN 1 AND 30),
 run_cap_micros INTEGER NOT NULL CHECK(run_cap_micros BETWEEN 1 AND 1250000),
 cumulative_cap_micros INTEGER NOT NULL CHECK(cumulative_cap_micros BETWEEN 1 AND 1250000),
 expires_at INTEGER NOT NULL, domains_json TEXT NOT NULL CHECK(json_valid(domains_json)),
 approved_by TEXT NOT NULL, approved_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,id),FOREIGN KEY(tenant_id,property_id) REFERENCES customer_properties(tenant_id,property_id)
);
CREATE TRIGGER blueprint_approval_immutable BEFORE UPDATE ON customer_blueprint_approvals BEGIN SELECT RAISE(ABORT,'approval_immutable'); END;
CREATE TRIGGER blueprint_approval_no_delete BEFORE DELETE ON customer_blueprint_approvals BEGIN SELECT RAISE(ABORT,'approval_immutable'); END;
CREATE TABLE customer_blueprint_jobs (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL,id TEXT NOT NULL,approval_id TEXT NOT NULL,
 request_key TEXT NOT NULL,actor TEXT NOT NULL,session_hash TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN('baseline','update')),state TEXT NOT NULL CHECK(state IN('running','complete','partial','blocked','failed','no-change')),
 step INTEGER NOT NULL DEFAULT 0,lease TEXT,lease_until INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,plan_json TEXT NOT NULL CHECK(json_valid(plan_json)),plan_hash TEXT NOT NULL,
 review_id TEXT,brief_json TEXT CHECK(brief_json IS NULL OR json_valid(brief_json)),
 PRIMARY KEY(tenant_id,property_id,id),UNIQUE(tenant_id,property_id,approval_id),UNIQUE(tenant_id,property_id,request_key),
 FOREIGN KEY(tenant_id,property_id,approval_id) REFERENCES customer_blueprint_approvals(tenant_id,property_id,id)
);
CREATE UNIQUE INDEX blueprint_one_active ON customer_blueprint_jobs(tenant_id,property_id) WHERE state='running';
CREATE TRIGGER blueprint_start_guard BEFORE INSERT ON customer_blueprint_jobs BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_blueprint_approvals a JOIN customer_sessions s ON s.token_hash=NEW.session_hash JOIN customer_memberships m USING(tenant_id,property_id,user_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE a.tenant_id=NEW.tenant_id AND a.property_id=NEW.property_id AND a.id=NEW.approval_id AND a.mode=NEW.mode AND a.plan_hash=NEW.plan_hash AND a.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.user_id=NEW.actor AND s.tenant_id=NEW.tenant_id AND s.property_id=NEW.property_id AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND m.active=1 AND p.active=1 AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000)) THEN RAISE(ABORT,'blueprint_approval_or_access_required') END;
END;
CREATE TABLE customer_blueprint_steps (
 tenant_id TEXT NOT NULL,property_id TEXT NOT NULL,job_id TEXT NOT NULL,step INTEGER NOT NULL,
 area TEXT NOT NULL,category TEXT NOT NULL,subject_id TEXT NOT NULL,outcome TEXT NOT NULL,
 checked_at TEXT NOT NULL,document_json TEXT NOT NULL CHECK(json_valid(document_json)),lease TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,job_id,step),FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_blueprint_jobs(tenant_id,property_id,id)
);
CREATE TRIGGER blueprint_step_guard BEFORE INSERT ON customer_blueprint_steps BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_blueprint_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running' AND j.step=NEW.step AND NEW.area=json_extract(j.plan_json,'$.steps['||NEW.step||'].area') AND NEW.category=json_extract(j.plan_json,'$.steps['||NEW.step||'].category') AND NEW.subject_id=json_extract(j.plan_json,'$.steps['||NEW.step||'].subjectId') AND j.lease=NEW.lease AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000) THEN RAISE(ABORT,'blueprint_stale_lease') END;
END;
CREATE TRIGGER blueprint_step_advance AFTER INSERT ON customer_blueprint_steps BEGIN
 UPDATE customer_blueprint_jobs SET step=step+1,lease=NULL,lease_until=0 WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND id=NEW.job_id;
END;
CREATE TRIGGER blueprint_step_immutable BEFORE UPDATE ON customer_blueprint_steps BEGIN SELECT RAISE(ABORT,'step_immutable'); END;
CREATE TRIGGER blueprint_step_no_delete BEFORE DELETE ON customer_blueprint_steps BEGIN SELECT RAISE(ABORT,'step_immutable'); END;
CREATE TRIGGER blueprint_job_immutable BEFORE UPDATE ON customer_blueprint_jobs BEGIN
 SELECT CASE WHEN NEW.plan_json!=OLD.plan_json OR NEW.plan_hash!=OLD.plan_hash OR NEW.approval_id!=OLD.approval_id OR NEW.mode!=OLD.mode OR NEW.tenant_id!=OLD.tenant_id OR NEW.property_id!=OLD.property_id OR NEW.id!=OLD.id OR NEW.actor!=OLD.actor OR NEW.session_hash!=OLD.session_hash OR OLD.state!='running' THEN RAISE(ABORT,'blueprint_job_immutable') END;
END;
CREATE TRIGGER blueprint_provider_guard BEFORE INSERT ON customer_provider_calls WHEN EXISTS(SELECT 1 FROM customer_blueprint_jobs WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND id=NEW.job_id) BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_blueprint_jobs j JOIN customer_blueprint_approvals a ON a.tenant_id=j.tenant_id AND a.property_id=j.property_id AND a.id=j.approval_id JOIN customer_sessions s ON s.token_hash=j.session_hash JOIN customer_memberships m USING(tenant_id,property_id,user_id) WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.state='running' AND j.lease IS NOT NULL AND j.lease_until>CAST(strftime('%s','now') AS INTEGER)*1000 AND a.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.expires_at>CAST(strftime('%s','now') AS INTEGER)*1000 AND s.tenant_id=j.tenant_id AND s.property_id=j.property_id AND s.user_id=j.actor AND m.active=1 AND EXISTS(SELECT 1 FROM customer_properties h WHERE h.tenant_id=j.tenant_id AND h.property_id=j.property_id AND h.active=1) AND EXISTS(SELECT 1 FROM customer_research_authorizations ra WHERE ra.session_hash=s.token_hash AND ra.tenant_id=s.tenant_id AND ra.property_id=s.property_id AND ra.user_id=s.user_id AND ra.valid_until>CAST(strftime('%s','now') AS INTEGER)*1000) AND NEW.call_key='step-'||j.step AND NEW.maximum_micros<=464000 AND (SELECT COUNT(*) FROM customer_provider_calls c WHERE c.tenant_id=j.tenant_id AND c.property_id=j.property_id AND c.job_id=j.id)<a.max_calls AND (SELECT COALESCE(SUM(accounted_micros),0) FROM customer_provider_effective_calls c WHERE c.tenant_id=j.tenant_id AND c.property_id=j.property_id AND c.job_id=j.id)+NEW.maximum_micros<=a.run_cap_micros AND (SELECT COALESCE(SUM(accounted_micros),0) FROM customer_provider_effective_calls c WHERE c.tenant_id=j.tenant_id AND c.property_id=j.property_id)+NEW.maximum_micros<=a.cumulative_cap_micros) THEN RAISE(ABORT,'blueprint_budget_or_access') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM customer_provider_calls c WHERE c.tenant_id=NEW.tenant_id AND c.property_id=NEW.property_id AND c.state IN('reserved','unknown') AND NOT EXISTS(SELECT 1 FROM customer_openai_reconciled_call_keys k WHERE k.tenant_id=c.tenant_id AND k.property_id=c.property_id AND k.job_id=c.job_id AND k.call_key=c.call_key)) THEN RAISE(ABORT,'blueprint_usage_unresolved') END;
END;
