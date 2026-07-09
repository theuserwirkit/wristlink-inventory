-- Kundenfreundliche E-Mail-Texte + Status-Link-Platzhalter

UPDATE email_templates SET
  subject = 'Ihr Angebot ist da – fast leuchtet Ihr Event ✨',
  body = '{{kunde_anrede}}

Ihre Anfrage ist durch – wir haben alles geprüft und Ihre LED-Armbänder reserviert.

Summe netto: {{angebot_netto}} EUR
Zahlung inkl. 19 % MwSt.: {{angebot_brutto}} EUR

Jetzt Termin sichern:
{{zahlungslink}}

Angebot & Live-Status (Zugang mit der Postleitzahl Ihrer Firmenadresse):
{{status_url}}

Fragen? Einfach auf diese Mail antworten.

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_approved_stripe';

UPDATE email_templates SET
  subject = 'Ihr Angebot ist freigegeben – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

gute Nachrichten: Ihr WIRKUNG Wristlink-Angebot steht – wir halten Ihre Bänder bereit.

Summe netto: {{angebot_netto}} EUR
Zahlung inkl. 19 % MwSt.: {{angebot_brutto}} EUR

Rechnung und Zahlungsdetails folgen in Kürze per E-Mail.

Status & Angebot jederzeit einsehen (Zugang mit der Postleitzahl Ihrer Firmenadresse):
{{status_url}}

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_approved_manual';

UPDATE email_templates SET
  subject = 'Zu Ihrer Anfrage – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

vielen Dank für Ihr Vertrauen. Leider können wir Ihre Anfrage so leider nicht bestätigen.

{{ablehnungsgrund}}

Wenn Sie möchten, schreiben Sie uns gern zurück – manchmal findet sich eine Alternative.

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_rejected';

UPDATE email_templates SET
  subject = 'Zahlung eingegangen – wir legen los 🎉',
  body = '{{kunde_anrede}}

Ihre Zahlung ist bei uns angekommen – danke! Ab jetzt bereiten wir Ihre Bestellung vor.

{{zahlungsnotiz}}

Den Fortschritt verfolgen Sie hier (Zugang mit der Postleitzahl Ihrer Firmenadresse):
{{status_url}}

Wir melden uns, sobald es weitergeht.

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_paid';

UPDATE email_templates SET
  subject = 'Ihre Bänder werden vorbereitet – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

es geht los: Für Anfrage #{{anfrage_id}} packen wir Ihre Bänder in die Tüten – alles bereit für den nächsten Schritt.

{{kommentar}}

Status verfolgen:
{{status_url}}

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_vorbereitet';

UPDATE email_templates SET
  subject = 'Bedruckt und bereit – Ihre LED-Armbänder',
  body = '{{kunde_anrede}}

Ihr Logo sitzt: Die Armbänder für Anfrage #{{anfrage_id}} sind bedruckt und sehen großartig aus.

{{kommentar}}

Mehr erfahren:
{{status_url}}

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_bedruckt';

UPDATE email_templates SET
  subject = 'Verpackt und versandbereit – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

alles eingepackt: Ihre Bestellung #{{anfrage_id}} wartet nur noch auf den Versand.

{{kommentar}}

Live-Status:
{{status_url}}

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_verpackt';

UPDATE email_templates SET
  subject = 'Versand beauftragt – bald bei Ihnen',
  body = '{{kunde_anrede}}

der Kurier ist bestellt – Ihre Sendung zu Anfrage #{{anfrage_id}} ist unterwegs zu uns.

Sendungsverfolgung: {{tracking_nr}}

{{kommentar}}

Status verfolgen:
{{status_url}}

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_versand_beauftragt';

UPDATE email_templates SET
  subject = 'Unterwegs zu Ihnen – Ihre Sendung ist raus 📦',
  body = '{{kunde_anrede}}

es ist soweit: Ihre Bestellung #{{anfrage_id}} ist auf dem Weg zu Ihrem Event.

{{tracking_info}}

{{kommentar}}

Details & Status:
{{status_url}}

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_versandt';

UPDATE email_templates SET
  subject = 'Rücksendung eingegangen – danke',
  body = '{{kunde_anrede}}

Ihre Rücksendung zu Anfrage #{{anfrage_id}} ist bei uns angekommen – vielen Dank!

{{kommentar}}

Status einsehen:
{{status_url}}

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_ruecksendung_angekommen';

UPDATE email_templates SET
  subject = 'Rücksendung verarbeitet – alles erledigt',
  body = '{{kunde_anrede}}

wir haben Ihre zurückgesendeten LED-Armbänder (Anfrage #{{anfrage_id}}) eingepackt und verarbeitet – der Kreislauf ist geschlossen.

{{kommentar}}

Zum Abschluss-Status:
{{status_url}}

Herzliche Grüße
Ihr WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_zurueckgepackt';
