# TODO – Sicherheit, Betrieb & Restarbeiten

Stand: 14. Juli 2026 (Freigabe-Fix, Fulfillment-Kommentare, Migration 18)

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
  - [x] `NEXT_PUBLIC_APP_URL=https://braceled-led-armband.com` (ohne Zeilenumbruch am Ende – sonst Stripe „Not a valid URL“)
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
- [x] **DB-Migrationen 14–16** auf Production (verifiziert 14.07.2026 – Subagent [DB-Migration](002fc1ed-495c-46ad-9026-69e116ae7fc2))
  - [x] `14-versand-dienstleister.sql` – Spalte `versand_dienstleister` auf `quote_requests` + `quote_fulfillment_events`
  - [x] `15-email-templates-du.sql` – E-Mail-Vorlagen Du-Ansprache (überschreibt Admin-Texte aus Migration 13!)
  - [x] `16-users-auth.sql` – Tabelle `users` für Multi-User-Login (1 Admin-User angelegt)
- [x] **DB-Migrationen 17–18** auf Production (14.07.2026)
  - [x] `17-email-templates-angebot.sql` – Freigabe-Mails: Menge, Eventdatum, Lieferort
  - [x] `18-fulfillment-comments.sql` – `internal_note` auf `quote_fulfillment_events`, `{{kommentar}}` aus Templates entfernt
- [ ] **Resend:** Domain `braceled-led-armband.com` verifizieren (SPF/DKIM), DOI-Testmail senden
- [ ] **Telegram-Webhook registrieren/aktualisieren:** `pnpm telegram:webhook`
- [x] **Redeploy** auf Vercel – Auto-Deploy via `git push origin main` (14.07.2026 verifiziert)

## Recht / DSGVO (Juli 2026)

- [x] Impressum, Datenschutz, AGB (B2B) – `/impressum`, `/datenschutz`, `/agb`
- [x] Footer-Links auf Landingpage
- [x] B2B-Pflicht-Checkbox im E-Mail-Gate
- [x] Marketing-Einwilligung erst nach Double-Opt-In (Migration 11)
- [x] E-Mail-Domains vereinheitlicht (`lib/contact-emails.ts`)
- [x] Testimonials bereinigt (Anwendungsbeispiele, keine Fake-Sterne)
- [x] Testmode-Button nur in Development sichtbar
- [ ] **AGB juristisch prüfen lassen** (Entwurf, kein Ersatz für Anwalt) – siehe Abschnitt „AGB-Review“ unten
- [x] **AGB-Inhalt** an Geschäftsmodell anpassen – Subagent Juli 2026: `app/agb/page.tsx` (17 Abschnitte) + `docs/agb-review.md` (Gap-Analyse, 15-Punkte-Checkliste)
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

### Smoke-Test (automatisiert + manuell)

**Automatisiert** (lokal, vor jedem Deploy):

```bash
cd inventory-report-popup
pnpm build
pnpm test:preis-engine
npx tsx scripts/test-fulfillment-timing.ts
npx tsx scripts/test-lieferzeit.ts
# Dev-Server stoppen, dann:
pnpm start &
sleep 3
for route in / /login /konfigurator /impressum /datenschutz /agb \
  /warenverwaltung /warenverwaltung/buchungen /warenverwaltung/auftraege /kalender; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
  echo "$route → $code"
done
```

Erwartung: Build grün, Unit-Tests ohne Fehler, öffentliche Routen → `200` oder `307` (Auth-Redirect bei `/warenverwaltung*`).

- [x] Smoke-Test lokal (Build + Unit-Tests + Routen) – Subagent [Smoke-Test](94596ae0-7eb4-4c63-9832-53f1c0776fcd), 14.07.2026 grün
- [x] Smoke-Test nach Operations-Refactoring (neue Tabs Aufträge/Buchungen) – `/warenverwaltung/*` → 307

**Manuell** (E2E mit Login/Stripe/Telegram):

- [ ] Login testen: `/login` → `/warenverwaltung`
- [ ] Konfigurator: vollständige Firmenadresse (Straße, PLZ, Ort) + PLZ-Hinweis als Status-Zugang
- [x] Anfrage-Bestätigungs-Mail: Status-Link (`/angebot/[token]`) in HTML vollständig anklickbar (kein Zeilenumbruch mitten in der URL)
- [ ] Freigabe-/Fulfillment-Mails: Status-Link als „Angebot und Status öffnen“ anklickbar (nach Deploy + Migration 17)
- [ ] Kunden-Statusseite `/angebot/[token]`: PLZ-Gate, Fulfillment-Timeline, Zahlungslink
- [x] Admin-Anfragen: Freigabe mit/ohne Stripe, Mail-Vorschau (14.07.2026 – inkl. Stripe-Checkout-Fix)
- [ ] Admin-Anfragen: nächste 3 gebuchte Aufträge mit Fälligkeit (überfällig/heute/in X Tagen) und nächstem Schritt
- [ ] Manueller Zahlungseingang → Fulfillment startet (`angenommen`)
- [x] Fulfillment-Schritte + Kunden-Mails (inkl. Versand-Dienstleister, Migration 14; Kundenkommentar auto, interne Notiz, Migration 18)
- [ ] E-Mail-Templates unter `/admin/einstellungen/e-mails` (Migration 17: Freigabe-Texte mit Menge/Event/Lieferort; URL-Fix in Code)
- [ ] Rückgabe-Buchung bei `zurueckgepackt`
- [ ] Landing testen: `/` (Impressum, Datenschutz, AGB im Footer)
- [ ] Telegram Freigabe/Ablehnung End-to-End testen
- [ ] Stripe-Webhook in Production testen
- [ ] sevDesk „In sevDesk erstellen“ testen
- [ ] DB-Indizes verifizieren: `pnpm db:indexes`

### DB-Migration Production

`pnpm db:migrate` führt **alle** Skripte 01–18 idempotent aus (`scripts/run-migrations.mjs`).

**Vor dem Lauf:**

1. Backup/Snapshot in Neon erstellen (Console → Branches oder Point-in-Time)
2. Prüfen welche Migrationen schon gelaufen sind (Spalten/Tabellen existieren?)
3. **Migration 15** überschreibt `email_templates` – ggf. Admin-Anpassungen vorher exportieren/notieren
4. **Migration 16** legt `users`-Tabelle an – nur aktivieren wenn Multi-User-Login gewünscht

**Production ausführen** (Credentials aus `.env.production.local`, nicht committen):

```bash
cd inventory-report-popup
set -a && source .env.production.local && set +a
pnpm db:migrate
pnpm db:indexes
```

**Nach dem Lauf verifizieren:**

```bash
# Spalte versand_dienstleister vorhanden?
psql "$DATABASE_URL" -c "\d quote_requests" | grep versand_dienstleister
# users-Tabelle (falls Migration 16)
psql "$DATABASE_URL" -c "\d users"
```

- [x] Backup Neon vor Migration (bereits migriert vor erneutem Lauf)
- [x] Migration 17–18 auf Production – idempotent bestätigt
- [x] `pnpm db:indexes` auf Production

### AGB-Review

Aktuelle Seite: `app/agb/page.tsx` (17 Abschnitte, Stand Juli 2026) · Review: `docs/agb-review.md` · Referenz: `app/impressum/page.tsx`, `app/datenschutz/page.tsx`

**Subagent-Ergebnis (Juli 2026):** Gap-Analyse, 15-Punkte-Anwalts-Checkliste und Risiko-Matrix in `docs/agb-review.md`. AGB-Entwurf erweitert um Miete/Kauf, Verfügbarkeit/Hold, Lieferpakete, Fulfillment, Rückgabe, Schäden/Verspätung/Batterie, Stripe, Eigentumsvorbehalt, Gewährleistung B2B, Widerruf/Storno, Streitbeilegung. Disclaimer-Banner: kein Ersatz für anwaltliche Prüfung.

**Offene Punkte für Anwalt** (Details in `docs/agb-review.md`):

- Konkrete Verzugspauschalen und Ersatzwerte bei Schaden/Verlust
- Zulässigkeit 12-Monats-Verjährung und § 377 HGB Rügepflicht
- Haftungsobergrenze und Event-Ausfall / technisches Versagen
- Storno kurz vor Event (Anzahlung, Produktionskosten)
- Batterietausch – Kostenverteilung und Fristen
- Gerichtsstand / Rechtswahl bei Kunden außerhalb Deutschlands
- Aufrechnungs-/Zurückbehaltungsverbot – Formulierung
- Bedruckung – Freistellung Marken-/Urheberrecht
- Abgleich mit Stripe-AGB und AV-Verträgen (Vercel, Resend, Neon)
- Techniker-Leistungen – Werk- vs. Dienstvertrag

- [x] AGB-Entwurf + Checkliste – `docs/agb-review.md` (Gap-Analyse, 15 Anwalts-Punkte, Risiko-Matrix)
- [x] `app/agb/page.tsx` auf 17-Abschnitte-Entwurf umgesetzt
- [ ] AGB durch Fachanwalt prüfen lassen

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
- [x] Smoke-Test lokal: `pnpm build` grün, Unit-Tests, alle Routen inkl. `/warenverwaltung/auftraege`, `/buchungen` (14.07.2026)
- [x] E-Mail-Links: HTML-Version mit durchgängigen `<a>`-Tags für Status-/Zahlungs-URLs (`lib/konfigurator/email-html.ts`, Fix Zeilenumbruch in Plain-Text-Mails, 14.07.2026)
- [x] E-Mail-URLs zentral geprüft: alle Templates mit `{{status_url}}` + Anfrage-Bestätigung (`scripts/test-email-links.ts`, kurze HTML-Linktexte, 14.07.2026)
- [x] Migration 17: Freigabe-Mails mit Menge, Eventdatum, Lieferort (`17-email-templates-angebot.sql`)
- [x] Freigabe-Button: E-Mail-Versand asynchron (`after()`), Fehlerbehandlung im UI, kein hängender Ladekreis (14.07.2026)
- [x] Stripe-Freigabe: `NEXT_PUBLIC_APP_URL` trimmen + Vercel-Env ohne Zeilenumbruch (Fix „Not a valid URL“, 14.07.2026)
- [x] Fulfillment: Kundenkommentar automatisch vor Signatur; `{{kommentar}}` aus Templates; Feld „Interne Notiz“ pro Schritt (Migration 18, 14.07.2026)
- [x] Vercel-Deploy-Doku: `git push origin main` für Auto-Deploy; `vercel --prod` nur vom Repo-Root

## Nützliche Befehle

```bash
cd inventory-report-popup
pnpm dev                  # lokal http://localhost:3000
pnpm build                # Production-Build (Dev-Server vorher stoppen – .next-Konflikt)
pnpm db:migrate           # alle Migrationen 01–18
pnpm db:indexes           # Performance-Indizes
npx tsx scripts/test-fulfillment-timing.ts  # Fälligkeitslogik
npx tsx scripts/test-email-links.ts         # Status-/Zahlungs-URLs in Kunden-Mails
npx tsx scripts/test-lieferzeit.ts          # Lieferpaket/Legacy-Lieferzeit
pnpm test:preis-engine    # Preisberechnung
pnpm telegram:webhook     # Telegram-Webhook setzen
vercel env ls production  # Vercel-Env prüfen (aus Repo-Root, siehe unten)

# Deploy (Monorepo: Root Directory in Vercel = inventory-report-popup)
git push origin main      # Auto-Deploy auf Production (braceled-led-armband.com)
cd .. && vercel --prod    # Manuell vom Repo-Root – NICHT aus inventory-report-popup/
```
