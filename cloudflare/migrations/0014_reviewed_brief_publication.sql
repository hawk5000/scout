-- Reviewed publication is separate from fixture refresh jobs; no existing records change.
CREATE TABLE customer_reviewed_briefings (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, id TEXT NOT NULL,
 job_id TEXT NOT NULL, version INTEGER NOT NULL, created_at TEXT NOT NULL,
 document_json TEXT NOT NULL CHECK(json_valid(document_json)), actor TEXT NOT NULL,
 PRIMARY KEY(tenant_id,property_id,id), UNIQUE(tenant_id,property_id,job_id), UNIQUE(tenant_id,property_id,version),
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_import_reviews(tenant_id,property_id,review_id)
);
CREATE VIEW customer_all_briefings AS
 SELECT tenant_id,property_id,id,job_id,version,created_at,document_json FROM customer_briefings
 UNION ALL SELECT tenant_id,property_id,id,job_id,version,created_at,document_json FROM customer_reviewed_briefings;
CREATE TRIGGER reviewed_brief_guard BEFORE INSERT ON customer_reviewed_briefings BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_import_reviews r JOIN customer_markets m USING(tenant_id,property_id) JOIN customer_properties p USING(tenant_id,property_id) WHERE r.tenant_id=NEW.tenant_id AND r.property_id=NEW.property_id AND r.review_id=NEW.job_id AND r.status='approved' AND m.data_mode='reviewed' AND p.active=1) THEN RAISE(ABORT,'approved_review_required') END;
 SELECT CASE WHEN json_extract(NEW.document_json,'$.mode')!='reviewed' OR json_extract(NEW.document_json,'$.id')!=NEW.id OR json_extract(NEW.document_json,'$.jobId')!=NEW.job_id OR json_extract(NEW.document_json,'$.version')!=NEW.version OR json_array_length(NEW.document_json,'$.records')=0 THEN RAISE(ABORT,'reviewed_brief_invalid') END;
 SELECT CASE WHEN NEW.version!=(SELECT COALESCE(MAX(version),0)+1 FROM customer_all_briefings WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id) THEN RAISE(ABORT,'brief_version_conflict') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.document_json,'$.records') f WHERE NOT EXISTS(SELECT 1 FROM customer_import_reviews r,json_each(r.document_json,'$.records') original WHERE r.tenant_id=NEW.tenant_id AND r.property_id=NEW.property_id AND r.review_id=NEW.job_id AND json_extract(original.value,'$.id')=json_extract(f.value,'$.id') AND json_remove(f.value,'$.assessment')=json(original.value))) THEN RAISE(ABORT,'unapproved_brief_finding') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.document_json,'$.sections') s,json_each(s.value,'$.items') i WHERE NOT EXISTS(SELECT 1 FROM json_each(NEW.document_json,'$.records') f WHERE json_extract(f.value,'$.id')=json_extract(i.value,'$.findingId'))) THEN RAISE(ABORT,'brief_reference_invalid') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.document_json,'$.sections') s,json_each(s.value,'$.items') i,json_each(i.value,'$.evidenceIds') e WHERE NOT EXISTS(SELECT 1 FROM json_each(NEW.document_json,'$.records') f,json_each(f.value,'$.evidence') fe WHERE json_extract(f.value,'$.id')=json_extract(i.value,'$.findingId') AND json_extract(fe.value,'$.id')=e.value)) THEN RAISE(ABORT,'brief_evidence_invalid') END;
END;
CREATE TRIGGER reviewed_brief_immutable BEFORE UPDATE ON customer_reviewed_briefings BEGIN SELECT RAISE(ABORT,'immutable_brief'); END;
CREATE TRIGGER reviewed_brief_no_delete BEFORE DELETE ON customer_reviewed_briefings BEGIN SELECT RAISE(ABORT,'immutable_brief'); END;
CREATE TRIGGER reviewed_brief_audit AFTER INSERT ON customer_reviewed_briefings BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at) VALUES(NEW.tenant_id,NEW.property_id,NEW.actor,'reviewed_brief_published',NEW.version,NEW.created_at);
END;
