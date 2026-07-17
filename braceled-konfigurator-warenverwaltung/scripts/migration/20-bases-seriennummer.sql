-- Eindeutige Seriennummer je physischem Basis-Gerät (physisch aufgedruckt)
ALTER TABLE bases ADD COLUMN IF NOT EXISTS seriennummer VARCHAR(64);

UPDATE bases
SET seriennummer = 'WL-BASE-' || LPAD(id::text, 5, '0')
WHERE seriennummer IS NULL OR TRIM(seriennummer) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_bases_seriennummer
  ON bases(seriennummer)
  WHERE seriennummer IS NOT NULL;
