-- Kompletter Reset: Löscht alle SKUs, Inventory Lots und Buchungen
-- Behält nur Gruppen und Chargen
-- Erstellt neue SKUs (nur LED_BAND) mit Bestand 0

-- Schritt 1: Lösche alle Buchungsdaten (in der richtigen Reihenfolge wegen Foreign Keys)
DELETE FROM booking_items WHERE id > 0;
DELETE FROM bookings WHERE id > 0;

-- Schritt 2: Lösche alle Inventory Lots
DELETE FROM inventory_lots WHERE id > 0;

-- Schritt 3: Lösche alle SKUs
DELETE FROM skus WHERE id > 0;

-- Schritt 4: Erstelle EINE SKU pro Gruppe (nur LED_BAND)
INSERT INTO skus (item_type, group_id)
SELECT 'LED_BAND', id
FROM groups
ORDER BY id;

-- Schritt 5: Erstelle Inventory Lots mit Bestand 0 für jede SKU × Batch Kombination
INSERT INTO inventory_lots (sku_id, batch_id, menge)
SELECT s.id, b.id, 0
FROM skus s
CROSS JOIN batches b
ORDER BY s.id, b.id;

-- Zeige Zusammenfassung
SELECT 
  'Gruppen' as Tabelle, 
  COUNT(*) as Anzahl 
FROM groups
UNION ALL
SELECT 
  'Chargen' as Tabelle, 
  COUNT(*) as Anzahl 
FROM batches
UNION ALL
SELECT 
  'SKUs' as Tabelle, 
  COUNT(*) as Anzahl 
FROM skus
UNION ALL
SELECT 
  'Inventory Lots' as Tabelle, 
  COUNT(*) as Anzahl 
FROM inventory_lots
UNION ALL
SELECT 
  'Buchungen' as Tabelle, 
  COUNT(*) as Anzahl 
FROM bookings
UNION ALL
SELECT 
  'Booking Items' as Tabelle, 
  COUNT(*) as Anzahl 
FROM booking_items;

-- Zeige SKUs pro Gruppe (sollte immer 1 sein)
SELECT 
  g.name as Gruppe,
  COUNT(s.id) as "Anzahl SKUs",
  STRING_AGG(s.item_type::text, ', ') as "SKU Typen"
FROM groups g
LEFT JOIN skus s ON s.group_id = g.id
GROUP BY g.id, g.name
ORDER BY g.name;

-- Zeige Gesamtbestand pro Gruppe (sollte alles 0 sein)
SELECT 
  g.name as Gruppe,
  SUM(il.menge) as "Gesamtbestand"
FROM groups g
LEFT JOIN skus s ON s.group_id = g.id
LEFT JOIN inventory_lots il ON il.sku_id = s.id
GROUP BY g.id, g.name
ORDER BY g.name;
