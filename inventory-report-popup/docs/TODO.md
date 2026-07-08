# TODO – Sicherheit, Betrieb & Restarbeiten

Stand: Juli 2026 (nach Fulfillment-/E-Mail-Workflow + Login-Fix)

## Kritisch (vor Go-Live)

- [ ] **Secrets rotieren** – alle als kompromittiert behandeln (siehe `docs/SECURITY-ROTATION.md`)
  - Neon DB-Passwort
  - `WRISTLINK_PASSWORD` / `WRISTLINK_SESSION_SECRET`
  - `WRISTLINK_API_KEY`
  - Telegram Bot Token + `TELEGRAM_WEBHOOK_SECRET`
  - n8n API Key / JWT
  - Anthropic API Key
  - Vercel OIDC Token (falls genutzt)
- [ ] **Vercel Production-Env setzen**
  - `WRISTLINK_PASSWORD` (in Vercel setzen – nicht leer lassen)
  - `WRISTLINK_SESSION_SECRET` (`openssl rand -hex 32`, getrennt vom Login-Passwort)
  - `TELEGRAM_WEBHOOK_SECRET` (Pflicht – ohne Secret antwortet Webhook mit 401)
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - `DATABASE_URL` / `NEON_DATABASE_URL`
  - `RESEND_API_KEY` (für Freigabe-/Fulfillment-Mails)
- [ ] **DB-Migration 09** auf Production: `npm run db:migrate` (Fulfillment + E-Mail-Templates)
- [ ] **Telegram-Webhook neu registrieren** nach Secret-Rotation: `npm run telegram:webhook`
- [ ] **Neu deployen** auf Vercel

## Sicherheit – Code-Restlücken (mittel)

- [x] `approveQuoteRequest` / `rejectQuoteRequest` / `cancelQuoteRequest` hinter Auth kapseln (nur intern/Webhook, nicht als offene Server Actions) → `lib/quotes-internal.ts`
- [x] `getCalendarData()` mit `ensureAuthed()` absichern
- [x] `requireRole()` prüft jetzt tatsächlich Rollen (Single-Admin: immer ADMIN)
- [ ] Echtes Multi-User-Rollenmodell + Audit-Log (DB-Tabelle) – später
- [x] Rate-Limiting: Upstash Redis optional (`UPSTASH_REDIS_REST_*`), sonst In-Memory-Fallback
- [x] `KONFIGURATOR_TESTMODE_ENABLED=false` in Production: Build bricht ab wenn `true`

## Betrieb / Verifikation

- [ ] Login testen: `/login` → `/warenverwaltung` (Passwort in `.env.local`, Hard-Refresh nach Rebuild)
- [ ] Admin-Anfragen: Freigabe mit/ohne Stripe, Mail-Vorschau
- [ ] Manueller Zahlungseingang → Fulfillment startet (`angenommen`)
- [ ] Fulfillment-Schritte + Kunden-Mails
- [ ] E-Mail-Templates unter `/admin/einstellungen/e-mails`
- [ ] Rückgabe-Buchung bei `zurueckgepackt`
- [ ] Landing testen: `/` (nicht mehr Dashboard)
- [ ] Telegram Freigabe/Ablehnung End-to-End testen (nach Webhook-Secret)
- [ ] Stripe-Webhook in Production testen
- [ ] DB-Indizes verifizieren: `npm run db:indexes`

## Geplant / später

- [ ] **Sevdesk API** – Rechnungsstellung (bewusst zurückgestellt)
- [ ] TypeScript: `stripe_event_id` auf `QuoteRequest`-Typ (falls noch offen)

## Erledigt (Referenz)

- [x] Paket A–F: Security, Performance, Routing, CSP
- [x] Fulfillment-Workflow (Migration 09, Admin-UI, Schritt-Mails)
- [x] E-Mail-Templates im Admin editierbar
- [x] Freigabe mit/ohne Stripe, manueller Zahlungseingang
- [x] Buchung erst bei Zahlung (nicht bei Freigabe)
- [x] Login-Fix: kein `env`-Block in `next.config`, `npm run dev` mit `env -u WRISTLINK_PASSWORD`
- [x] `lib/auth-core.ts` aus Server Actions ausgelagert

## Nützliche Befehle

```bash
cd inventory-report-popup
npm run dev                 # lokal http://localhost:3000
npm run build               # Production-Build prüfen
npm run db:migrate          # alle Migrationen 01–09
npm run db:indexes          # Performance-Indizes
npm run telegram:webhook    # Telegram-Webhook setzen
```
