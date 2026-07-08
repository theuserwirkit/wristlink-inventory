-- Add anzahl_fehlt column to booking_items table
-- This enables tracking of defective/lost items during returns

ALTER TABLE booking_items 
ADD COLUMN IF NOT EXISTS anzahl_fehlt INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN booking_items.anzahl_fehlt IS 'Number of defective or lost items in a return (MIETE_RUECKGABE)';
