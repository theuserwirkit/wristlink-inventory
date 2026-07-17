-- Kundenfreundliche E-Mail-Texte + Status-Link-Platzhalter (Du-Ansprache, Storytelling, Support-Hinweis)

UPDATE email_templates SET
  subject = 'Dein Angebot ist freigegeben – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

wir haben deine Anfrage geprüft und dein Angebot freigegeben. Deine LED-Armbänder sind für dich reserviert – damit ist der erste Schritt für dein Event gesichert.

Angebotssumme netto: {{angebot_netto}} EUR
Zahlungsbetrag inkl. 19 % MwSt.: {{angebot_brutto}} EUR

Zum Bezahlen und Termin sichern:
{{zahlungslink}}

Angebot und aktuellen Status findest du hier (Zugang mit der Postleitzahl deiner Firmenadresse):
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_approved_stripe';

UPDATE email_templates SET
  subject = 'Dein Angebot ist freigegeben – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

wir haben deine Anfrage geprüft und dein Angebot freigegeben. Deine LED-Armbänder sind für dich reserviert – damit ist der erste Schritt für dein Event gesichert.

Angebotssumme netto: {{angebot_netto}} EUR
Zahlungsbetrag inkl. 19 % MwSt.: {{angebot_brutto}} EUR

Rechnung und Zahlungsdetails erhältst du in Kürze per E-Mail.

Angebot und aktuellen Status findest du hier (Zugang mit der Postleitzahl deiner Firmenadresse):
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_approved_manual';

UPDATE email_templates SET
  subject = 'Zu deiner Anfrage – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

vielen Dank für deine Anfrage. Leider können wir sie in der gewünschten Form nicht bestätigen.

{{ablehnungsgrund}}

Wenn du eine Alternative besprechen möchtest, melde dich gern bei uns unter tech@wirkung-digital.de.

Bitte nicht auf diese E-Mail antworten.

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_rejected';

UPDATE email_templates SET
  subject = 'Zahlung eingegangen – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

deine Zahlung ist bei uns eingegangen – vielen Dank. Ab jetzt bereiten wir deine Bestellung vor, damit alles rechtzeitig bei dir ankommt.

{{zahlungsnotiz}}

Den Fortschritt kannst du hier verfolgen (Zugang mit der Postleitzahl deiner Firmenadresse):
{{status_url}}

Wir melden uns, sobald der nächste Schritt ansteht.

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'quote_paid';

UPDATE email_templates SET
  subject = 'Deine Bestellung wird vorbereitet – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

unser Team hat deine LED-Armbänder disponiert (Anfrage #{{anfrage_id}}). Damit dein Event reibungslos läuft, starten wir jetzt mit der Vorbereitung in unserem Lager.

{{kommentar}}

Aktuellen Status findest du hier:
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_vorbereitet';

UPDATE email_templates SET
  subject = 'Deine Armbänder wurden bedruckt – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

die LED-Armbänder für deine Anfrage #{{anfrage_id}} sind bedruckt und bereit für den nächsten Schritt – und sie sehen so cool aus! Dein Logo kommt auf den Bändern richtig gut zur Geltung.

{{kommentar}}

Details und Status:
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_bedruckt';

UPDATE email_templates SET
  subject = 'Deine Bestellung ist verpackt – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

deine Bestellung #{{anfrage_id}} ist verpackt und bereit für den Versand. Alles ist sicher verstaut – deine Bänder warten nur noch auf die Abholung.

{{kommentar}}

Aktuellen Status findest du hier:
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_verpackt';

UPDATE email_templates SET
  subject = 'Versand beauftragt – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

wir haben den Versand für deine Anfrage #{{anfrage_id}} beauftragt. Der Versanddienstleister ist informiert – bald geht deine Sendung auf die Reise zu dir.

Versanddienstleister: {{versand_dienstleister}}
Sendungsverfolgung: {{tracking_nr}}

{{kommentar}}

Aktuellen Status findest du hier:
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_versand_beauftragt';

UPDATE email_templates SET
  subject = 'Deine Sendung ist unterwegs – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

deine Bestellung #{{anfrage_id}} wurde versandt und ist auf dem Weg zu dir. Bald können die ersten Lichteffekte auf deinem Event getestet werden.

Versanddienstleister: {{versand_dienstleister}}
Sendungsverfolgung: {{tracking_nr}}

{{kommentar}}

Details und Status:
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_versandt';

UPDATE email_templates SET
  subject = 'Rücksendung eingegangen – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

deine Rücksendung zu Anfrage #{{anfrage_id}} ist bei uns eingegangen. Vielen Dank – wir kümmern uns jetzt um die weitere Verarbeitung.

{{kommentar}}

Aktuellen Status findest du hier:
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_ruecksendung_angekommen';

UPDATE email_templates SET
  subject = 'Rücksendung verarbeitet – WIRKUNG Wristlink',
  body = '{{kunde_anrede}}

wir haben die zurückgesendeten LED-Armbänder zu Anfrage #{{anfrage_id}} eingepackt und verarbeitet. Damit ist der Vorgang abgeschlossen – danke, dass du uns die Bänder zurückgeschickt hast.

{{kommentar}}

Abschluss-Status:
{{status_url}}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an tech@wirkung-digital.de

Viele Grüße
Dein WIRKUNG-Team',
  updated_at = NOW()
WHERE template_key = 'fulfillment_zurueckgepackt';
