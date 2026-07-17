-- Versand-Dienstleister für Sendungsverfolgung (E-Mail-Platzhalter {{versand_dienstleister}})

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS versand_dienstleister VARCHAR(20);

ALTER TABLE quote_fulfillment_events
  ADD COLUMN IF NOT EXISTS versand_dienstleister VARCHAR(20);
