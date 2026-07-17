-- ============================================================
-- Migration 23: UNIQUE-Constraints auf SKU/Lot-Kombinationen (Audit C-11)
--
-- resolveSkuId()/die Lot-Auflösung in lib/actions/quote-warehouse.ts und
-- lib/actions/bookings-internal.ts nutzen ab jetzt ein atomares
-- `INSERT ... ON CONFLICT DO NOTHING/DO UPDATE ... RETURNING`-Pattern statt
-- Check-then-Insert. Damit das wirksam gegen Races schützt, brauchen die
-- betroffenen Kombinationen einen echten UNIQUE-Index:
--   - skus:           (item_type, group_id)  — eine SKU pro Artikeltyp/Gruppe
--   - inventory_lots:  (sku_id, batch_id)     — ein Lagerposten pro SKU/Charge
--
-- Vor dem UNIQUE-Index werden etwaige bereits bestehende Duplikate bereinigt
-- (zusammenführen statt Migration fehlschlagen zu lassen):
--   - skus-Duplikate werden auf die älteste Zeile (kleinste id) reduziert;
--     inventory_lots/booking_items, die auf die überzähligen Zeilen zeigen,
--     werden umgehängt, die überzähligen skus-Zeilen werden gelöscht.
--   - inventory_lots-Duplikate (nach dem skus-Merge ggf. neu entstanden)
--     werden analog zusammengeführt, `menge` wird dabei summiert (kein
--     Bestandsverlust), booking_items.lot_id wird umgehängt.
--
-- Idempotent: Ohne bestehende Duplikate sind die Merge-Blöcke No-Ops
-- (0 betroffene Zeilen); die UNIQUE-Indizes werden nur bei Bedarf angelegt
-- (IF NOT EXISTS). Mehrfache Ausführung ist sicher.
-- ============================================================

-- ---------- 1. Duplikate in skus zusammenführen (gleicher item_type+group_id) ----------
WITH duplicates AS (
  SELECT id, item_type, group_id,
    MIN(id) OVER (PARTITION BY item_type, group_id) AS keep_id
  FROM skus
  WHERE group_id IS NOT NULL
),
to_merge AS (
  SELECT id AS dup_id, keep_id FROM duplicates WHERE id <> keep_id
)
UPDATE inventory_lots il
SET sku_id = tm.keep_id
FROM to_merge tm
WHERE il.sku_id = tm.dup_id;

WITH duplicates AS (
  SELECT id, item_type, group_id,
    MIN(id) OVER (PARTITION BY item_type, group_id) AS keep_id
  FROM skus
  WHERE group_id IS NOT NULL
),
to_merge AS (
  SELECT id AS dup_id, keep_id FROM duplicates WHERE id <> keep_id
)
UPDATE booking_items bi
SET sku_id = tm.keep_id
FROM to_merge tm
WHERE bi.sku_id = tm.dup_id;

WITH duplicates AS (
  SELECT id, item_type, group_id,
    MIN(id) OVER (PARTITION BY item_type, group_id) AS keep_id
  FROM skus
  WHERE group_id IS NOT NULL
)
DELETE FROM skus s
USING duplicates d
WHERE s.id = d.id AND d.id <> d.keep_id;

-- ---------- 2. Duplikate in inventory_lots zusammenführen (menge summieren) ----------
WITH duplicates AS (
  SELECT id, sku_id, batch_id, menge,
    MIN(id) OVER (PARTITION BY sku_id, batch_id) AS keep_id
  FROM inventory_lots
  WHERE sku_id IS NOT NULL AND batch_id IS NOT NULL
),
sums AS (
  SELECT keep_id, SUM(menge) AS total_menge
  FROM duplicates
  GROUP BY keep_id
)
UPDATE inventory_lots il
SET menge = s.total_menge
FROM sums s
WHERE il.id = s.keep_id;

WITH duplicates AS (
  SELECT id, sku_id, batch_id,
    MIN(id) OVER (PARTITION BY sku_id, batch_id) AS keep_id
  FROM inventory_lots
  WHERE sku_id IS NOT NULL AND batch_id IS NOT NULL
),
to_merge AS (
  SELECT id AS dup_id, keep_id FROM duplicates WHERE id <> keep_id
)
UPDATE booking_items bi
SET lot_id = tm.keep_id
FROM to_merge tm
WHERE bi.lot_id = tm.dup_id;

WITH duplicates AS (
  SELECT id, sku_id, batch_id,
    MIN(id) OVER (PARTITION BY sku_id, batch_id) AS keep_id
  FROM inventory_lots
  WHERE sku_id IS NOT NULL AND batch_id IS NOT NULL
)
DELETE FROM inventory_lots il
USING duplicates d
WHERE il.id = d.id AND d.id <> d.keep_id;

-- ---------- 3. UNIQUE-Indizes ----------
CREATE UNIQUE INDEX IF NOT EXISTS uq_skus_item_type_group_id
  ON skus (item_type, group_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_lots_sku_batch
  ON inventory_lots (sku_id, batch_id);
