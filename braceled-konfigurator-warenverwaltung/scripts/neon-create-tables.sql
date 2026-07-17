-- Create tables for Neon database

CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  funktionsumfang TEXT,
  lieferant VARCHAR(255),
  lieferdatum TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefon VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skus (
  id SERIAL PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL DEFAULT 'LED_BAND',
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_lots (
  id SERIAL PRIMARY KEY,
  sku_id INTEGER REFERENCES skus(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  menge INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS booking_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sku_id INTEGER REFERENCES skus(id) ON DELETE SET NULL,
  lot_id INTEGER REFERENCES inventory_lots(id) ON DELETE SET NULL,
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  anzahl INTEGER NOT NULL DEFAULT 0,
  anzahl_fehlt INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_items_group_id ON booking_items(group_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_batch_id ON booking_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference_rental_id ON bookings(reference_rental_id);
CREATE INDEX IF NOT EXISTS idx_skus_group_id ON skus(group_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_sku_id ON inventory_lots(sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_batch_id ON inventory_lots(batch_id);
