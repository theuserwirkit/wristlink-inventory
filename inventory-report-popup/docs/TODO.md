# TODO – Sicherheit, Betrieb & Restarbeiten

Stand: Juli 2026 (nach DSGVO/Recht + E-Mail-Domains + Migration 11)

## Kritisch (vor Go-Live)

- [ ] **Secrets rotieren** – alle als kompromittiert behandeln (siehe `docs/SECURITY-ROTATION.md`)
  - Neon DB-Passwort
  - `WRISTLINK_PASSWORD` / `WRISTLINK_SESSION_SECRET`
  - `WRISTLINK_API_KEY`
  - Telegram Bot Token + `TELEGRAM_WEBHOOK_SECRET`
  - n8n API Key / JWT
  - Anthropic API Key
  - `RESEND_API_KEY`
  - `SEVDESK_API_TOKEN`
  - Vercel OIDC Token (falls genutzt)
- [ ] **Vercel Production-Env vervollständigen**
  - [x] `NEXT_PUBLIC_APP_URL=https://braceled-led-armband.com`
  - [x] `WRISTLINK_API_URL=https://braceled-led-armband.com` (für n8n)
  - [x] `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TEAM_NOTIFICATION_EMAIL`
  - [ ] `WRISTLINK_PASSWORD` (in Vercel setzen – nicht leer lassen)
  - [ ] `WRISTLINK_SESSION_SECRET` (`openssl rand -hex 32`, getrennt vom Login-Passwort)
  - [ ] `TELEGRAM_WEBHOOK_SECRET` (Pflicht – ohne Secret antwortet Webhook mit 401)
  - [ ] `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - [ ] `DATABASE_URL` / `NEON_DATABASE_URL` (bereits via Vercel/Neon)
  - [x] `SEVDESK_*` (Token + IDs)
- [x] **DB-Migrationen 01–12** auf Production: `pnpm db:migrate` (inkl. Consent-DOI + sevDesk)
- [ ] **Resend:** Domain `braceled-led-armband.com` verifizieren (SPF/DKIM), Absender `angebote@` testen
- [ ] **Telegram-Webhook neu registrieren** nach Secret-Rotation: `pnpm telegram:webhook`
- [ ] **Neu deployen** auf Vercel (nach Env-Änderungen)

## Recht / DSGVO (Juli 2026)

- [x] Impressum, Datenschutz, AGB (B2B) – Seiten `/impressum`, `/datenschutz`, `/agb`
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
- [ ] Konfigurator: E-Mail-Gate (B2B-Checkbox, DOI, Marketing optional)
- [ ] Admin-Anfragen: Freigabe mit/ohne Stripe, Mail-Vorschau
- [ ] Manueller Zahlungseingang → Fulfillment startet (`angenommen`)
- [ ] Fulfillment-Schritte + Kunden-Mails
- [ ] E-Mail-Templates unter `/admin/einstellungen/e-mails`
- [ ] Rückgabe-Buchung bei `zurueckgepackt`
- [ ] Landing testen: `/` (Impressum, Datenschutz, AGB im Footer)
- [ ] Telegram Freigabe/Ablehnung End-to-End testen
- [ ] Stripe-Webhook in Production testen
- [ ] sevDesk „In sevDesk erstellen“ testen
- [ ] DB-Indizes verifizieren: `pnpm db:indexes`

## Geplant / später

- [x] **Sevdesk API** – Angebotserstellung im Admin (`In sevDesk erstellen` + PDF-Speicherung) – Doku: `docs/sevdesk-angebote.md`
- [ ] TypeScript: `stripe_event_id` auf `QuoteRequest`-Typ (falls noch offen)
- [ ] Impressum/Datenschutz/AGB optional in Nav sichtbarer machen

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

## Nützliche Befehle

```bash
cd inventory-report-popup
pnpm dev                  # lokal http://localhost:3000
pnpm build                # Production-Build prüfen
pnpm db:migrate           # alle Migrationen 01–12
pnpm db:indexes           # Performance-Indizes
pnpm telegram:webhook     # Telegram-Webhook setzen
```
