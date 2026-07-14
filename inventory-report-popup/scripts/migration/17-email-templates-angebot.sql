-- Freigabe-Mails: neuer Angebotstext mit Menge, Eventdatum, Lieferort

UPDATE email_templates SET
  subject = 'Dein Angebot – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

Danke für Deine unverbindliche Anfrage; wir haben Verfügbarkeit geprüft und können Dir folgendes Angebot anbieten:

{{menge}} LED-Armbänder
für Event am {{event_datum}}
in {{lieferort}}

Unsere Angebotssumme netto: {{angebot_netto}} EUR

Angebot und Status:
{{status_url}}

{{zahlungslink_block}}Wenn Du das Angebot annehmen möchtest, kannst Du entweder bequem direkt hier online bezahlen oder per Überweisung. Eine Rechnung erhältst Du in beiden Fällen im Nachgang.

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_approved_stripe';

UPDATE email_templates SET
  subject = 'Dein Angebot – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

Danke für Deine unverbindliche Anfrage; wir haben Verfügbarkeit geprüft und können Dir folgendes Angebot anbieten:

{{menge}} LED-Armbänder
für Event am {{event_datum}}
in {{lieferort}}

Unsere Angebotssumme netto: {{angebot_netto}} EUR

Angebot und Status:
{{status_url}}

Wenn Du das Angebot annehmen möchtest, kannst Du entweder bequem direkt hier online bezahlen oder per Überweisung. Eine Rechnung erhältst Du in beiden Fällen im Nachgang.

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_approved_manual';
