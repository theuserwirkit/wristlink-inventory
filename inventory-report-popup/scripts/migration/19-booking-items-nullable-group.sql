-- Basis-Stationen werden als eigene booking_items ohne Leuchtgruppe gespeichert.
ALTER TABLE booking_items ALTER COLUMN group_id DROP NOT NULL;
