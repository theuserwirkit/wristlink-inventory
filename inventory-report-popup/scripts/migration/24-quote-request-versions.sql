CREATE TABLE IF NOT EXISTS quote_request_versions (
  id SERIAL PRIMARY KEY,
  quote_request_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  config_json JSONB NOT NULL,
  price_snapshot_json JSONB NOT NULL,
  availability_level TEXT NOT NULL CHECK (availability_level IN ('green', 'yellow', 'red')),
  availability_label TEXT,
  changed_by TEXT NOT NULL CHECK (changed_by IN ('customer', 'admin', 'system')),
  change_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quote_request_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quote_request_versions_quote
  ON quote_request_versions (quote_request_id, version_number DESC);
