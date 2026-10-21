-- Immutable operator review queue. No enrollment or existing customer changes.
CREATE TABLE customer_import_reviews (
 tenant_id TEXT NOT NULL, property_id TEXT NOT NULL, review_id TEXT NOT NULL,
 payload_hash TEXT NOT NULL, approval_hash TEXT NOT NULL,
 expected_revision INTEGER NOT NULL, payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 document_json TEXT NOT NULL CHECK(json_valid(document_json)),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 submitted_by TEXT NOT NULL, submitted_at TEXT NOT NULL,
 decided_by TEXT, decided_at TEXT, decision_note TEXT,
 PRIMARY KEY(tenant_id,property_id,review_id),
 FOREIGN KEY(tenant_id,property_id) REFERENCES customer_markets(tenant_id,property_id) ON DELETE CASCADE
);
CREATE TRIGGER customer_review_immutable BEFORE UPDATE ON customer_import_reviews
WHEN OLD.status!='pending' OR NEW.status NOT IN ('approved','rejected')
 OR NEW.tenant_id!=OLD.tenant_id OR NEW.property_id!=OLD.property_id OR NEW.review_id!=OLD.review_id
 OR NEW.payload_hash!=OLD.payload_hash OR NEW.approval_hash!=OLD.approval_hash
 OR NEW.expected_revision!=OLD.expected_revision OR NEW.payload_json!=OLD.payload_json
 OR NEW.document_json!=OLD.document_json OR NEW.submitted_by!=OLD.submitted_by OR NEW.submitted_at!=OLD.submitted_at
BEGIN SELECT RAISE(ABORT,'review_is_immutable'); END;
CREATE TRIGGER customer_review_staged AFTER INSERT ON customer_import_reviews BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at)
 VALUES(NEW.tenant_id,NEW.property_id,NEW.submitted_by,'import_staged',NEW.expected_revision,NEW.submitted_at);
END;
CREATE TRIGGER customer_review_approved AFTER UPDATE OF status ON customer_import_reviews WHEN NEW.status='approved' BEGIN
 INSERT INTO customer_ingestion_batches(tenant_id,property_id,batch_key,payload_hash,expected_revision,actor,at,document_json)
 VALUES(NEW.tenant_id,NEW.property_id,NEW.review_id,NEW.payload_hash,NEW.expected_revision,NEW.decided_by,NEW.decided_at,NEW.document_json);
END;
CREATE TRIGGER customer_review_decided AFTER UPDATE OF status ON customer_import_reviews BEGIN
 INSERT INTO customer_audit(tenant_id,property_id,actor,action,revision,at)
 VALUES(NEW.tenant_id,NEW.property_id,NEW.decided_by,'import_'||NEW.status,NEW.expected_revision,NEW.decided_at);
END;
CREATE TRIGGER customer_review_capacity BEFORE INSERT ON customer_import_reviews
WHEN (SELECT COUNT(*) FROM customer_import_reviews WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id)>=100
BEGIN SELECT RAISE(ABORT,'review_retention_limit'); END;
