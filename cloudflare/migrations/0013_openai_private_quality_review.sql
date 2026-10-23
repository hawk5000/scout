CREATE TABLE customer_openai_retry_reviews (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, job_id TEXT NOT NULL,
 reviewed_at TEXT NOT NULL, document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 PRIMARY KEY(tenant_id,property_id,job_id),
 FOREIGN KEY(tenant_id,property_id,job_id) REFERENCES customer_openai_retry_jobs(tenant_id,property_id,id)
);
CREATE TRIGGER customer_openai_retry_review_guard BEFORE INSERT ON customer_openai_retry_reviews BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_openai_retry_jobs j WHERE j.tenant_id=NEW.tenant_id AND j.property_id=NEW.property_id AND j.id=NEW.job_id AND j.step=5 AND j.state IN('complete','partial','failed','blocked')) THEN RAISE(ABORT,'REVIEW_RUN_NOT_FINAL') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.document_json,'$.priorities') p WHERE NOT EXISTS(SELECT 1 FROM customer_openai_retry_drafts d JOIN json_each(d.sources_json) s WHERE d.tenant_id=NEW.tenant_id AND d.property_id=NEW.property_id AND d.job_id=NEW.job_id AND json_extract(s.value,'$.url')=json_extract(p.value,'$.sourceUrl'))) THEN RAISE(ABORT,'REVIEW_SOURCE_NOT_IN_RUN') END;
END;
CREATE TRIGGER customer_openai_retry_review_no_update BEFORE UPDATE ON customer_openai_retry_reviews BEGIN SELECT RAISE(ABORT,'REVIEW_IMMUTABLE'); END;
CREATE TRIGGER customer_openai_retry_review_no_delete BEFORE DELETE ON customer_openai_retry_reviews BEGIN SELECT RAISE(ABORT,'REVIEW_IMMUTABLE'); END;
