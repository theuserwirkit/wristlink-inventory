-- ============================================================
-- Wristlink App - Konsolidiertes Datenbankschema
-- Zielsystem: PostgreSQL / Neon
-- Erstellt alle Tabellen, Spalten, Indizes und Default-Settings
-- in einem Rutsch (idempotent, mehrfach ausführbar).
-- ============================================================

-- ---------- Produktgruppen (LED-Bänder) ----------
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  kanalanzahl INTEGER NOT NULL DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Chargen / Lieferungen ----------
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  funktionsumfang TEXT,
  lieferant VARCHAR(255),
  lieferdatum TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Kunden (für Vermietung) ----------
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefon VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Artikel-Stammnummern (SKU) ----------
CREATE TABLE IF NOT EXISTS skus (
  id SERIAL PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL DEFAULT 'LED_BAND',
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Bestandsposten (SKU x Charge) ----------
CREATE TABLE IF NOT EXISTS inventory_lots (
  id SERIAL PRIMARY KEY,
  sku_id INTEGER REFERENCES skus(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  menge INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Basisstationen / Sender ----------
CREATE TABLE IF NOT EXISTS bases (
  id SERIAL PRIMARY KEY,
  bezeichnung TEXT NOT NULL,
  hersteller TEXT NOT NULL DEFAULT '',
  kanalanzahl INTEGER NOT NULL DEFAULT 0,
  firmwareversion TEXT NOT NULL DEFAULT '',
  funktionsumfang TEXT NOT NULL DEFAULT '',
  station_typ VARCHAR(10) NOT NULL DEFAULT 'keine',
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Buchungskopf ----------
-- booking_type: 'ZUGANG' | 'VERKAUF' | 'MIETE_AUSGABE' | 'MIETE_RUECKGABE'
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  booking_type VARCHAR(50) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  datum_ausgabe TIMESTAMPTZ,
  datum_rueckgabe_geplant TIMESTAMPTZ,
  datum_rueckgabe_ist TIMESTAMPTZ,
  reference_rental_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  bemerkung TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Buchungspositionen ----------
CREATE TABLE IF NOT EXISTS booking_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sku_id INTEGER REFERENCES skus(id) ON DELETE SET NULL,
  lot_id INTEGER REFERENCES inventory_lots(id) ON DELETE SET NULL,
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  base_id INTEGER REFERENCES bases(id) ON DELETE SET NULL,
  anzahl INTEGER NOT NULL DEFAULT 0,
  anzahl_fehlt INTEGER DEFAULT 0,
  anzahl_basen INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Systemeinstellungen (Key-Value) ----------
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Indizes ----------
CREATE INDEX IF NOT EXISTS idx_booking_items_group_id ON booking_items(group_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_batch_id ON booking_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_base_id ON booking_items(base_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference_rental_id ON bookings(reference_rental_id);
CREATE INDEX IF NOT EXISTS idx_skus_group_id ON skus(group_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_sku_id ON inventory_lots(sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_batch_id ON inventory_lots(batch_id);

-- ---------- Default-Settings ----------
INSERT INTO system_settings (key, value, description)
VALUES
  ('departure_buffer_days', '6', 'Anzahl Werktage Vorlauf: Artikel verlässt Lager X Werktage vor dem Event-Datum'),
  ('return_buffer_days', '5', 'Anzahl Tage Nachlauf: Artikel wieder verfügbar X Tage nach dem Event-Ende'),
  ('product_mapping', '{"armband":["armband"],"zauberstab":["zauberstab","stab"],"licht":["licht"]}', 'Suchmuster für groups.name je n8n-Produktkategorie')
ON CONFLICT (key) DO NOTHING;

-- Buchungsstatus für n8n-Reservierungen
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'BESTAETIGT';
