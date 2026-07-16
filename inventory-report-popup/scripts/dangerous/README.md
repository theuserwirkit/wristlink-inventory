# ⚠️ Gefährliche Skripte – NICHT ungeprüft ausführen

Die SQL-Skripte in diesem Ordner **löschen Produktionsdaten unwiderruflich**
und sind bewusst von den normalen, idempotenten Migrationen unter
`scripts/migration/` bzw. `scripts/*.sql` getrennt (C-10), damit sie nicht
versehentlich als Teil eines regulären Migrationslaufs (`pnpm db:migrate`)
mitausgeführt werden.

## `18-complete-reset.sql`

Löscht **alle** `booking_items`, `bookings`, `inventory_lots` und `skus` und
legt anschließend pro Gruppe genau eine neue `LED_BAND`-SKU mit Bestand `0`
an. **Das ist kein Backup-fähiger Vorgang** – nach der Ausführung sind alle
Buchungshistorien und Bestände unwiderruflich weg.

### Vor der Ausführung

1. **Aktuelles DB-Backup/Snapshot erstellen** (Neon-Branching oder
   `pg_dump`) – ohne Backup nicht ausführen.
2. Sicherstellen, dass wirklich die **richtige** Datenbank verbunden ist
   (niemals versehentlich gegen Production laufen lassen, wenn eigentlich
   eine Staging-Umgebung zurückgesetzt werden soll).
3. Skript nur manuell und gezielt ausführen (z. B. via `psql`/Neon-SQL-Editor),
   niemals über ein automatisiertes Migrations-/Deploy-Skript.

Bei Unsicherheit: nicht ausführen, sondern Rücksprache halten.
