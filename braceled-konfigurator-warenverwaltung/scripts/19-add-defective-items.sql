-- Add column for defective/missing items in booking_items
ALTER TABLE booking_items 
ADD COLUMN IF NOT EXISTS anzahl_fehlt INTEGER DEFAULT 0;

-- Update existing records to have 0 defective items
UPDATE booking_items 
SET anzahl_fehlt = 0 
WHERE anzahl_fehlt IS NULL;

-- Add constraint to ensure anzahl_fehlt is not negative
ALTER TABLE booking_items 
ADD CONSTRAINT booking_items_anzahl_fehlt_check 
CHECK (anzahl_fehlt >= 0);
