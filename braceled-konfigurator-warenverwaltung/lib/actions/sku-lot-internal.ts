import "server-only"

// C-11: Gemeinsamer SKU-/Lot-Resolver für quote-warehouse.ts und
// bookings-internal.ts. Nutzt INSERT ... ON CONFLICT DO NOTHING/DO UPDATE ...
// RETURNING statt Check-then-Insert, damit parallele Aufrufe für dieselbe
// (item_type, group_id) bzw. (sku_id, batch_id)-Kombination keine
// Race-Duplikate erzeugen können. Setzt die UNIQUE-Indizes aus
// scripts/migration/23-sku-lot-unique.sql voraus.

import type { TxQuery } from "@/lib/db"

export async function resolveSkuId(query: TxQuery, groupId: number): Promise<number> {
  const inserted = await query(
    `INSERT INTO skus (item_type, group_id) VALUES ('LED_BAND', $1)
     ON CONFLICT (item_type, group_id) DO NOTHING
     RETURNING id`,
    [groupId],
  )
  if (inserted.length > 0) return Number(inserted[0].id)

  const existing = await query(
    `SELECT id FROM skus WHERE item_type = 'LED_BAND' AND group_id = $1 LIMIT 1`,
    [groupId],
  )
  return Number(existing[0].id)
}

export async function resolveLotId(
  query: TxQuery,
  skuId: number,
  batchId: number,
): Promise<number | null> {
  const existing = await query(
    `SELECT id FROM inventory_lots WHERE sku_id = $1 AND batch_id = $2 LIMIT 1`,
    [skuId, batchId],
  )
  return existing.length > 0 ? Number(existing[0].id) : null
}
