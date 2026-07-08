#!/usr/bin/env node
/**
 * Legt Starter-Stammdaten an (3 Produktgruppen + je 1 Charge).
 * Idempotent – überspringt bereits vorhandene Namen.
 */
import { neon } from "@neondatabase/serverless"

const url =
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL

if (!url) {
  console.error("Keine DB-URL gesetzt")
  process.exit(1)
}

const sql = neon(url)

const groups = [
  { name: "LED Armband Standard" },
  { name: "LED Zauberstab Pro" },
  { name: "LED Licht Event" },
]

const batch = {
  code: "Charge-2026-01",
  funktionsumfang: "Standard RGB",
  lieferant: "WIRKUNG",
  lieferdatum: "2026-01-15",
}

async function ensureGroup(name) {
  const existing = await sql`SELECT id FROM groups WHERE LOWER(name) = LOWER(${name}) LIMIT 1`
  if (existing.length > 0) return existing[0].id
  const created = await sql`INSERT INTO groups (name) VALUES (${name}) RETURNING id`
  return created[0].id
}

async function ensureBatch() {
  const existing = await sql`SELECT id FROM batches WHERE code = ${batch.code} LIMIT 1`
  if (existing.length > 0) return existing[0].id
  const created = await sql`
    INSERT INTO batches (code, funktionsumfang, lieferant, lieferdatum)
    VALUES (${batch.code}, ${batch.funktionsumfang}, ${batch.lieferant}, ${batch.lieferdatum})
    RETURNING id
  `
  return created[0].id
}

async function ensureSku(groupId) {
  const existing = await sql`
    SELECT id FROM skus WHERE item_type = 'LED_BAND' AND group_id = ${groupId} LIMIT 1
  `
  if (existing.length > 0) return existing[0].id
  const created = await sql`
    INSERT INTO skus (item_type, group_id) VALUES ('LED_BAND', ${groupId}) RETURNING id
  `
  return created[0].id
}

async function ensureLot(skuId, batchId) {
  const existing = await sql`
    SELECT id FROM inventory_lots WHERE sku_id = ${skuId} AND batch_id = ${batchId} LIMIT 1
  `
  if (existing.length > 0) return existing[0].id
  const created = await sql`
    INSERT INTO inventory_lots (sku_id, batch_id, menge) VALUES (${skuId}, ${batchId}, 0) RETURNING id
  `
  return created[0].id
}

const groupIds = []
for (const g of groups) {
  groupIds.push(await ensureGroup(g.name))
}
const batchId = await ensureBatch()
for (const groupId of groupIds) {
  const skuId = await ensureSku(groupId)
  await ensureLot(skuId, batchId)
}

console.log("Starter-Stammdaten bereit:")
console.log("- Gruppen:", groups.map((g) => g.name).join(", "))
console.log("- Charge:", batch.code)
console.log("\nNächster Schritt: Dashboard → Zugang buchen (Menge eintragen)")
