-- Stationstyp für Basis/Controller: eco | pro | keine
ALTER TABLE bases ADD COLUMN IF NOT EXISTS station_typ VARCHAR(10) NOT NULL DEFAULT 'keine';

-- Bestehende Einträge anhand Bezeichnung zuordnen
UPDATE bases SET station_typ = 'eco'
WHERE station_typ = 'keine'
  AND (
    LOWER(bezeichnung) LIKE '%eco%'
    OR LOWER(bezeichnung) LIKE '%handcontroller%'
    OR LOWER(bezeichnung) LIKE '%hand-controller%'
  );

UPDATE bases SET station_typ = 'pro'
WHERE station_typ = 'keine'
  AND (
    LOWER(bezeichnung) LIKE '%pro%'
    OR LOWER(bezeichnung) LIKE '%basis%'
    OR LOWER(bezeichnung) LIKE '%basisstation%'
  );
