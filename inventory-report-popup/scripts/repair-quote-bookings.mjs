/**
 * Legt fehlende Verkaufs-/Miet-Buchungen für Anfragen nach (booking_id IS NULL).
 * Usage: set -a && source .env.local && set +a && node scripts/repair-quote-bookings.mjs [quoteId]
 */
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)
const quoteIdArg = process.argv[2] ? Number(process.argv[2]) : null

function normalizeKanalanzahl(value) {
  const n = Number(value)
  if (n === 80) return 80
  return 40
}

async function getAvailability(groupId, batchId) {
  const items = await sql`
    SELECT bi.anzahl, bi.anzahl_fehlt, b.booking_type
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE bi.group_id = ${groupId} AND bi.batch_id = ${batchId}
  `
  let totalZugang = 0
  let totalVerkauft = 0
  let totalRented = 0
  let totalReturned = 0
  let totalDefekt = 0
  for (const item of items) {
    const anzahl = item.anzahl || 0
    switch (item.booking_type) {
      case "ZUGANG":
        totalZugang += anzahl
        break
      case "VERKAUF":
        totalVerkauft += anzahl
        break
      case "MIETE_AUSGABE":
        totalRented += anzahl
        break
      case "MIETE_RUECKGABE":
        totalReturned += anzahl
        totalDefekt += item.anzahl_fehlt || 0
        break
    }
  }
  const totalStock = totalZugang - totalVerkauft - totalDefekt
  const inVermietung = totalRented - (totalReturned + totalDefekt)
  return totalStock - inVermietung
}

async function findBestSaleAllocation(produkt, menge, kanalanzahl) {
  const groups = await sql`SELECT id, name, kanalanzahl FROM groups ORDER BY name ASC`
  const armbandGroups = groups.filter((g) => /^G([1-9]|1[0-9]|20)_(40|80)ch$/i.test(g.name))
  const filtered = armbandGroups.filter(
    (g) => kanalanzahl == null || Number(g.kanalanzahl) === kanalanzahl,
  )

  let best = null
  for (const group of filtered) {
    const batches = await sql`
      SELECT DISTINCT batch_id FROM (
        SELECT bi.batch_id FROM booking_items bi WHERE bi.group_id = ${group.id} AND bi.batch_id IS NOT NULL
        UNION
        SELECT il.batch_id FROM inventory_lots il JOIN skus s ON s.id = il.sku_id
        WHERE s.group_id = ${group.id} AND il.batch_id IS NOT NULL
      ) AS batches
    `
    for (const row of batches) {
      const batchId = Number(row.batch_id)
      const verfuegbar = await getAvailability(group.id, batchId)
      if (verfuegbar >= menge && (!best || verfuegbar > best.verfuegbar)) {
        best = { groupId: group.id, batchId, verfuegbar }
      }
    }
  }
  return best
}

async function createVerkaufBooking(quote, quoteId) {
  const config = quote.config_json
  const kanalanzahl =
    config.produkt === "armband" ? normalizeKanalanzahl(config.kanalanzahl) : undefined
  const allocation = await findBestSaleAllocation(config.produkt, config.menge, kanalanzahl)
  if (!allocation) {
    throw new Error("Keine verfügbare Charge für Verkaufsbuchung gefunden")
  }

  const customerName = config.kontaktFirma || config.kontaktName || quote.lead_email
  let customerId = null
  if (customerName) {
    const existing = await sql`
      SELECT id FROM customers WHERE LOWER(name) = LOWER(${customerName}) LIMIT 1
    `
    if (existing.length) {
      customerId = existing[0].id
    } else {
      const created = await sql`INSERT INTO customers (name) VALUES (${customerName}) RETURNING id`
      customerId = created[0].id
    }
  }

  const datumAusgabe = quote.paid_at || new Date().toISOString()
  const inserted = await sql`
    INSERT INTO bookings (booking_type, status, customer_id, datum_ausgabe, bemerkung)
    VALUES ('VERKAUF', 'BESTAETIGT', ${customerId}, ${datumAusgabe}, ${`Anfrage #${quoteId}`})
    RETURNING id
  `
  const bookingId = inserted[0].id

  const skuRows = await sql`
    SELECT id FROM skus WHERE item_type = 'LED_BAND' AND group_id = ${allocation.groupId} LIMIT 1
  `
  let skuId = skuRows[0]?.id
  if (!skuId) {
    const created = await sql`
      INSERT INTO skus (item_type, group_id) VALUES ('LED_BAND', ${allocation.groupId}) RETURNING id
    `
    skuId = created[0].id
  }

  const lotRows = await sql`
    SELECT id, menge FROM inventory_lots WHERE sku_id = ${skuId} AND batch_id = ${allocation.batchId} LIMIT 1
  `
  const lotId = lotRows[0]?.id ?? null
  if (lotId) {
    await sql`UPDATE inventory_lots SET menge = ${lotRows[0].menge - config.menge} WHERE id = ${lotId}`
  }

  await sql`
    INSERT INTO booking_items (booking_id, group_id, sku_id, lot_id, batch_id, anzahl, anzahl_fehlt)
    VALUES (${bookingId}, ${allocation.groupId}, ${skuId}, ${lotId}, ${allocation.batchId}, ${config.menge}, 0)
  `

  await sql`
    UPDATE quote_requests SET booking_id = ${bookingId}, updated_at = NOW() WHERE id = ${quoteId}
  `
  return bookingId
}

async function main() {
  const rows = quoteIdArg
    ? await sql`
        SELECT qr.*, l.email AS lead_email
        FROM quote_requests qr
        JOIN leads l ON l.id = qr.lead_id
        WHERE qr.id = ${quoteIdArg}
      `
    : await sql`
        SELECT qr.*, l.email AS lead_email
        FROM quote_requests qr
        JOIN leads l ON l.id = qr.lead_id
        WHERE qr.booking_id IS NULL
          AND (
            (qr.status = 'paid' AND qr.config_json->>'modus' = 'kauf')
            OR (qr.config_json->>'modus' = 'miete' AND qr.status IN ('submitted', 'approved', 'payment_pending'))
          )
        ORDER BY qr.id
      `

  if (!rows.length) {
    console.log("Keine Anfragen ohne Buchung gefunden.")
    return
  }

  for (const quote of rows) {
    const config = quote.config_json
    try {
      if (quote.status === "paid" && config.modus === "kauf") {
        const bookingId = await createVerkaufBooking(quote, quote.id)
        console.log(`Quote #${quote.id}: VERKAUF-Buchung #${bookingId} angelegt`)
      } else {
        console.log(`Quote #${quote.id}: Miet-Hold — bitte im Admin-UI „Reservierung jetzt anlegen“ nutzen`)
      }
    } catch (error) {
      console.error(`Quote #${quote.id}:`, error.message)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
