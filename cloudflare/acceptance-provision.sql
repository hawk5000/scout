CREATE TABLE IF NOT EXISTS acceptance_marker(name TEXT PRIMARY KEY);
INSERT OR IGNORE INTO acceptance_marker VALUES('synthetic-only');
INSERT OR IGNORE INTO customer_properties(tenant_id,property_id,property_name) VALUES
('fixture_tenant','fixture_hotel','Fictional hosted acceptance hotel'),
('fixture_tenant','fixture_neighbor','Fictional neighbor hotel'),
('fixture_other_tenant','fixture_other_hotel','Fictional other tenant hotel');
INSERT OR IGNORE INTO customer_memberships(tenant_id,property_id,user_id,role) VALUES
('fixture_tenant','fixture_hotel','fixture_user','editor'),
('fixture_tenant','fixture_neighbor','fixture_neighbor_user','editor'),
('fixture_other_tenant','fixture_other_hotel','fixture_other_user','editor'),
('fixture_tenant','fixture_hotel','fixture_viewer','viewer');
INSERT OR IGNORE INTO customer_markets(tenant_id,property_id,data_mode) VALUES('fixture_tenant','fixture_hotel','synthetic');
