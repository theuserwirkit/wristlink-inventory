-- Fulfillment: interne Notizen; {{kommentar}} aus Templates entfernen (wird automatisch eingefügt)

ALTER TABLE quote_fulfillment_events
  ADD COLUMN IF NOT EXISTS internal_note TEXT;

UPDATE email_templates SET
  body = REPLACE(body, E'\n\n{{kommentar}}\n', E'\n'),
  updated_at = NOW()
WHERE template_key LIKE 'fulfillment_%'
  AND body LIKE '%{{kommentar}}%';

UPDATE email_templates SET
  body = REPLACE(body, '{{kommentar}}', ''),
  updated_at = NOW()
WHERE template_key LIKE 'fulfillment_%'
  AND body LIKE '%{{kommentar}}%';
