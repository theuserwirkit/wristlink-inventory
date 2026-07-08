import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL)

async function main() {
  console.log("Adding batch_id column to bases table...")

  // Add batch_id to bases (nullable for existing records)
  await sql`
    ALTER TABLE bases
    ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL
  `

  console.log("Done: batch_id column added to bases table")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
