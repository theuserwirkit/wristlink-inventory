# Wristlink App – Migrationsleitfaden

Dieser Leitfaden beschreibt, wie das Projekt vollständig auf eine andere Instanz
(neue Neon-Datenbank + neues Vercel-Projekt) migriert wird: Umgebungsvariablen,
Datenbankschema, Datenexport/-import und die fachliche Datenstruktur.

**Weitere Doku:** Konfigurator-Logik → `docs/konfigurator.md` · Admin-Anfragen & Fulfillment → Abschnitt 5 unten

---

## 1. Umgebungsvariablen

Auf der neuen Instanz müssen mindestens diese Variablen gesetzt sein:

| Variable | Zweck |
|----------|-------|
| `DATABASE_URL` / `NEON_DATABASE_URL` | Connection-String der Neon/Postgres-Datenbank (`lib/db.ts`) |
| `WRISTLINK_PASSWORD` | Gemeinsames Login-Passwort der App (`lib/auth-core.ts`) |

Zusätzlich je nach Feature: Stripe, Resend, Telegram, `WRISTLINK_PRODUCT_MAPPING`, etc. (siehe `env.konfigurator.example` / Vercel-Projekt).

### E-Mail & Kontakt

Zentrale Konstanten: `lib/contact-emails.ts`

| Variable | Default / Zweck |
|----------|-----------------|
| `RESEND_FROM_EMAIL` | `BraceLED <angebote@braceled-led-armband.com>` – Absender Konfigurator/Transaktionsmails |
| `TEAM_NOTIFICATION_EMAIL` | `angebote@braceled-led-armband.com` – interne Anfrage-Benachrichtigungen |
| `RESEND_API_KEY` | Resend API (Double-Opt-In, Freigabe, Fulfillment) |

Transaktions-Mails werden zentral über `lib/konfigurator/email.ts` als **Plain-Text und HTML** versendet (`buildEmailBodies` in `lib/konfigurator/email-html.ts`):

| Mechanismus | Zweck |
|-------------|--------|
| `normalizeBrokenUrls()` | Zeilenumbrüche mitten in URLs zusammenführen (z. B. Domain + `/angebot/uuid` auf zwei Zeilen) |
| Plain-Text | URLs in spitze Klammern: `<https://…>` – besser erkennbar für Mail-Clients |
| HTML | `<a href="…">` mit kurzem Linktext statt langer UUID-URL |

**HTML-Linktexte:** `/angebot/…` → „Angebot und Status öffnen“ · Stripe-Checkout → „Jetzt online bezahlen“ · DOI → „E-Mail-Adresse bestätigen“

**Mails mit Status-Link (`{{status_url}}` / `{{angebot_url}}`):** `quote_approved_stripe`, `quote_approved_manual`, `quote_paid`, alle `fulfillment_*` (8 Schritte; mit Druck: erst „Zusammengepackt“, dann „Bedruckt“). Zusätzlich hardcoded: Anfrage-Bestätigung nach Konfigurator-Submit (`sendCustomerSubmittedEmail`).

**Freigabe-Texte (Migration 17):** Platzhalter `{{menge}}`, `{{event_datum}}`, `{{lieferort}}`, `{{zahlungslink_block}}` – siehe `lib/konfigurator/email-template-render.ts`.

**Regressionstest:** `npx tsx scripts/test-email-links.ts` (11 Szenarien: alle Status-Templates + Anfrage-Bestätigung)

Allgemeine Firmenadressen (Impressum, Datenschutz): `@wirkung-digital.de` (`info@`, `legal@`, `datenschutz@`).

> **Resend:** Domain `braceled-led-armband.com` muss in Resend verifiziert sein (SPF/DKIM).

> **Auth-Modell:** Es gibt keine User-Tabelle in Benutzung. Login erfolgt über **ein**
> gemeinsames Passwort. Nach erfolgreichem Login wird ein signierter Cookie
> `wristlink_auth` (7 Tage gültig) gesetzt. Alle eingeloggten Nutzer haben
> implizit ADMIN-Rechte.
>
> **Wichtig:** `WRISTLINK_PASSWORD` **nicht** in `next.config.mjs` unter `env` eintragen –
> das würde den Wert beim Build ins Bundle schreiben. Nur in `.env.local` (lokal) bzw.
> Vercel Environment Variables. Optional getrennt: `WRISTLINK_SESSION_SECRET` für die
> Cookie-Signatur (Fallback: `WRISTLINK_PASSWORD`).
>
> **Lokal starten:** `pnpm dev` aus `inventory-report-popup/` (setzt intern
> `env -u WRISTLINK_PASSWORD`, damit ein leerer Shell-Wert `.env.local` nicht blockiert).

---

## 2. Datenbankschema

### Tabellenübersicht

| Tabelle | Inhalt |
|---------|--------|
| `groups` | Leuchtgruppen (LED-Bänder), inkl. `kanalanzahl` (40/80 CH) |
| `batches` | Chargen / Lieferungen (Funktionsumfang, Lieferant, Lieferdatum) |
| `customers` | Kunden für Vermietung |
| `skus` | Artikel-Stammnummern (1 SKU je Gruppe, `item_type` Default `LED_BAND`) |
| `inventory_lots` | Bestandsposten je SKU × Charge mit Menge |
| `bases` | Controller/Basisstationen inkl. `station_typ` (eco/pro/keine) und `kanalanzahl` |
| `bookings` | Buchungskopf (Typ, Kunde, Daten, `status`, Bemerkung) |
| `booking_items` | Buchungspositionen (Menge, Defekte, Basen) |
| `system_settings` | Konfigurierbare Parameter (Key-Value, z. B. Puffer, `product_mapping`) |
| `leads` | Konfigurator-Leads (E-Mail, DOI, Kontaktdaten, `b2b_confirmed`, Consent) |
| `email_verification_tokens` | DOI-Tokens inkl. `marketing_consent_pending` |
| `quote_requests` | Angebotsanfragen (`config_json`, Preis-Snapshot, Stripe, Status, Fulfillment) |
| `quote_fulfillment_events` | Historie der Fulfillment-Schritte je Anfrage (Kommentar, Tracking, Mail) |
| `email_templates` | Editierbare E-Mail-Vorlagen (Freigabe, Zahlung, Fulfillment) |
| `stripe_webhook_events` | Idempotente Stripe-Event-Verarbeitung |
| `konfigurator_logos` | Logo-Uploads (BYTEA) je Lead |

### Spaltendetails (Kern)

**groups:** `id`, `name`, `kanalanzahl` (Default 40), `created_at`  
Empfohlenes Namensschema: `G{n}_{40|80}ch` (siehe `docs/konfigurator.md`)

**bases:** `id`, `bezeichnung`, `hersteller`, `kanalanzahl`, `station_typ` (eco/pro/keine),
`firmwareversion`, `funktionsumfang`, `batch_id` → batches, `created_at`

**bookings:** zusätzlich `status` (z. B. `BESTAETIGT`, `ANGEFRAGT` für n8n-Holds)

**quote_requests:** `config_json` enthält u. a. `variante`, `gruppen`, `gruppenGroessen[]`, `kanalanzahl` (intern), Kontakt (`kontaktName`, `kontaktFirma`, `kontaktTelefon`, `kontaktStrasse`, `kontaktPlz`, `kontaktOrt`) und Event (`technikerAdresse`).
Zusätzliche Spalten (Migration `09`): `fulfillment_status`, `tracking_number`, `payment_method`, `payment_note`, `return_booking_id`.
Migration `14`: `versand_dienstleister` (UPS/DHL/TNT).

**quote_fulfillment_events:** `from_status`, `to_status`, `comment` (Kundenkommentar), `internal_note` (Migration `18`), `tracking_number`, `versand_dienstleister` (Migration `14`), `mail_sent`, `mail_subject`, `created_by`, `created_at`.

**email_templates:** `template_key` (unique), `label`, `category` (`quote` \| `fulfillment`), `subject`, `body`, `send_by_default`.

### Anfrage-Status (`quote_requests.status`)

| Status | Bedeutung |
|--------|-----------|
| `draft` | Entwurf (intern) |
| `submitted` | Vom Kunden eingereicht, wartet auf Freigabe |
| `approved` | Freigegeben **ohne** Stripe (Überweisung / manuell) |
| `payment_pending` | Freigegeben mit Stripe-Zahlungslink |
| `paid` | Zahlung eingegangen → Fulfillment startet |
| `rejected` | Abgelehnt |
| `expired` | Zahlungsfrist abgelaufen |
| `cancelled` | Storniert |

**Buchung im Bestand:** Miet-Hold bei Submit; endgültige Bestätigung (`BESTAETIGT`) erst bei Zahlung (`paid`), nicht bei Freigabe.

### Buchungstypen (`bookings.booking_type`)

| Wert | Bedeutung |
|------|-----------|
| `ZUGANG` | Bestandszugang (Einkauf/Lieferung) |
| `VERKAUF` | Bestandsabgang durch Verkauf |
| `MIETE_AUSGABE` | Vermietung – Ausgabe |
| `MIETE_RUECKGABE` | Vermietung – Rückgabe (mit `anzahl_fehlt` für Defekte/Verluste) |

### Default-Settings (`system_settings`)

| Key | Default | Bedeutung |
|-----|---------|-----------|
| `departure_buffer_days` | `6` | Werktage Vorlauf: Artikel verlässt Lager X Werktage vor Event |
| `return_buffer_days` | `5` | Tage Nachlauf: Artikel wieder verfügbar X Tage nach Event-Ende |
| `product_mapping` | JSON | Suchmuster für `groups.name` je Produktkategorie |
| `global_cc_email` | `` (leer) | CC-Adresse für alle ausgehenden E-Mails |

### Controller-Bestand (wichtig)

Jeder `bases`-Datensatz = **1 physisches Gerät**. Ohne ZUGANG-Buchung gilt Bestand 1
(siehe `getBaseAvailability` in `lib/actions/bookings.ts`).

---

## 3. Migration durchführen

### Schritt 1 – Basisschema

```bash
psql "$DATABASE_URL" -f scripts/migration/01-schema.sql
```

`01-schema.sql` ist idempotent und enthält bereits `groups.kanalanzahl` und `bases.station_typ`.

### Schritt 2 – Feature-Migrationen (Reihenfolge)

| Skript | Inhalt |
|--------|--------|
| `02-konfigurator.sql` | Leads, DOI, `quote_requests`, Stripe-Events |
| `03-n8n-api.sql` | `bookings.status`, `product_mapping` |
| `04-quote-lifecycle.sql` | Erweiterungen `quote_requests` (booking_id, source, …) |
| `05-lead-contact.sql` | Kontaktfelder auf `leads` |
| `06-konfigurator-logos.sql` | Tabelle `konfigurator_logos` |
| `07-base-station-typ.sql` | `bases.station_typ` (falls ältere DB ohne Spalte) |
| `08-groups-kanalanzahl.sql` | `groups.kanalanzahl` (falls ältere DB ohne Spalte) |
| `09-fulfillment-email-templates.sql` | Fulfillment-Spalten, `quote_fulfillment_events`, `email_templates` + Seed |
| `10-offer-pdf.sql` | Angebots-PDF-Speicherung |
| `11-lead-consent-doi.sql` | `leads.b2b_confirmed`, `email_verification_tokens.marketing_consent_pending` |
| `12-sevdesk-offer.sql` | `quote_requests.sevdesk_order_id`, `sevdesk_order_number` |
| `13-email-templates-v2.sql` | Überarbeitete Kunden-Mail-Texte, Platzhalter `{{status_url}}`, `{{kunde_anrede}}` |
| `14-versand-dienstleister.sql` | `versand_dienstleister` auf `quote_requests` und `quote_fulfillment_events` (E-Mail-Platzhalter `{{versand_dienstleister}}`) |
| `15-email-templates-du.sql` | E-Mail-Vorlagen: professionelle Du-Ansprache (ersetzt holprige Texte aus Migration 13) |
| `16-users-auth.sql` | `users`-Tabelle (optional, Multi-User-Login) |
| `17-email-templates-angebot.sql` | Freigabe-Mails: Menge, Eventdatum, Lieferort, neuer Angebotstext |
| `18-fulfillment-comments.sql` | `internal_note` auf `quote_fulfillment_events`; `{{kommentar}}` aus Fulfillment-Templates entfernt |
| `19-booking-items-nullable-group.sql` | `booking_items.group_id` optional – Basis-Stationen ohne Leuchtgruppe zuweisbar |
| `20-bases-seriennummer.sql` | `bases.seriennummer` (UNIQUE, physisch aufgedruckt); Backfill bestehender Basen |
| `21-packing-docs-printed.sql` | Packlisten-Druckstatus |
| `22-global-cc-email.sql` | `global_cc_email` in `system_settings` (CC für alle Mails) |

**Lager-Zuweisung (Auftragsdetail):** Karte „Lager & Bestand“ auf `/warenverwaltung/auftraege/[id]` – Verfügbarkeit je Charge, Chargen-Split mit Vorschlag, Basis mit Seriennummer. Lagerlabels erst nach vollständiger Zuweisung (`isQuoteWarehouseReadyForPrint`). Reparatur fehlender Buchungen: `scripts/repair-quote-bookings.mjs`.

Auf **bestehenden** Installationen mit aktuellem `01-schema.sql` sind `07` und `08` optional (no-op). Migrationen `13`, `15` und `17` überschreiben Standardtexte in `email_templates` (Admin-Anpassungen gehen verloren, falls nicht gesichert). Migration `18` entfernt `{{kommentar}}` aus Fulfillment-Templates – Kundenkommentare werden beim Versand automatisch vor der Signatur eingefügt (`appendCustomerCommentToEmail`). Migration `20` vergibt Seriennummern im Format `WL-ECO-00001` / `WL-PRO-00002` für bestehende Datensätze ohne Nummer.

```bash
pnpm db:migrate
```

Lokal: `.env.local` vorher laden, sonst fehlt `DATABASE_URL`:

```bash
set -a && . ./.env.local && set +a && pnpm db:migrate
```

Alternativ per `psql`:

```bash
for f in 02-konfigurator 03-n8n-api 04-quote-lifecycle 05-lead-contact 06-konfigurator-logos 07-base-station-typ 08-groups-kanalanzahl 09-fulfillment-email-templates 10-offer-pdf 11-lead-consent-doi 12-sevdesk-offer 13-email-templates-v2 14-versand-dienstleister 15-email-templates-du 16-users-auth 17-email-templates-angebot 18-fulfillment-comments 19-booking-items-nullable-group 20-bases-seriennummer 21-packing-docs-printed 22-global-cc-email; do
  psql "$DATABASE_URL" -f "scripts/migration/${f}.sql"
done
```

### Schritt 3 – Daten exportieren (Quellinstanz)

```bash
DATABASE_URL="<quell-connection-string>" \
  node scripts/migration/02-export-data.js > dump.sql
```

### Schritt 4 – Daten importieren (Zielinstanz)

```bash
psql "$DATABASE_URL" -f dump.sql
```

### Schritt 5 – App deployen

`DATABASE_URL` und `WRISTLINK_PASSWORD` im Vercel-Projekt setzen und deployen.

**Deploy-Workflow (Monorepo, Root Directory = `inventory-report-popup`):**

```bash
git push origin main          # Auto-Deploy auf Production (braceled-led-armband.com)
# Manuell vom Repo-Root (NICHT aus inventory-report-popup/):
vercel --prod
```

**Wichtig:** `NEXT_PUBLIC_APP_URL` ohne Zeilenumbruch setzen – sonst lehnt Stripe Checkout-URLs mit „Not a valid URL“ ab. `getAppBaseUrl()` trimmt Whitespace zusätzlich (`lib/konfigurator/lead-auth.ts`).

---

## 4. Was wo gespeichert / abgefragt wird

- **Gespeichert:** Produktgruppen (mit Kanalanzahl), Chargen, Basen (mit Stationstyp und Seriennummer),
  Kunden, Bestand je SKU × Charge, Buchungen, Konfigurator-Anfragen, Systemparameter.
- **Berechnet:** Verfügbarkeit je Gruppe/Basis (zeitraumbezogen mit Vor-/Nachlauf),
  Konfigurator-Stress-Ampeln, Gruppen-Zuordnung für PRO-Programmierung (max. 3 physische Lagergruppen).
- **LED-Bänder (gemeinsamer Pool):** Verkauf und Miete ziehen aus demselben Bestand. Ledger-Formel: `ZUGANG − VERKAUF − Defekt − In Vermietung` (je Gruppe/Charge). Konfigurator aggregiert über alle Chargen; Lager-Zuweisung arbeitet charge-spezifisch.
- **Aufträge vs. Buchungen:** Konfigurator-Anfragen erscheinen unter `/warenverwaltung/auftraege` (nicht unter „Buchungen“). Tab „Buchungen“ = manuelle Lagerbuchungen. Verkaufsbuchung bei Kauf erst bei Zahlung; Miet-Reservierung (`ANFRAGE`) nur bei `modus: miete` beim Submit.
- **Konfigurator-API:** `POST /api/konfigurator/session` (price, availability, station-availability, group-availability).
- **Admin-Anfragen:** `/admin/anfragen` – Freigabe, Zahlung, Fulfillment, E-Mail-Vorschau, Prioritäts-Karte (3 dringendste offene Aufträge nach `fulfillment-timing`).
- **E-Mail-Einstellungen:** `/admin/einstellungen/e-mails` – globale CC-Adresse (`global_cc_email`, Migration 22) und Vorlagen bearbeiten (Platzhalter `{{kunde_anrede}}`, `{{menge}}`, `{{event_datum}}`, `{{lieferort}}`, `{{status_url}}`, …). Standardtexte: Migrationen `13`, `15`, `17`. CC wird zentral in `sendTemplatedEmail()` gesetzt (`lib/konfigurator/email-settings.ts`).
- **Kunden-Statusseite:** `/angebot/[public_token]` – Angebot, Zahlung, Fulfillment-Timeline; Zugang per Firmen-PLZ (`kontaktPlz` in `config_json`, Fallback: PLZ aus Eventadresse). PLZ-Prüfung: `lib/konfigurator/plz.ts`, Cookie: `lib/konfigurator/angebot-access.ts`.

---

## 5. Admin: Anfragen, Zahlung & Fulfillment

### Freigabe (`/admin/anfragen/[id]`)

| Aktion | Verhalten |
|--------|-----------|
| **Freigeben mit Stripe** | Status → `payment_pending`, Checkout-Link per E-Mail (`quote_approved_stripe`) inkl. `{{status_url}}` |
| **Freigeben ohne Stripe** | Status → `approved`, E-Mail mit Statuslink (`quote_approved_manual`) |
| **Ablehnen** | Status → `rejected`, E-Mail mit Grund (`quote_rejected`), Hold wird freigegeben |
| **Mail-Vorschau** | Vor dem Senden Betreff/Text der Template-Mail anzeigen |
| **Angebots-PDF** | Manuell: „In sevDesk erstellen“ oder PDF-Upload – Anhang bei Freigabe/Zahlung (siehe `docs/sevdesk-angebote.md`) |

### Zahlung

| Weg | Aktion |
|-----|--------|
| **Stripe** | Webhook setzt Status → `paid`, Buchung bestätigt, Fulfillment startet |
| **Manuell (Überweisung)** | Admin: „Zahlung eingegangen“ → `adminMarkQuotePaid` mit `payment_method` + optionaler Notiz |

Nach `paid`: `fulfillment_status = angenommen`, E-Mail `quote_paid`, erster Eintrag in `quote_fulfillment_events`.

### Fulfillment-Workflow (nur bei `status = paid`)

Schritte in Reihenfolge (`lib/konfigurator/fulfillment-status.ts`):

1. `angenommen` (automatisch bei Zahlung)
2. `vorbereitet`
3. `verpackt` – Label „Zusammengepackt“; vollständige Lager-Zuweisung (Gruppen + Chargen + Basis) Pflicht vor `bedruckt` und Lagerlabels
4. `bedruckt` – **nur** wenn `config_json.druck = true`; physisch **nach** Zusammenpacken
5. `versand_beauftragt` – Tracking-Nummer + Versand-Dienstleister (UPS/DHL/TNT) Pflicht
6. `versandt`
7. `ruecksendung_angekommen`
8. `zurueckgepackt` – optional Rückgabe-Buchung (`return_booking_id`) über Booking-Modal

Pro Schritt: **Kundenkommentar** (optional, erscheint automatisch in der Mail vor der Signatur), **interne Notiz** (nur Backend/Historie), optionale Kunden-Mail aus `email_templates` (`fulfillment_*`), Historie in `quote_fulfillment_events`.

### Relevante Dateien

| Datei | Zweck |
|-------|--------|
| `lib/actions/quotes.ts` | Freigabe, Ablehnung, `adminMarkQuotePaid`, Mail-Vorschau |
| `lib/actions/fulfillment.ts` | Schrittwechsel, Events, Tracking, Versand-Dienstleister |
| `lib/actions/email-templates.ts` | CRUD für `email_templates` |
| `lib/konfigurator/email-template-render.ts` | Platzhalter `{{…}}`, automatisches Einfügen von Kundenkommentaren (`appendCustomerCommentToEmail`) |
| `lib/konfigurator/email-html.ts` | URL-Normalisierung, Plain-Text-Klammern, HTML-Linktexte (`buildEmailBodies`) |
| `lib/konfigurator/email.ts` | Resend-Versand aller Transaktions-Mails (`text` + `html`) |
| `scripts/test-email-links.ts` | Regressionstest: Status-/Zahlungs-URLs in allen Kunden-Mails |
| `lib/konfigurator/fulfillment-timing.ts` | Fälligkeitsberechnung, Dringlichkeit, Sortierung offener Aufträge |
| `lib/konfigurator/versand-dienstleister.ts` | UPS/DHL/TNT-Optionen |
| `lib/konfigurator/kontakt-adresse.ts` | Firmenadresse, PLZ für Status-Zugang |
| `lib/konfigurator/plz.ts` | PLZ-Hilfsfunktionen (client-sicher) |
| `lib/konfigurator/angebot-access.ts` | Server: Cookie-Zugang nach PLZ-Prüfung |
| `components/angebot/plz-gate.tsx` | PLZ-Eingabe (Kunde) |
| `components/angebot/angebot-status-view.tsx` | Status-UI inkl. Fulfillment-Timeline |
| `app/api/angebot/[token]/unlock/route.ts` | PLZ-Unlock-API |
| `components/admin/quote-approval-actions.tsx` | Freigabe-UI |
| `components/admin/quote-payment-actions.tsx` | Manueller Zahlungseingang |
| `components/admin/quote-fulfillment-workflow.tsx` | Stepper + Kundenkommentar + interne Notiz + Historie + Versand-Dienstleister |
| `components/admin/quote-warehouse-panel.tsx` | Lager & Bestand: Chargen-Split, Vorschlag, Basis-Zuweisung |
| `lib/actions/quote-warehouse.ts` | Zuweisung speichern, `isQuoteWarehouseReadyForPrint` |
| `lib/actions/quote-booking.ts` | Verkaufsbuchung / Reservierung, `ensureQuoteBooking` |
| `lib/konfigurator/band-allocation.ts` | Chargen-Vorschlag (`suggestBandAllocation`) |
| `components/admin/upcoming-fulfillment-orders.tsx` | Prioritäts-Karte (3 dringendste Aufträge) auf `/admin/anfragen` |
| `components/admin/quote-offer-pdf-upload.tsx` | sevDesk-Angebot + PDF-Upload |
| `components/admin/email-template-editor.tsx` | Template-Editor |

Details zum sevDesk-Ablauf: **`docs/sevdesk-angebote.md`**

---

## 6. Dateien dieses Migrationspakets

| Datei | Zweck |
|-------|--------|
| `scripts/migration/01-schema.sql` | Konsolidiertes Basisschema |
| `scripts/migration/02`–`20-*.sql` | Inkrementelle Feature-Migrationen |
| `scripts/migration/02-export-data.js` | Exportiert alle Daten als `INSERT`-SQL |
| `docs/konfigurator.md` | Fachliche Konfigurator-Dokumentation |
| `docs/sevdesk-angebote.md` | sevDesk-Angebote: wann erstellt, PDF an Kunden |
| `docs/TODO.md` | Offene Betriebs-, Sicherheits- und Rechtstasks |
| `lib/contact-emails.ts` | E-Mail-Domain-Konstanten (B2B-Firma vs. BraceLED-Absender) |
| `MIGRATION.md` | Dieser Leitfaden |

> Historische Einzelskripte unter `scripts/` bleiben als Referenz; Neuinstallationen nutzen `01-schema.sql` + `02`–`15` oder `pnpm db:migrate`.
