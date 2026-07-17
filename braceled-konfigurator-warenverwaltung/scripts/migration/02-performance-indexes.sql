-- Performance-Paket: zusätzliche Indizes für häufige Filter-/Sortierpfade

CREATE INDEX IF NOT EXISTS idx_bookings_created_at_desc
  ON bookings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_type_reference_rental
  ON bookings (booking_type, reference_rental_id);

CREATE INDEX IF NOT EXISTS idx_quote_requests_status_submitted_created
  ON quote_requests (status, submitted_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_requests_status_product
  ON quote_requests (status, ((config_json ->> 'produkt')));

CREATE INDEX IF NOT EXISTS idx_customers_lower_name
  ON customers (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_customers_lower_email
  ON customers (LOWER(email));
