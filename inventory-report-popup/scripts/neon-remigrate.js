import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

async function migrate() {
  console.log('Dropping and recreating tables with correct column names...');

  // Drop all tables in correct order (respecting foreign keys)
  await sql`DROP TABLE IF EXISTS booking_items CASCADE`;
  await sql`DROP TABLE IF EXISTS bookings CASCADE`;
  await sql`DROP TABLE IF EXISTS inventory_lots CASCADE`;
  await sql`DROP TABLE IF EXISTS skus CASCADE`;
  await sql`DROP TABLE IF EXISTS customers CASCADE`;
  await sql`DROP TABLE IF EXISTS batches CASCADE`;
  await sql`DROP TABLE IF EXISTS groups CASCADE`;
  console.log('Dropped all tables');

  // Recreate with correct column names matching the app code
  await sql`
    CREATE TABLE groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created groups');

  await sql`
    CREATE TABLE batches (
      id SERIAL PRIMARY KEY,
      code VARCHAR(100) NOT NULL,
      funktionsumfang TEXT DEFAULT '',
      lieferant VARCHAR(255),
      lieferdatum TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created batches');

  await sql`
    CREATE TABLE customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      telefon VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created customers');

  await sql`
    CREATE TABLE skus (
      id SERIAL PRIMARY KEY,
      item_type VARCHAR(50) NOT NULL DEFAULT 'LED_BAND',
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created skus');

  await sql`
    CREATE TABLE inventory_lots (
      id SERIAL PRIMARY KEY,
      sku_id INTEGER REFERENCES skus(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      menge INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created inventory_lots');

  await sql`
    CREATE TABLE bookings (
      id SERIAL PRIMARY KEY,
      booking_type VARCHAR(50) NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      batch_id INTEGER REFERENCES batches(id),
      datum_ausgabe TIMESTAMPTZ,
      datum_rueckgabe_geplant TIMESTAMPTZ,
      datum_rueckgabe_ist TIMESTAMPTZ,
      reference_rental_id INTEGER REFERENCES bookings(id),
      bemerkung TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created bookings');

  await sql`
    CREATE TABLE booking_items (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id),
      sku_id INTEGER REFERENCES skus(id),
      lot_id INTEGER REFERENCES inventory_lots(id),
      batch_id INTEGER REFERENCES batches(id),
      anzahl INTEGER NOT NULL DEFAULT 0,
      anzahl_fehlt INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created booking_items');

  // Create indexes
  await sql`CREATE INDEX idx_booking_items_booking_id ON booking_items(booking_id)`;
  await sql`CREATE INDEX idx_booking_items_group_id ON booking_items(group_id)`;
  await sql`CREATE INDEX idx_booking_items_batch_id ON booking_items(batch_id)`;
  await sql`CREATE INDEX idx_bookings_booking_type ON bookings(booking_type)`;
  await sql`CREATE INDEX idx_bookings_batch_id ON bookings(batch_id)`;
  await sql`CREATE INDEX idx_bookings_customer_id ON bookings(customer_id)`;
  await sql`CREATE INDEX idx_inventory_lots_batch_id ON inventory_lots(batch_id)`;
  await sql`CREATE INDEX idx_inventory_lots_sku_id ON inventory_lots(sku_id)`;
  await sql`CREATE INDEX idx_skus_group_id ON skus(group_id)`;
  console.log('Created indexes');

  // Also recreate the users table for auth
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'VIEWER',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created users table');

  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
