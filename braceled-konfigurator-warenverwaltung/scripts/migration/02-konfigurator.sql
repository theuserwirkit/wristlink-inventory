-- ============================================================
-- Konfigurator: Leads, DOI, Angebotsanfragen, Stripe-Events
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_text_version VARCHAR(50) NOT NULL DEFAULT '1.0',
  consent_ip VARCHAR(45),
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash
  ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_lead
  ON email_verification_tokens(lead_id);

CREATE TABLE IF NOT EXISTS quote_requests (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  public_token UUID NOT NULL UNIQUE,
  config_json JSONB NOT NULL,
  price_snapshot_json JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  stripe_checkout_session_id VARCHAR(255),
  stripe_payment_link_url TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  stripe_event_id VARCHAR(255),
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'konfigurator',
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  external_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_lead ON quote_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_public_token ON quote_requests(public_token);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
