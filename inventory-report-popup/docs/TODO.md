# TODO – Sicherheit, Betrieb & Restarbeiten

Stand: Juli 2026 (Fulfillment-Fälligkeit, Versand-Dienstleister, PLZ-Split)

## Kritisch (vor Go-Live)

- [ ] **Secrets rotieren** – alle als kompromittiert behandeln (siehe `docs/SECURITY-ROTATION.md`)
  - Neon DB-Passwort
  - `WRISTLINK_PASSWORD` / `WRISTLINK_SESSION_SECRET` (neu gesetzt – nach Rotation ersetzen)
  - `WRISTLINK_API_KEY`
  - Telegram Bot Token + `TELEGRAM_WEBHOOK_SECRET`
  - n8n API Key / JWT
  - Anthropic API Key
  - `RESEND_API_KEY`
  - `SEVDESK_API_TOKEN`
  - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
  - Vercel OIDC Token (falls genutzt)
- [x] **Vercel Production-Env** (Stand: gesetzt via CLI)
  - [x] `NEXT_PUBLIC_APP_URL=https://braceled-led-armband.com`
  - [x] `WRISTLINK_API_URL=https://braceled-led-armband.com`
  - [x] `WRISTLINK_PASSWORD`
  - [x] `WRISTLINK_SESSION_SECRET` (getrennt vom Login-Passwort)
  - [x] `WRISTLINK_API_KEY`
  - [x] `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`
  - [x] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - [x] `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TEAM_NOTIFICATION_EMAIL`
  - [x] `SEVDESK_API_TOKEN`, `SEVDESK_CONTACT_PERSON_ID`, `SEVDESK_DEFAULT_PART_ID`
  - [x] `DATABASE_URL` (+ Neon/Postgres-Varianten via Vercel Integration)
- [x] **DB-Migrationen 01–13** auf Production: `pnpm db:migrate` (inkl. `13-email-templates-v2.sql`)
- [ ] **DB-Migration 14** auf Production: `14-versand-dienstleister.sql` (`versand_dienstleister` in Fulfillment)
- [ ] **Resend:** Domain `braceled-led-armband.com` verifizieren (SPF/DKIM), DOI-Testmail senden
- [ ] **Telegram-Webhook registrieren/aktualisieren:** `pnpm telegram:webhook`
- [ ] **Redeploy** auf Vercel (Env-Änderungen erst nach Deploy aktiv)

## Recht / DSGVO (Juli 2026)

- [x] Impressum, Datenschutz, AGB (B2B) – `/impressum`, `/datenschutz`, `/agb`
- [x] Footer-Links auf Landingpage
- [x] B2B-Pflicht-Checkbox im E-Mail-Gate
- [x] Marketing-Einwilligung erst nach Double-Opt-In (Migration 11)
- [x] E-Mail-Domains vereinheitlicht (`lib/contact-emails.ts`)
- [x] Testimonials bereinigt (Anwendungsbeispiele, keine Fake-Sterne)
- [x] Testmode-Button nur in Development sichtbar
- [ ] **AGB juristisch prüfen lassen** (Standardvorlage, kein Ersatz für Anwalt)
- [ ] **AV-Verträge** mit Vercel, Resend, Neon, Upstash dokumentiert/finalisiert
- [ ] Cookie-Hinweis bei künftigem Analytics-Tracking (derzeit kein Tracking aktiv)

### E-Mail-Schema

| Zweck | Domain |
|-------|--------|
| Allgemein (info, legal, datenschutz) | `@wirkung-digital.de` |
| Konfigurator / Absender / Team-Mails | `@braceled-led-armband.com` |

Zentrale Konstanten: `lib/contact-emails.ts` · Consent-Texte: `lib/konfigurator/consent.ts` (Version 1.4)

## Sicherheit – Code-Restlücken (mittel)

- [x] `approveQuoteRequest` / `rejectQuoteRequest` / `cancelQuoteRequest` hinter Auth kapseln → `lib/quotes-internal.ts`
- [x] `getCalendarData()` mit `ensureAuthed()` absichern
- [x] `requireRole()` prüft jetzt tatsächlich Rollen (Single-Admin: immer ADMIN)
- [ ] Echtes Multi-User-Rollenmodell + Audit-Log (DB-Tabelle) – später
- [x] Rate-Limiting: Upstash Redis optional (`UPSTASH_REDIS_REST_*`), sonst In-Memory-Fallback
- [x] `KONFIGURATOR_TESTMODE_ENABLED=false` in Production: Build bricht ab wenn `true`

## Betrieb / Verifikation

- [ ] Login testen: `/login` → `/warenverwaltung`
- [ ] Konfigurator: vollständige Firmenadresse (Straße, PLZ, Ort) + PLZ-Hinweis als Status-Zugang
- [ ] Kunden-Statusseite `/angebot/[token]`: PLZ-Gate, Fulfillment-Timeline, Zahlungslink
- [ ] Admin-Anfragen: Freigabe mit/ohne Stripe, Mail-Vorschau
- [ ] Admin-Anfragen: nächste 3 gebuchte Aufträge mit Fälligkeit (überfällig/heute/in X Tagen) und nächstem Schritt
- [ ] Manueller Zahlungseingang → Fulfillment startet (`angenommen`)
- [ ] Fulfillment-Schritte + Kunden-Mails (inkl. Versand-Dienstleister, Migration 14)
- [ ] E-Mail-Templates unter `/admin/einstellungen/e-mails` (Migration 13: kundenfreundliche Texte + `{{status_url}}`)
- [ ] Rückgabe-Buchung bei `zurueckgepackt`
- [ ] Landing testen: `/` (Impressum, Datenschutz, AGB im Footer)
- [ ] Telegram Freigabe/Ablehnung End-to-End testen
- [ ] Stripe-Webhook in Production testen
- [ ] sevDesk „In sevDesk erstellen“ testen
- [ ] DB-Indizes verifizieren: `pnpm db:indexes`

## Geplant / später

- [x] **Sevdesk API** – Angebotserstellung im Admin – Doku: `docs/sevdesk-angebote.md`
- [ ] TypeScript: `stripe_event_id` auf `QuoteRequest`-Typ (falls noch offen)
- [ ] Impressum/Datenschutz/AGB optional in Nav sichtbarer machen
- [ ] Optional: `LEAD_SESSION_SECRET` separat setzen (Fallback: `WRISTLINK_PASSWORD`)
- [ ] Optional: Upstash Redis für Rate-Limiting in Production

## Erledigt (Referenz)

- [x] Paket A–F: Security, Performance, Routing, CSP
- [x] Fulfillment-Workflow (Migration 09, Admin-UI, Schritt-Mails)
- [x] E-Mail-Templates im Admin editierbar
- [x] Freigabe mit/ohne Stripe, manueller Zahlungseingang
- [x] Buchung erst bei Zahlung (nicht bei Freigabe)
- [x] Login-Fix: kein `env`-Block in `next.config`, `pnpm dev` mit `env -u WRISTLINK_PASSWORD`
- [x] `lib/auth-core.ts` aus Server Actions ausgelagert
- [x] DSGVO-Baseline Landing + Konfigurator (Juli 2026)
- [x] Migration 11: `b2b_confirmed`, `marketing_consent_pending`
- [x] Migration 12: `sevdesk_order_id`, `sevdesk_order_number`
- [x] Migration 13: überarbeitete Kunden-E-Mail-Texte (`13-email-templates-v2.sql`)
- [x] Kunden-Statusseite `/angebot/[token]` mit PLZ-Schutz (Firmen-PLZ aus `kontaktPlz`)
- [x] Kontaktdaten im Konfigurator: Firma, Straße, PLZ, Ort (PLZ = Zugangscode Statusseite)
- [x] Vercel Production-Env via CLI (Juli 2026)
- [x] Admin-Anfragen: Prioritäts-Karte „Nächste Aufträge in Bearbeitung“ (3 dringendste `paid`-Aufträge, Fälligkeit + nächster Fulfillment-Schritt) – `lib/konfigurator/fulfillment-timing.ts`, `components/admin/upcoming-fulfillment-orders.tsx`
- [x] Versand-Dienstleister (UPS/DHL/TNT) im Fulfillment-Workflow – Migration 14
- [x] PLZ-Hilfsfunktionen in `lib/konfigurator/plz.ts` ausgelagert (Server/Client-Split, Fix Build 500 auf Konfigurator/Legal-Pages)
- [x] Smoke-Test lokal: `pnpm build` grün, Unit-Tests (Fulfillment-Timing, Lieferzeit, Preis-Engine), Routen `/`, `/login`, `/konfigurator`, `/impressum`, `/datenschutz`, `/agb` → 200

## Nützliche Befehle

```bash
cd inventory-report-popup
pnpm dev                  # lokal http://localhost:3000
pnpm build                # Production-Build (Dev-Server vorher stoppen – .next-Konflikt)
pnpm db:migrate           # alle Migrationen 01–14
pnpm db:indexes           # Performance-Indizes
npx tsx scripts/test-fulfillment-timing.ts  # Fälligkeitslogik
npx tsx scripts/test-lieferzeit.ts          # Lieferpaket/Legacy-Lieferzeit
pnpm test:preis-engine    # Preisberechnung
pnpm telegram:webhook     # Telegram-Webhook setzen
vercel env ls production  # Vercel-Env prüfen
vercel --prod             # Production-Deploy
```
