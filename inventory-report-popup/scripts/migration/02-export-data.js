/**
 * Daten-Export für die Migration.
 *
 * Liest alle Tabelleninhalte aus der QUELL-Datenbank und schreibt eine
 * einzige SQL-Datei mit INSERT-Statements nach stdout.
 *
 * Verwendung (Quell-Instanz):
 *   NEON_DATABASE_URL="<quell-connection-string>" node scripts/migration/02-export-data.js > dump.sql
 *
 * Danach auf der ZIEL-Instanz:
 *   1. scripts/migration/01-schema.sql ausführen (Tabellen anlegen)
 *   2. dump.sql ausführen (Daten einspielen)
 *
 * Die Reihenfolge der Tabellen berücksichtigt Foreign-Key-Abhängigkeiten.
 * setval() am Ende setzt die SERIAL-Sequenzen korrekt, damit neue IDs
 * nicht mit importierten IDs kollidieren.
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_DATABASE_URL)

// Reihenfolge wichtig: Eltern vor Kindern (FK-sicher)
const TABLES = [
  { name: "groups", columns: ["id", "name", "created_at"] },
  { name: "batches", columns: ["id", "code", "funktionsumfang", "lieferant", "lieferdatum", "created_at"] },
  { name: "customers", columns: ["id", "name", "email", "telefon", "created_at"] },
  { name: "skus", columns: ["id", "item_type", "group_id", "created_at"] },
  { name: "inventory_lots", columns: ["id", "sku_id", "batch_id", "menge", "created_at"] },
  {
    name: "bases",
    columns: ["id", "bezeichnung", "hersteller", "kanalanzahl", "firmwareversion", "funktionsumfang", "batch_id", "created_at"],
  },
  {
    name: "bookings",
    columns: [
      "id",
      "booking_type",
      "customer_id",
      "datum_ausgabe",
      "datum_rueckgabe_geplant",
      "datum_rueckgabe_ist",
      "reference_rental_id",
      "bemerkung",
      "created_at",
    ],
  },
  {
    name: "booking_items",
    columns: [
      "id",
      "booking_id",
      "group_id",
      "sku_id",
      "lot_id",
      "batch_id",
      "base_id",
      "anzahl",
      "anzahl_fehlt",
      "anzahl_basen",
      "created_at",
    ],
  },
  { name: "system_settings", columns: ["key", "value", "description", "updated_at"] },
]

function formatValue(val) {
  if (val === null || val === undefined) return "NULL"
  if (typeof val === "number") return String(val)
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE"
  if (val instanceof Date) return `'${val.toISOString()}'`
  // String: einfache Anführungszeichen verdoppeln
  return `'${String(val).replace(/'/g, "''")}'`
}

async function exportTable(table) {
  const cols = table.columns.join(", ")
  // sql.query erlaubt dynamische Tabellennamen; Inhalte stammen nur aus eigener DB
  const rows = await sql.query(`SELECT ${cols} FROM ${table.name} ORDER BY 1`)

  if (rows.length === 0) {
    console.log(`-- ${table.name}: keine Daten`)
    console.log("")
    return
  }

  console.log(`-- ${table.name}: ${rows.length} Zeilen`)
  for (const row of rows) {
    const values = table.columns.map((c) => formatValue(row[c])).join(", ")
    console.log(`INSERT INTO ${table.name} (${cols}) VALUES (${values});`)
  }
  console.log("")
}

async function resetSequence(table) {
  // Nur Tabellen mit SERIAL id-Spalte
  if (!table.columns.includes("id")) return
  console.log(
    `SELECT setval(pg_get_serial_sequence('${table.name}', 'id'), COALESCE((SELECT MAX(id) FROM ${table.name}), 1), true);`,
  )
}

async function main() {
  console.log("-- ============================================")
  console.log("-- Wristlink App - Datenexport")
  console.log(`-- Erzeugt: ${new Date().toISOString()}`)
  console.log("-- Zuerst 01-schema.sql ausführen, dann diese Datei.")
  console.log("-- ============================================")
  console.log("")
  console.log("BEGIN;")
  console.log("")

  for (const table of TABLES) {
    await exportTable(table)
  }

  console.log("-- Sequenzen auf MAX(id) setzen")
  for (const table of TABLES) {
    await resetSequence(table)
  }

  console.log("")
  console.log("COMMIT;")
}

main().catch((err) => {
  console.error("Export fehlgeschlagen:", err)
  process.exit(1)
})
