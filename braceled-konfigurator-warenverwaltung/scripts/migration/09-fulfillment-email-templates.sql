-- Fulfillment-Workflow, Zahlungsfelder, E-Mail-Templates

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30),
  ADD COLUMN IF NOT EXISTS payment_note TEXT,
  ADD COLUMN IF NOT EXISTS return_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_fulfillment ON quote_requests(fulfillment_status);

CREATE TABLE IF NOT EXISTS quote_fulfillment_events (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  from_status VARCHAR(40),
  to_status VARCHAR(40) NOT NULL,
  comment TEXT,
  tracking_number VARCHAR(100),
  mail_sent BOOLEAN NOT NULL DEFAULT false,
  mail_subject TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_fulfillment_events_quote ON quote_fulfillment_events(quote_id);

CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(80) UNIQUE NOT NULL,
  label VARCHAR(200) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'quote',
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  send_by_default BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_templates (template_key, label, category, subject, body, send_by_default) VALUES
(
  'quote_approved_stripe',
  'Freigabe mit Stripe-Zahlungslink',
  'quote',
  'Ihr Angebot wurde freigegeben – WIRKUNG Wristlink',
  'Hallo,

vielen Dank für Ihre Anfrage. Wir haben Ihr Angebot geprüft und freigegeben.

Angebotssumme netto: {{angebot_netto}} EUR
Zahlungsbetrag inkl. 19 % MwSt.: {{angebot_brutto}} EUR

Nach der Zahlung erhalten Sie eine Rechnung über Stripe.

Sie können jetzt bezahlen:
{{zahlungslink}}

Alternativ finden Sie Ihr Angebot hier:
{{angebot_url}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'quote_approved_manual',
  'Freigabe ohne Online-Zahlung',
  'quote',
  'Ihr Angebot wurde freigegeben – WIRKUNG Wristlink',
  'Hallo,

vielen Dank für Ihre Anfrage. Wir haben Ihr Angebot geprüft und freigegeben.

Angebotssumme netto: {{angebot_netto}} EUR
Zahlungsbetrag inkl. 19 % MwSt.: {{angebot_brutto}} EUR

Die Rechnung bzw. Zahlungsinformationen erhalten Sie in Kürze per E-Mail.

Ihr Angebot finden Sie hier:
{{angebot_url}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'quote_rejected',
  'Ablehnung',
  'quote',
  'Zu Ihrer Anfrage – WIRKUNG Wristlink',
  'Hallo,

leider können wir Ihre Anfrage in der gewünschten Form nicht bestätigen.

{{ablehnungsgrund}}

Bei Fragen antworten Sie gerne auf diese E-Mail.

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'quote_paid',
  'Zahlung eingegangen',
  'quote',
  'Zahlung eingegangen – WIRKUNG Wristlink',
  'Hallo,

wir haben Ihre Zahlung für Anfrage #{{anfrage_id}} erhalten. Vielen Dank!

{{zahlungsnotiz}}

Wir beginnen nun mit der Vorbereitung Ihrer Bestellung und melden uns mit den nächsten Schritten.

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'fulfillment_vorbereitet',
  'Fulfillment: Vorbereitet',
  'fulfillment',
  'Ihre Bestellung wird vorbereitet – WIRKUNG Wristlink',
  'Hallo,

gute Nachrichten: Ihre Anfrage #{{anfrage_id}} wurde vorbereitet (Bänder in Tüten verpackt).

{{kommentar}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'fulfillment_bedruckt',
  'Fulfillment: Bedruckt',
  'fulfillment',
  'Ihre Bänder wurden bedruckt – WIRKUNG Wristlink',
  'Hallo,

Ihre LED-Armbänder für Anfrage #{{anfrage_id}} wurden bedruckt.

{{kommentar}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'fulfillment_verpackt',
  'Fulfillment: Verpackt',
  'fulfillment',
  'Ihre Bestellung ist verpackt – WIRKUNG Wristlink',
  'Hallo,

Ihre Bestellung #{{anfrage_id}} ist verpackt und bereit für den Versand.

{{kommentar}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'fulfillment_versand_beauftragt',
  'Fulfillment: Versand beauftragt',
  'fulfillment',
  'Versand beauftragt – WIRKUNG Wristlink',
  'Hallo,

der Versand für Ihre Anfrage #{{anfrage_id}} wurde beauftragt.

Sendungsverfolgung: {{tracking_nr}}

{{kommentar}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'fulfillment_versandt',
  'Fulfillment: Versandt',
  'fulfillment',
  'Ihre Sendung ist unterwegs – WIRKUNG Wristlink',
  'Hallo,

Ihre Bestellung #{{anfrage_id}} wurde versandt.

{{tracking_info}}

{{kommentar}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'fulfillment_ruecksendung_angekommen',
  'Fulfillment: Rücksendung angekommen',
  'fulfillment',
  'Rücksendung eingegangen – WIRKUNG Wristlink',
  'Hallo,

wir haben Ihre Rücksendung zu Anfrage #{{anfrage_id}} erhalten.

{{kommentar}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
),
(
  'fulfillment_zurueckgepackt',
  'Fulfillment: Zurückgepackt',
  'fulfillment',
  'Rücksendung verarbeitet – WIRKUNG Wristlink',
  'Hallo,

Ihre zurückgesendeten LED-Armbänder (Anfrage #{{anfrage_id}}) wurden eingepackt und verarbeitet.

{{kommentar}}

Mit freundlichen Grüßen
Ihr WIRKUNG-Team',
  true
)
ON CONFLICT (template_key) DO NOTHING;
