-- sevDesk-Angebot pro Anfrage (API-Erstellung)

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS sevdesk_order_id VARCHAR(32),
  ADD COLUMN IF NOT EXISTS sevdesk_order_number VARCHAR(64);
