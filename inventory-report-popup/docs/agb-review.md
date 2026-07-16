# AGB-Review – WIRKUNG Wristlink / BraceLED (B2B)

**Stand:** Juli 2026  
**Geprüfte Dateien:** `app/agb/page.tsx` (Vorversion), `app/impressum/page.tsx`, `app/datenschutz/page.tsx`, `lib/contact-emails.ts`, `lib/konfigurator/consent.ts`, `docs/konfigurator.md`

> **Hinweis:** Dieses Dokument ist eine fachliche Gap-Analyse und kein Ersatz für anwaltliche Prüfung. Die überarbeiteten AGB in `app/agb/page.tsx` sind ein Entwurf zur Vorbereitung der Anwaltsberatung.

---

## Kurzfazit

Die **Vorversion** der AGB (10 Abschnitte) deckte B2B-Grundlagen, unverbindlichen Konfigurator und Stripe grob ab, war aber für das **Miet-/Event-Geschäftsmodell** zu dünn. Wesentliche Themen (Rückgabe, Schäden, Fulfillment, Lieferpakete, Verfügbarkeitshinweise, Miete vs. Kauf) wurden nur pauschal auf das Angebot verwiesen.

**Subagent-Ergebnis (Juli 2026):** `app/agb/page.tsx` wurde auf **17 Abschnitte** erweitert; `docs/agb-review.md` (dieses Dokument) erstellt. Juristische Endprüfung durch Fachanwalt bleibt offen.

---

## Abgleich Geschäftsmodell ↔ AGB (Vorversion)

| Geschäftsmodell-Element | In Vorversion abgedeckt? | Bewertung |
|-------------------------|--------------------------|-----------|
| B2B-only (§ 14 BGB) | Ja (§ 1) | Ausreichend |
| Konfigurator unverbindlich | Ja (§ 2) | Ausreichend |
| Vertrag bei Angebotsannahme | Ja (§ 2) | Ausreichend |
| Nettopreise + MwSt. | Ja (§ 2) | Ausreichend |
| Miete vs. Kauf | Nur Verweis auf Angebot (§ 3) | **Zu vage** |
| Rückgabe / Flex-Rückgabe | Nur Verweis auf Angebot (§ 3) | **Fehlt** |
| Batterietausch | Nur Verweis auf Angebot (§ 3) | **Fehlt** |
| Lieferpakete (Regulär/Express/Eil) | Teilweise (§ 4) | **Zu vage** |
| Verfügbarkeitsprüfung (Ampel, Kurzvorlauf) | Nicht erwähnt | **Fehlt** |
| Fulfillment / Statusseite / PLZ-Zugang | Nicht erwähnt | **Fehlt** |
| Stripe + Überweisung | Stripe nur kurz (§ 5) | **Unvollständig** |
| Schadensersatz / Verlust / Verspätung | Nicht erwähnt | **Fehlt** |
| Bedruckung / Kunden-Uploads | Nicht erwähnt | **Fehlt** |
| Techniker-Option | Nicht erwähnt | **Fehlt** |
| Eigentumsvorbehalt Miete vs. Kauf | Nur Kauf-Kontext (§ 6) | **Unklar** |
| Gewährleistung B2B (12 Monate) | Ja (§ 7) | Prüfung durch Anwalt nötig |
| Haftung Event-Ausfall | Standard-Klausel (§ 8) | **Zu vage** |
| Widerruf B2B | Nicht erwähnt | **Fehlt** |
| Streitbeilegung | Nur Gerichtsstand (§ 10) | **Unvollständig** |
| Datenschutz-Verweis | Ja (§ 9) | Ausreichend |

---

## Gap-Analyse (Detail)

### 1. Mietbedingungen

**Status Vorversion:** Abschnitt 3 verweist pauschal auf Angebot/Auftragsbestätigung.  
**Gap:** Keine Regelung zu Mietbeginn/-ende (Eventzeitraum), Übergabe, Pflege, untersagter Weitervermietung, Rückgabefristen (3 WT nach Event / Flex 8 WT), Zustand bei Rückgabe.  
**Risiko:** **Hoch** – Kerngeschäft ist Miete von Event-Hardware.

### 2. Rückgabe und Rücksendung

**Status Vorversion:** Nicht geregelt.  
**Gap:** Kein Verfahren für Rücksendelabel, Versanddienstleister, Fristen, verspätete Rückgabe, Verzugspauschalen.  
**Risiko:** **Hoch** – Fulfillment endet mit `zurueckgepackt`; ohne AGB-Klarstellung entstehen Streit über Fristen und Kosten.

### 3. Schäden, Verlust, Verspätung, Batterietausch

**Status Vorversion:** Nicht geregelt.  
**Gap:** Keine Abgrenzung normaler Abnutzung vs. Schaden, Ersatzpflicht bei Verlust, Verspätungsgebühren, Batterietausch bei Miete.  
**Risiko:** **Hoch** – typische Streitpunkte bei Event-Miete.

### 4. Verfügbarkeit und Lieferzeiten

**Status Vorversion:** § 4 nennt Lieferzeiten als unverbindlich.  
**Gap:** Kein Hinweis auf Konfigurator-Ampel, Kurzvorlauf (< 21 / < 14 Tage), Hold bei Anfrage, Bestätigung erst bei Zahlung.  
**Risiko:** **Mittel** – Kunden könnten Verfügbarkeitsanzeige als Zusage verstehen.

### 5. Fulfillment und Kommunikation

**Status Vorversion:** Nicht erwähnt.  
**Gap:** Keine Regelung zu Statusseite (`/angebot/[token]`), E-Mail-Benachrichtigungen, Tracking, Mitwirkungspflichten des Kunden.  
**Risiko:** **Mittel** – operativ wichtig, rechtlich zur Erwartungssteuerung.

### 6. Zahlung (Stripe, Überweisung, Verzug)

**Status Vorversion:** Stripe kurz erwähnt.  
**Gap:** Kein Hinweis auf Stripe als Drittanbieter, keine Regelung manueller Zahlung, keine Aufrechnungs-/Zurückbehaltungsklausel (üblich B2B).  
**Risiko:** **Mittel**

### 7. Eigentumsvorbehalt bei Miete vs. Kauf

**Status Vorversion:** § 6 nur allgemein.  
**Gap:** Bei Miete bleibt Ware stets Eigentum des Anbieters; bei Kauf Eigentumsvorbehalt bis Zahlung – nicht differenziert.  
**Risiko:** **Mittel**

### 8. Bedruckung und Kundeninhalte

**Status Vorversion:** Nicht erwähnt.  
**Gap:** Keine Freistellung bei Markenrechten, keine Regelung zu Druckdateien/Probedruck, keine Haftung für Kunden-Uploads.  
**Risiko:** **Mittel** – relevant bei Kauf + Bedruckung.

### 9. Gewährleistung B2B

**Status Vorversion:** 12 Monate Verjährung.  
**Gap:** Keine Regelung zu Untersuchungs-/Rügepflicht (§ 377 HGB), keine Abgrenzung Miete (Mängel während Mietzeit) vs. Kauf.  
**Risiko:** **Mittel** – Klausel „sofern gesetzlich zulässig“ braucht anwaltliche Validierung.

### 10. Haftung bei Event-Ausfall / technischem Versagen

**Status Vorversion:** Standard-Haftungsbegrenzung.  
**Gap:** Keine spezifische Regelung zu Event-Nutzung, Batterielaufzeit, Funkstörungen, Höhe der Schadensersatz-Obergrenze bei leichter Fahrlässigkeit.  
**Risiko:** **Hoch** – zentrales Risiko bei LED-Eventprodukten.

### 11. Widerrufsrecht / Storno B2B

**Status Vorversion:** Nicht erwähnt.  
**Gap:** Kein ausdrücklicher Ausschluss des Widerrufsrechts für Unternehmer; keine Storno-/Rücktrittsregelung bei kurzfristiger Absage.  
**Risiko:** **Mittel**

### 12. Streitbeilegung

**Status Vorversion:** Nur Gerichtsstand.  
**Gap:** Kein Verweis auf B2B-Ausschluss Verbraucherschlichtung (wie Impressum); keine salvatorische Klausel.  
**Risiko:** **Niedrig**

---

## Konkrete Anwalts-Checkliste (15 Punkte)

| # | Prüfpunkt | Priorität |
|---|-----------|-----------|
| 1 | **B2B-Geltungsbereich:** Ausschluss Verbraucher (§ 13 BGB), Abwehr abweichender Kunden-AGB, Bezug auf Consent-Checkbox im Konfigurator | Hoch |
| 2 | **Vertragsschluss:** Unverbindlichkeit Website/Konfigurator vs. bindendes schriftliches Angebot (PDF/E-Mail), Annahme, Beginn der Ausführung | Hoch |
| 3 | **Mietvertrag:** Mietgegenstand, Mietzeitraum (Event `von`/`bis`), Übergabe, Nutzungsbeschränkungen, Eigentum beim Anbieter | Hoch |
| 4 | **Rückgabe:** Fristen (Regulär/Express 3 WT, Flex 8 WT), Rücksendekosten, verspätete Rückgabe, Verzugspauschalen | Hoch |
| 5 | **Schäden/Verlust:** Abnutzung vs. Schaden, Ersatzwert, Dokumentationspflicht, Versicherungsempfehlung | Hoch |
| 6 | **Batterietausch:** Pflichten bei Miete, wer trägt Kosten, Fristen | Mittel |
| 7 | **Verfügbarkeit:** Konfigurator-Ampel nicht als Zusage; Hold bei Submit; verbindliche Buchung erst bei Zahlung | Hoch |
| 8 | **Lieferpakete:** Regulär/Express/Eilauftrag, Mindestvorlauf, Eilauftrag inkl. Bedruckung möglich, Flex-Rückgabe | Mittel |
| 9 | **Zahlung:** Stripe (Drittanbieter), Überweisung, Fälligkeit, Verzug, Aufrechnungs-/Zurückbehaltungsverbot B2B | Mittel |
| 10 | **Eigentumsvorbehalt:** Kauf bis vollständige Zahlung; Miete – Eigentum verbleibt beim Anbieter | Mittel |
| 11 | **Gewährleistung B2B:** § 377 HGB Rüge, 12-Monats-Verjährung zulässig?, Miete vs. Kauf | Hoch |
| 12 | **Haftung:** Event-Ausfall, entgangener Gewinn, Obergrenze, Produkthaftung, Techniker-Leistungen | Hoch |
| 13 | **Bedruckung:** Kunden-Uploads, Markenrechte, Freistellung, Probedruck | Mittel |
| 14 | **Widerruf/Storno:** Ausschluss für Unternehmer, Rücktritt bei Nichtzahlung, Storno kurz vor Event | Mittel |
| 15 | **Schlussklauseln:** Gerichtsstand Wehrheim/Hessen, deutsches Recht, Salvatorische Klausel, AGB-Änderungen, Verbraucherschlichtung B2B-Ausschluss | Mittel |

---

## Risiko-Matrix (Lücken Vorversion)

| Lücke | Risiko | Begründung |
|-------|--------|------------|
| Mietbedingungen unvollständig | **Hoch** | Kerngeschäft, keine Durchsetzbarkeit bei Streit |
| Rückgabe/Verspätung | **Hoch** | Operativer Standardprozess ohne Vertragsgrundlage |
| Schäden/Verlust/Batterie | **Hoch** | Typische Schadensfälle bei Event-Miete |
| Verfügbarkeit als Zusage missverstanden | **Mittel** | Reputation + Ansprüche bei Kurzvorlauf |
| Fulfillment/Kommunikation | **Mittel** | Erwartungsmanagement, weniger Prozessrisiko |
| Stripe/Zahlung | **Mittel** | Standardprozesse, aber B2B-Verzug wichtig |
| Eigentumsvorbehalt Miete/Kauf | **Mittel** | Klarstellung verhindert Eigentumsstreit |
| Bedruckung/Markenrecht | **Mittel** | Nur bei Kauf+Druck relevant |
| Gewährleistung 12 Monate | **Mittel** | Gesetzliche Grenzen prüfen |
| Event-Ausfall-Haftung | **Hoch** | Haftungsrisiko bei Massenevents |
| Widerruf B2B | **Mittel** | Klarstellung schützt vor Verbraucherrecht |
| Streitbeilegung | **Niedrig** | Impressum deckt B2B-Schlichtung ab |

---

## Umsetzung im AGB-Entwurf (`app/agb/page.tsx`)

Der überarbeitete Entwurf enthält u. a.:

- Disclaimer-Banner (kein Ersatz für Anwalt)
- § 1–2: B2B, Konfigurator, Vertragsschluss
- § 3: Leistungsumfang, Verfügbarkeit, Hold/Bestätigung bei Zahlung
- § 4–5: Miete und Kauf (getrennt)
- § 6: Lieferung und Lieferpakete
- § 7: Fulfillment und Kundenportal
- § 8: Rückgabe (Miete)
- § 9: Schäden, Verlust, Verspätung, Batterietausch
- § 10: Zahlung (Stripe, Überweisung)
- § 11: Eigentum und Eigentumsvorbehalt
- § 12: Gewährleistung B2B
- § 13: Haftung
- § 14: Datenschutz-Verweis
- § 15: Widerruf und Storno (B2B)
- § 16: Streitbeilegung
- § 17: Schlussbestimmungen

**Firmendaten** ausschließlich aus Impressum: WIRKUNG digital GmbH, Hildegard-von-Bingen-Straße 1, 61273 Wehrheim, `legal@wirkung-digital.de`.

---

## Offene Punkte für den Fachanwalt (nach Entwurf)

1. Konkrete **Verzugspauschalen** und **Ersatzwerte** bei Schaden/Verlust (Höhe, Nachweis)
2. Zulässigkeit der **12-Monats-Verjährung** und Formulierung **§ 377 HGB** Rügepflicht
3. **Haftungsobergrenze** (z. B. Auftragswert) bei leichter Fahrlässigkeit und **Event-Ausfall**
4. **Storno-Regelung** kurz vor Event (Anzahlung, Produktionskosten)
5. **Batterietausch** – wer trägt Kosten, Fristen
6. **Gerichtsstand** und **Rechtswahl** für B2B mit Kunden außerhalb Deutschlands
7. **Aufrechnungs-/Zurückbehaltungsverbot** – Formulierung und Durchsetzbarkeit
8. **Bedruckung** – Freistellung bei Marken-/Urheberrechtsverletzungen durch Kunden-Dateien
9. Abgleich AGB mit **Stripe-Nutzungsbedingungen** und **AV-Verträgen** (Vercel, Resend, Neon)
10. Ob **Techniker-Leistungen** als Werkvertrag oder Dienstleistung zu qualifizieren sind

---

## Nächste Schritte

1. [x] AGB-Entwurf in `app/agb/page.tsx` (Subagent Juli 2026)
2. [x] Review-Dokument `docs/agb-review.md`
3. [ ] Termin mit Fachanwalt (Handels-/IT-Recht)
4. [ ] Nach Anwalts-Freigabe: Consent-Version ggf. anpassen (`CONSENT_TEXT_VERSION`)
5. [ ] Link AGB im Konfigurator/Footer prüfen (bereits vorhanden laut TODO)
