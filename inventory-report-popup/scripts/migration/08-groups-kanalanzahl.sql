-- Kanalanzahl für Leuchtgruppen (40CH / 80CH Bändchen)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS kanalanzahl INTEGER NOT NULL DEFAULT 40;
