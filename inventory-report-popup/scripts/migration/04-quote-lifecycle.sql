-- Anfragen-Lebenszyklus: Buchungsverknüpfung, Quelle, Ablauf

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'konfigurator',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_ref TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_quote_requests_booking ON quote_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_source ON quote_requests(source);
