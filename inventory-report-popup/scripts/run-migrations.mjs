#!/usr/bin/env node
/**
 * Führt SQL-Migrationsdateien gegen Neon aus (ohne psql).
 */
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { Pool } from "@neondatabase/serverless"

const __dirname = dirname(fileURLToPath(import.meta.url))

function getDatabaseUrl() {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL
  )
}

async function runFile(pool, filePath) {
  const content = readFileSync(filePath, "utf8")
  console.log(`→ ${filePath}`)
  await pool.query(content)
}

async function main() {
  const url = getDatabaseUrl()
  if (!url) {
    console.error("Keine DB-URL gesetzt (DATABASE_URL / POSTGRES_URL / NEON_DATABASE_URL)")
    process.exit(1)
  }

  const pool = new Pool({ connectionString: url })
  const migrationDir = join(__dirname, "migration")

  try {
    await runFile(pool, join(migrationDir, "01-schema.sql"))
    await runFile(pool, join(migrationDir, "02-konfigurator.sql"))
    await runFile(pool, join(migrationDir, "03-n8n-api.sql"))
    await runFile(pool, join(migrationDir, "04-quote-lifecycle.sql"))
    await runFile(pool, join(migrationDir, "05-lead-contact.sql"))
    await runFile(pool, join(migrationDir, "06-konfigurator-logos.sql"))
    await runFile(pool, join(migrationDir, "07-base-station-typ.sql"))
    await runFile(pool, join(migrationDir, "08-groups-kanalanzahl.sql"))
    await runFile(pool, join(migrationDir, "09-fulfillment-email-templates.sql"))
    await runFile(pool, join(migrationDir, "10-offer-pdf.sql"))
    await runFile(pool, join(migrationDir, "11-lead-consent-doi.sql"))
    await runFile(pool, join(migrationDir, "12-sevdesk-offer.sql"))
    await runFile(pool, join(migrationDir, "13-email-templates-v2.sql"))
    await runFile(pool, join(migrationDir, "14-versand-dienstleister.sql"))
    await runFile(pool, join(migrationDir, "15-email-templates-du.sql"))
    await runFile(pool, join(migrationDir, "16-users-auth.sql"))
    console.log("Migration abgeschlossen.")
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error("Migration fehlgeschlagen:", err.message)
  process.exit(1)
})
