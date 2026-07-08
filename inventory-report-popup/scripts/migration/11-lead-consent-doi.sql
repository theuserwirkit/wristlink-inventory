-- Marketing-Einwilligung erst nach DOI; B2B-Bestätigung beim Formular-Submit
ALTER TABLE leads ADD COLUMN IF NOT EXISTS b2b_confirmed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE email_verification_tokens
  ADD COLUMN IF NOT EXISTS marketing_consent_pending BOOLEAN NOT NULL DEFAULT false;
