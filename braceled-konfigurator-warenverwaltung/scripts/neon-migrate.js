import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

async function migrate() {
  console.log('Starting Neon migration...');
  console.log('Database URL exists:', !!process.env.NEON_DATABASE_URL);

  // Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created groups table');

  await sql`
    CREATE TABLE IF NOT EXISTS batches (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      features TEXT DEFAULT '',
      delivery_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created batches table');

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created customers table');

  await sql`
    CREATE TABLE IF NOT EXISTS skus (
      id SERIAL PRIMARY KEY,
      sku VARCHAR(100) NOT NULL UNIQUE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created skus table');

  await sql`
    CREATE TABLE IF NOT EXISTS inventory_lots (
      id SERIAL PRIMARY KEY,
      batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created inventory_lots table');

  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      booking_type VARCHAR(50) NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      batch_id INTEGER REFERENCES batches(id),
      notes TEXT,
      ausgabe_datum DATE,
      rueckgabe_datum DATE,
      reference_rental_id INTEGER REFERENCES bookings(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created bookings table');

  await sql`
    CREATE TABLE IF NOT EXISTS booking_items (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id),
      batch_id INTEGER REFERENCES batches(id),
      anzahl INTEGER NOT NULL DEFAULT 0,
      anzahl_fehlt INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('Created booking_items table');

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON booking_items(booking_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_booking_items_group_id ON booking_items(group_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_booking_items_batch_id ON booking_items(batch_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bookings_batch_id ON bookings(batch_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_inventory_lots_batch_id ON inventory_lots(batch_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_inventory_lots_group_id ON inventory_lots(group_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_skus_batch_id ON skus(batch_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_skus_group_id ON skus(group_id)`;
  console.log('Created indexes');

  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
