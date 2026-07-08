-- Create system_settings table for configurable parameters
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default values for Vorlauf and Nachlauf
INSERT INTO system_settings (key, value, description)
VALUES
  ('departure_buffer_days', '6', 'Anzahl Werktage Vorlauf: Artikel verlässt Lager X Werktage vor dem Event-Datum'),
  ('return_buffer_days', '5', 'Anzahl Tage Nachlauf: Artikel wieder verfügbar X Tage nach dem Event-Ende')
ON CONFLICT (key) DO NOTHING;
