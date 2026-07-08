-- Angebots-PDF pro Anfrage (sevDesk-Export oder manueller Upload)

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS offer_pdf_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS offer_pdf_data BYTEA,
  ADD COLUMN IF NOT EXISTS offer_pdf_mime_type VARCHAR(100);
