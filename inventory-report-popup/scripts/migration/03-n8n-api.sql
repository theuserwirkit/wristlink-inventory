-- n8n-API: Buchungsstatus + Produkt-Mapping in system_settings

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'BESTAETIGT';

INSERT INTO system_settings (key, value, description)
VALUES (
  'product_mapping',
  '{"armband":["armband"],"zauberstab":["zauberstab","stab"],"licht":["licht"]}',
  'Suchmuster für groups.name je n8n-Produktkategorie (armband, zauberstab, licht)'
)
ON CONFLICT (key) DO NOTHING;
