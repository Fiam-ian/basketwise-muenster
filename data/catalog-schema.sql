PRAGMA foreign_keys = ON;
CREATE TABLE reports (
  sha256 TEXT PRIMARY KEY, retrieved_at TEXT NOT NULL,
  attribution TEXT NOT NULL, licence TEXT NOT NULL,
  inventory_complete INTEGER NOT NULL DEFAULT 0 CHECK(inventory_complete = 0)
);
CREATE TABLE products (id TEXT PRIMARY KEY, provider TEXT NOT NULL, product_code TEXT);
CREATE TABLE locations (id INTEGER PRIMARY KEY, branch_reviewed INTEGER NOT NULL DEFAULT 0 CHECK(branch_reviewed = 0));
-- Metadata snapshots are report-bound: imports never overwrite older labels.
CREATE TABLE product_snapshots (
  report_sha256 TEXT REFERENCES reports(sha256), record_id TEXT,
  product_id TEXT REFERENCES products(id), draft_json TEXT NOT NULL,
  PRIMARY KEY(report_sha256, record_id)
);
-- Values are retained source decimals, NOT reviewed checkout prices.
CREATE TABLE observations (
  report_sha256 TEXT REFERENCES reports(sha256), record_id TEXT,
  product_id TEXT REFERENCES products(id), location_id INTEGER REFERENCES locations(id),
  observed_on TEXT, retrieved_at TEXT NOT NULL, source_url TEXT NOT NULL,
  price_decimal TEXT, currency TEXT, price_per TEXT,
  discounted INTEGER, discount_type TEXT,
  evidence_reviewed INTEGER NOT NULL DEFAULT 0 CHECK(evidence_reviewed = 0),
  PRIMARY KEY(report_sha256, record_id)
);
