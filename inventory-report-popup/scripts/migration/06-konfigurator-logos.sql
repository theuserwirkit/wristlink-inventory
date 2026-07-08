-- Logo-Uploads aus dem Konfigurator (PNG, transparenter Hintergrund)
CREATE TABLE IF NOT EXISTS konfigurator_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'image/png',
  file_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_konfigurator_logos_lead ON konfigurator_logos(lead_id);
