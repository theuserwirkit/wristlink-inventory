-- 25-quote-version-offer-pdf.sql
ALTER TABLE quote_request_versions
  ADD COLUMN IF NOT EXISTS offer_pdf_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS offer_pdf_data BYTEA,
  ADD COLUMN IF NOT EXISTS offer_pdf_mime_type VARCHAR(100);
