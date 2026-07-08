import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.NEON_DATABASE_URL)

async function migrate() {
  console.log('Creating bases table...')
  await sql`
    CREATE TABLE IF NOT EXISTS bases (
      id SERIAL PRIMARY KEY,
      bezeichnung TEXT NOT NULL,
      hersteller TEXT NOT NULL DEFAULT '',
      kanalanzahl INTEGER NOT NULL DEFAULT 0,
      firmwareversion TEXT NOT NULL DEFAULT '',
      funktionsumfang TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log('bases table created.')

  console.log('Adding base_id and anzahl_basen to booking_items...')
  
  // Add base_id column
  const colCheck1 = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'booking_items' AND column_name = 'base_id'
  `
  if (colCheck1.length === 0) {
    await sql`ALTER TABLE booking_items ADD COLUMN base_id INTEGER REFERENCES bases(id) ON DELETE SET NULL`
    console.log('base_id column added.')
  } else {
    console.log('base_id column already exists.')
  }

  // Add anzahl_basen column
  const colCheck2 = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'booking_items' AND column_name = 'anzahl_basen'
  `
  if (colCheck2.length === 0) {
    await sql`ALTER TABLE booking_items ADD COLUMN anzahl_basen INTEGER NOT NULL DEFAULT 0`
    console.log('anzahl_basen column added.')
  } else {
    console.log('anzahl_basen column already exists.')
  }

  // Add index on base_id
  await sql`CREATE INDEX IF NOT EXISTS idx_booking_items_base_id ON booking_items(base_id)`
  console.log('Index on base_id created.')

  console.log('Migration complete!')
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
