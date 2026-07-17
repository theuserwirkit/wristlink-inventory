#!/usr/bin/env node
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { Pool } from "@neondatabase/serverless"

const __dirname = dirname(fileURLToPath(import.meta.url))

function getDatabaseUrl() {
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
}

async function main() {
  const url = getDatabaseUrl()
  if (!url) {
    console.error("Keine DB-URL gesetzt (NEON_DATABASE_URL / DATABASE_URL / POSTGRES_URL)")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url })
  const filePath = join(__dirname, "migration", "02-performance-indexes.sql")
  console.log(`→ ${filePath}`)
  await pool.query(readFileSync(filePath, "utf8"))
  await pool.end()
  console.log("Performance-Indizes angewendet.")
}

main().catch((err) => {
  console.error("Migration fehlgeschlagen:", err.message)
  process.exit(1)
})
