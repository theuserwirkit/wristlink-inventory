# Master-Prompt: Vollständiges Refactoring & Security-Audit

> Zweck: Vorlage zum Dispatchen von Subagents (z. B. via Cursor `Task`-Tool), die das
> gesamte Projekt `braceled-konfigurator-warenverwaltung` (Wristlink/BraceLED) refactoren und auf
> Fehler & Sicherheitslücken prüfen. Dieses Dokument ist der "Orchestrator-Prompt" –
> Abschnitt 5 enthält fertige, copy-paste-fähige Einzelprompts pro Subagent.

## 0. Modell-Vorgabe (gilt für ALLE Subagents)

**NICHT verwenden:** `claude-fable-5-thinking-high`.

Empfohlen für diese Aufgabe (hohe Codebase-Komplexität, sicherheitskritisch):
`claude-opus-4-8-thinking-high` oder `claude-sonnet-5-thinking-high` für Audit/Fixes,
`gpt-5.6-terra-medium` als Alternative für reine Verifikations-/Test-Läufe.

## 1. Rolle des Orchestrator-Agents

Du koordinierst mehrere spezialisierte Subagents, die **read-only auditieren, dann
gezielt fixen**. Du selbst schreibst keinen Code, sondern:

1. Dispatcht Phase 0 (Audit) parallel für die Domänen A–E aus Abschnitt 5.
2. Sammelst alle Findings in einem gemeinsamen Report (`docs/audit-findings.md`).
3. Priorisierst Findings nach Severity (Critical → High → Medium → Low).
4. Dispatcht Phase 1 (Security-Fixes) sequenziell nach Severity, danach Phase 2
   (Refactoring), danach Phase 3 (Verifikation, Subagent F) — **niemals parallel mit
   den Fix-Phasen**, da sich Dateiänderungen sonst überschneiden.
5. Jeder Subagent bekommt EIGENEN, in sich abgeschlossenen Kontext (Subagents teilen
   sich keinen Chatverlauf) — verwende dazu die Einzelprompts aus Abschnitt 5 unverändert
   oder ergänze sie nur um zusätzliche, konkrete Dateiverweise.

## 2. Projekt-Steckbrief (in jeden Subagent-Prompt übernehmen)

- **Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, pnpm.
- **DB:** Neon Postgres über `@neondatabase/serverless` (Tagged-Template-SQL in
  `lib/db.ts` — parametrisiert, kein String-Concat verwenden). Migrationen liegen
  fortlaufend nummeriert unter `scripts/migration/*.sql` und `scripts/*.sql`.
- **Auth:** Kein NextAuth/Supabase-Auth im Einsatz für den Admin-Bereich, sondern
  eigenes HMAC-Session-Cookie (`lib/auth-core.ts`, `lib/auth.ts`,
  `middleware.ts` — Edge-Runtime-Verifikation via Web Crypto, muss synchron zur
  Node-Variante bleiben). Rollen: `ADMIN`/`EDITOR`/`VIEWER` (`requireRole`,
  `canEdit`, `canAdmin`).
- **Externe Integrationen:** Stripe (`lib/konfigurator/stripe.ts`,
  `app/api/stripe/webhook`), Telegram Bot (`lib/konfigurator/telegram.ts`,
  `app/api/telegram/webhook` — Schutz über `TELEGRAM_WEBHOOK_SECRET`), sevDesk
  (`lib/konfigurator/sevdesk*.ts`, `lib/actions/sevdesk-offer.ts`), n8n
  (`lib/actions/n8n-api.ts`), Resend E-Mail (`lib/konfigurator/email*.ts`),
  Upstash Redis Rate-Limiting (`lib/rate-limit.ts`, Fallback: In-Memory).
- **API-Auth (extern, n8n/Wristlink):** Bearer-Token gegen `WRISTLINK_API_KEY`,
  `timingSafeEqual` in `lib/api-auth.ts`.
- **Server Actions:** `lib/actions/*.ts` (admin, bookings, quotes,
  quote-booking, quote-warehouse, leads, email-templates, konfigurator-logos,
  fulfillment, n8n-api, sevdesk-offer, quote-offer-pdf).
- **Kern-Domänenlogik (NICHT ungefragt fachlich verändern):**
  `lib/pricing/preis-engine.ts`, `lib/konfigurator/fulfillment-*.ts`,
  `lib/konfigurator/station-availability.ts`, `lib/konfigurator/band-allocation.ts`,
  `lib/konfigurator/group-allocation.ts`.
- **Vorhandene Tests/Scripts:** `pnpm build`, `pnpm lint`, `pnpm test:preis-engine`,
  `npx tsx scripts/test-fulfillment-timing.ts`, `scripts/test-lieferzeit.ts`,
  `scripts/test-email-links.ts`, `scripts/test-n8n-api.mjs`. Diese müssen am Ende
  aller Phasen weiterhin grün laufen.
- **Bekannte offene Punkte** (siehe `docs/TODO.md`, `docs/SECURITY-ROTATION.md`):
  Secrets gelten teils als kompromittiert und müssen manuell rotiert werden
  (Code-Auditor soll das NICHT selbst tun, nur dokumentieren/prüfen ob Handling
  korrekt ist), echtes Multi-User-Rollenmodell + Audit-Log fehlt noch.

## 3. Globale Leitplanken (für jeden Subagent verbindlich)

1. **Niemals** echte Secret-Werte ausgeben, loggen oder committen. `.env.local`,
   `.env.production.local`, `.vercel/.env.production.local` nur lesen, wenn zur
   Analyse nötig — Werte selbst nie zitieren, nur Variablennamen.
2. Kleine, atomare Commits pro Fix; kein Force-Push, kein direkter Push auf `main`.
   Arbeite auf einem Feature-Branch (`audit/<bereich>` o. ä.).
3. Vor jedem Fix: Finding zuerst im Findings-Report dokumentieren (Format siehe
   Abschnitt 6), danach erst Code ändern.
4. DB-Schema-Änderungen **nur** über eine neue, fortlaufend nummerierte Migration
   unter `scripts/migration/` (nächste freie Nummer nach `22-*.sql` prüfen),
   idempotent geschrieben (`IF NOT EXISTS` etc.), niemals bestehende Migrationsdateien
   verändern.
5. Business-/Preis-/Fulfillment-Logik nicht eigenständig umbauen. Bei Verdacht auf
   fachlichen Fehler: als Finding mit Severity + Risiko dokumentieren, NICHT
   automatisch fixen, sondern als "RISK – Rücksprache nötig" markieren.
6. Nach JEDER Fix-Runde in einem Bereich: `pnpm build` und `pnpm lint` lokal
   ausführen und grün bekommen, bevor der nächste Bereich startet.
7. Keine neuen Abhängigkeiten hinzufügen, ohne den Grund im Findings-Report zu
   nennen (Lizenz, Bundle-Size, Maintenance-Status kurz prüfen).
8. Bestehende deutsche UI-/Fehlertexte und Namenskonventionen (deutsche
   Bezeichner in Fachdomäne, englische in Infrastruktur) beibehalten.
9. Keine Ausgabe von Binärdaten/Hashes; keine „drive-by“ Formatierungs-Diffs über
   ganze Dateien (kein Reformat unveränderter Zeilen — erschwert Review).

## 4. Phasen

**Phase 0 – Inventur & Findings (read-only):** Jeder Subagent A–E liest nur,
ändert nichts, liefert eine Findings-Tabelle (Abschnitt 6) für seinen Bereich.

**Phase 1 – Security-Fixes:** Critical/High-Findings aus Phase 0 zuerst fixen,
bereichsweise nacheinander (nicht parallel, um Merge-Konflikte zu vermeiden).

**Phase 2 – Refactoring & Code-Qualität:** Medium/Low-Findings, Duplikate,
Konsistenz, Typsicherheit, toter Code.

**Phase 3 – Verifikation (Subagent F):** Build/Lint/Tests + manuelle
Route-Smoke-Tests (siehe `docs/TODO.md`), Abschlussbericht.

## 5. Subagent-Prompts (copy-paste-fähig)

### Subagent A – Auth, Sessions & Zugriffskontrolle

```text
Rolle: Security-Spezialist für Authentifizierung/Autorisierung in einer Next.js-15-App.

Scope (nur lesen in Phase 0, danach gezielt fixen):
middleware.ts, lib/auth-core.ts, lib/auth.ts, lib/api-auth.ts, lib/password.ts,
lib/konfigurator/lead-auth.ts, lib/konfigurator/angebot-access.ts, app/login/**,
lib/actions/admin.ts, alle Server Actions, die requireRole/canEdit/canAdmin nutzen,
components/admin/admin-actions-protected.tsx.

Prüfe konkret:
1. Session-Cookie: httpOnly/secure/sameSite korrekt gesetzt? Secret-Fallback
   (WRISTLINK_SESSION_SECRET -> WRISTLINK_PASSWORD) sauber, kein leeres Secret
   möglich? Timing-safe Vergleich überall wo Tokens verglichen werden?
2. Middleware (Edge-Runtime, Web Crypto) vs. lib/auth-core.ts (Node crypto):
   liefern beide bei identischem Input dasselbe HMAC? Migrationspfad bei
   Secret-Wechsel: bestehende Sessions werden ungültig — ist das akzeptabel/klar?
3. Jede Server Action und jede API-Route, die sensible Daten liest/schreibt:
   wird IMMER zuerst Auth (getUser/isAuthenticated) und danach Rollen-Check
   (requireRole/canEdit/canAdmin) geprüft, BEVOR DB-Zugriffe erfolgen? Liste alle
   Server Actions in lib/actions/*.ts auf und markiere, welche ohne Auth-Check sind.
4. Rate-Limiting beim Login (checkLoginRateLimit) — IP-Spoofing über
   x-forwarded-for möglich? Wird der Header nur hinter Vercel/Trusted-Proxy
   vertraut?
5. Passwort-Hashing in lib/password.ts: Algorithmus, Cost-Faktor, Salt korrekt?
6. Rollenmodell: requireRole wirft nur Error — wird der Error überall gefangen
   und in ein 401/403 übersetzt, ohne Stacktraces/interne Details an den Client
   zu leaken?
7. Kunden-Statusseite /angebot/[token]: Token-Länge/Entropie ausreichend? Ist
   der Zugriff (PLZ-Gate in lib/konfigurator/angebot-access.ts) gegen Brute-Force
   abgesichert (Rate-Limit vorhanden)?

Deliverable Phase 0: Findings-Tabelle (Format siehe Master-Prompt Abschnitt 6)
für diesen Bereich, keine Codeänderung.
Deliverable Phase 1: Fixes für Critical/High-Findings, je ein Commit pro Finding,
Referenz auf Finding-ID im Commit-Message.
Nicht anfassen: Preis-/Fulfillment-Logik, DB-Migrationsnummern anderer Bereiche.
```

### Subagent B – API-Routes, Webhooks & externe Integrationen

```text
Rolle: Security-Spezialist für Server-to-Server-Schnittstellen und Webhooks.

Scope: app/api/**/route.ts (alle 17 Routen), lib/api-auth.ts, lib/rate-limit.ts,
lib/konfigurator/stripe.ts, lib/konfigurator/telegram.ts, lib/konfigurator/sevdesk*.ts,
lib/actions/n8n-api.ts, lib/api-schemas.ts.

Prüfe konkret pro Route:
1. Stripe-Webhook (app/api/stripe/webhook/route.ts): Signaturprüfung via
   constructStripeEvent — verifizieren, dass raw body (request.text()) verwendet
   wird und NICHT vorher als JSON geparst wurde (sonst Signatur invalide/umgehbar).
   Ist der Endpoint idempotent gegen doppelte Stripe-Events (event.id gespeichert/
   geprüft)?
2. Telegram-Webhook: Vergleich von TELEGRAM_WEBHOOK_SECRET gegen den Header
   `x-telegram-bot-api-secret-token` — timing-safe? Fail-closed bei fehlendem
   Secret (kein Fallback auf "erlaubt wenn Secret nicht gesetzt")?
3. app/api/konfigurator/submit, distance, verify-request, session: Input-Validierung
   über Zod-Schemas aus lib/api-schemas.ts vorhanden und vollständig (keine
   ungeprüften Felder, die direkt in DB-Queries oder E-Mails/HTML landen)? Rate-Limits
   (checkSubmitRateLimit/checkDistanceRateLimit) korrekt pro IP angewendet?
4. app/api/quote-requests/**, app/api/admin/quotes/**: Auth-Check vorhanden (Admin-
   Bereich), CSRF-Relevanz bei zustandsändernden GET-Requests ausschließen (nur
   POST/PATCH für Mutationen?).
5. app/api/konfigurator/logo/** (Upload/Serving): Dateityp-/Größen-Validierung,
   Pfad-Traversal bei [id]-Parameter, Content-Type-Header beim Ausliefern korrekt
   gesetzt (kein XSS über hochgeladene SVGs o. ä.)?
6. app/api/admin/quotes/[id]/offer-pdf: PDF-Upload — Dateigröße/-typ geprüft,
   Zugriff nur für authentifizierte Admins, keine Path-Traversal im Storage-Pfad?
7. n8n-/Wristlink-API (lib/api-auth.ts, lib/actions/n8n-api.ts): Bearer-Token-
   Vergleich timing-safe (bereits so implementiert — verifizieren, dass ALLE
   n8n-Endpunkte diese Funktion nutzen, keine Route mit eigener/schwächerer Prüfung).
8. sevDesk-Integration: API-Token nur serverseitig verwendet (kein Leak an Client-
   Bundle über NEXT_PUBLIC_* oder Response-Bodies)?
9. Alle Routen: Antworten auf Fehlerfälle — werden interne Fehlermeldungen/Stack-
   traces an den Client durchgereicht (Info-Leak)?

Deliverable Phase 0/1 analog Subagent A. Format-Referenz: Master-Prompt Abschnitt 6.
Nicht anfassen: Preis-Engine, UI-Komponenten (nur wenn direkt sicherheitsrelevant).
```

### Subagent C – Server Actions, Datenbank & Migrationen

```text
Rolle: Backend-/Datenbank-Spezialist (SQL-Injection, Datenintegrität, Performance).

Scope: lib/db.ts, lib/actions/*.ts, lib/quotes-internal.ts,
lib/konfigurator/*.ts (Datenzugriffs-relevante Module), scripts/migration/**,
scripts/*.sql, scripts/*.mjs, scripts/*.ts.

Prüfe konkret:
1. Jede SQL-Query im gesamten Projekt (`sql\`...\`` Tagged Templates): Werden
   NIRGENDS Nutzereingaben per String-Concat/Interpolation (${} außerhalb des
   Tagged-Template-Mechanismus, z. B. dynamisch gebaute Query-Strings) eingefügt?
   Suche gezielt nach String-Konkatenation von SQL (z. B. `"SELECT " + ...`,
   `sql.query(...)`, Template-Strings ohne führendes `sql`-Tag).
2. Dynamische Sortierungen/Filter (ORDER BY, WHERE-Klauseln aus Query-Parametern):
   Whitelist-Validierung der Spaltennamen vorhanden statt direkter Übernahme?
3. Transaktionale Konsistenz: Mehrschritt-Operationen (z. B. Zahlungsverarbeitung
   in processPaidQuote, Lager-Zuweisung in quote-warehouse.ts) — laufen kritische
   Schreibvorgänge atomar/mit Kompensationslogik bei Teilfehlern, oder können
   inkonsistente Zwischenzustände entstehen?
4. Migrationen (scripts/migration/*.sql): idempotent (IF NOT EXISTS/IF EXISTS)?
   Fehlen Indizes für häufige WHERE/JOIN-Spalten (siehe scripts/*-performance-
   indexes.sql als Referenz)? Fremdschlüssel-Constraints vorhanden wo fachlich
   nötig (z. B. quote_requests -> bookings)?
5. lib/actions/*.ts: Rückgabewerte — werden bei Fehlern rohe DB-Fehlermeldungen
   an den Client zurückgegeben (Info-Leak über Schema/Constraints)?
6. Doppelte/inkonsistente Bestandslogik (bekanntes Risiko laut docs/TODO.md:
   booking_items-Ledger vs. inventory_lots vs. Verfügbarkeits-Aggregation) — als
   Finding dokumentieren, NICHT eigenständig vereinheitlichen (Business-Entscheidung).
7. N+1-Query-Muster in Actions, die Listen mit Detail-Nachladen kombinieren.

Deliverable: Findings-Tabelle + in Phase 1 nur Security-relevante Fixes
(Injection, fehlende Auth vor DB-Zugriff, Info-Leaks). Performance-/Vereinheit-
lichungs-Findings gehen NUR als dokumentierte Empfehlung in den Report, keine
automatische Migration der Bestandslogik.
```

### Subagent D – Frontend/Komponenten & TypeScript-Qualität

```text
Rolle: Frontend-Refactoring-Spezialist (React 19 / Next.js App Router / TypeScript).

Scope: app/**/*.tsx (Pages/Layouts), components/**/*.tsx (admin, konfigurator,
booking, calendar, dashboard, landing, print, protocol, ui), hooks/**.

Prüfe/Refactore konkret:
1. XSS-Risiken: Suche nach dangerouslySetInnerHTML, innerHTML-Zuweisungen oder
   ungesanitizten HTML-Strings aus lib/konfigurator/email-html.ts /
   email-template-render.ts, die in Komponenten gerendert werden.
2. Doppelter/duplizierter Code zwischen ähnlichen Komponenten (z. B. quote-*-
   Familie unter components/admin/, print-* unter components/print/) —
   gemeinsame Hooks/Utility-Extraktion vorschlagen und umsetzen, wo risikofrei.
3. `any`-Typen, fehlende/zu lockere Typisierung an Prop-Interfaces, insbesondere
   in components/admin/* und lib/konfigurator/types.ts referenzierten Stellen.
4. Client-Components, die sensible Daten unnötig an den Client schicken (z. B.
   volle DB-Objekte statt gefilterter DTOs an "use client"-Komponenten).
5. Fehlerbehandlung in Formularen (booking-form, manual-quote-form,
   quote-warehouse-*-form): Race-Conditions bei Doppel-Submit, fehlende
   Ladezustände/Disabled-States bei Async-Actions.
6. Tote/ungenutzte Komponenten, Props, Imports (mit `pnpm lint`/TS-Compiler
   verifizieren, nicht raten).
7. Konsistenz bei Datum-/Preisformatierung — zentrale Utils (lib/utils/date.ts,
   lib/pricing/display.ts) statt Inline-Formatierung verwenden.

Deliverable Phase 0: Findings-Tabelle (Security-Findings priorisiert markieren).
Deliverable Phase 2: Refactoring-PRs, jeweils klein und isoliert pro Komponente/
Utility-Extraktion, mit `pnpm build` + `pnpm lint` grün.
Nicht anfassen: Visuelles Design/UX-Entscheidungen ohne Rücksprache (nur
technisches Refactoring, keine Layout-/Copy-Änderungen).
```

### Subagent E – Dependencies, Konfiguration & Secrets-Handling

```text
Rolle: Supply-Chain- & Konfigurations-Sicherheitsspezialist.

Scope: package.json, pnpm-lock.yaml, next.config.mjs, tsconfig.json,
middleware.ts (Config-Teil), env.konfigurator.example, .gitignore,
docs/SECURITY-ROTATION.md, docs/TODO.md (Abschnitt Secrets).

Prüfe konkret:
1. `pnpm audit` (oder äquivalent) ausführen — bekannte CVEs in Dependencies,
   insbesondere stripe, @neondatabase/serverless, @supabase/*, next, resend.
   Veraltete Major-Versionen mit Sicherheits-Patches identifizieren.
2. next.config.mjs: Kein Secret im `env`-Block (siehe bekannter Bug-Fix in
   docs/TODO.md zu WRISTLINK_PASSWORD — verifizieren, dass das aktuell
   eingehalten wird und generell für ALLE Secrets gilt). Security-Header
   (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy) gesetzt?
3. NEXT_PUBLIC_*-Variablen: Liste alle vorkommenden NEXT_PUBLIC_*-Referenzen im
   Code und verifiziere, dass darunter KEIN Secret ist (diese landen im Client-
   Bundle).
4. .gitignore deckt alle .env*-Varianten ab (.env.local, .env.production.local,
   .vercel/.env.production.local) — prüfen, ob versehentlich einmal ein Secret
   in die Git-History gelangt ist (`git log -p -- .env*` sowie Suche nach
   typischen Key-Prefixes wie `sk_live_`, `xoxb-`, `AIza` etc. im gesamten Verlauf).
5. CORS-Konfiguration der API-Routen (app/api/**): Standardverhalten von Next.js
   prüfen, explizite CORS-Header nur wo für n8n/externe Systeme nötig, nicht
   pauschal `*`.
6. Rate-Limiting-Konfiguration (lib/rate-limit.ts): Limits sinnvoll bemessen für
   Produktionslast, In-Memory-Fallback-Risiko bei Multi-Instance-Deployment
   (Vercel Serverless) dokumentieren (jede Instanz hat eigenen Speicher — Upstash
   in Production zwingend empfehlen, siehe offener TODO-Punkt).
7. TypeScript strict-Mode-Einstellungen in tsconfig.json — sind alle relevanten
   strict-Flags aktiv?

Deliverable: Findings-Tabelle inkl. konkreter Versions-Upgrade-Empfehlungen
(mit Breaking-Change-Hinweis) und Security-Header-Vorschlag als Diff für
next.config.mjs. KEINE eigenständige Rotation echter Secrets — nur Code-seitiges
Handling prüfen/fixen.
```

### Subagent F – Tests, Build & Abschlussverifikation (läuft NACH A–E)

```text
Rolle: QA/Release-Verifikations-Spezialist. Läuft erst, wenn Phase 1 + 2 aller
anderen Subagents abgeschlossen und gemerged sind.

Aufgaben:
1. `pnpm install`, `pnpm build`, `pnpm lint` ausführen — müssen fehlerfrei
   durchlaufen.
2. `pnpm test:preis-engine`, `npx tsx scripts/test-fulfillment-timing.ts`,
   `npx tsx scripts/test-lieferzeit.ts`, `npx tsx scripts/test-email-links.ts`
   ausführen — müssen ohne Fehler durchlaufen.
3. Lokalen Smoke-Test gemäß docs/TODO.md-Abschnitt "Smoke-Test" durchführen
   (Server starten, öffentliche Routen auf 200/307 prüfen).
4. Alle Findings-Reports aus Phase 0 (A–E) gegen den finalen Code-Stand
   abgleichen: Status jedes Findings auf "Fixed" / "Open" / "Risk – Rücksprache"
   aktualisieren.
5. Konsolidierten Abschlussbericht erstellen: Zusammenfassung nach Severity,
   Liste verbleibender offener Punkte mit Begründung, Liste der "Risk"-Punkte,
   die menschliche Entscheidung brauchen (z. B. Bestandslogik-Vereinheitlichung,
   Multi-User-Rollenmodell, AGB-Rechtsprüfung).

Deliverable: docs/audit-findings.md (final, mit Status je Finding) +
Kurz-Zusammenfassung im PR-Beschreibungstext (Was wurde geändert, was ist offen,
was muss ein Mensch entscheiden).
```

## 6. Findings-Report-Format (für alle Subagents verbindlich)

Jeder Subagent trägt seine Funde in eine gemeinsame Tabelle in
`docs/audit-findings.md` ein:

| ID | Bereich | Severity | Datei:Zeile | Beschreibung | Empfehlung | Status |
|----|---------|----------|-------------|--------------|------------|--------|
| A-01 | Auth | Critical | `middleware.ts:59` | ... | ... | Open/Fixed/Risk |

Severity-Definition:
- **Critical:** Direkt ausnutzbar, Auth-Bypass, Secret-Leak, Injection.
- **High:** Ausnutzbar unter realistischen Bedingungen, Daten-Integrität gefährdet.
- **Medium:** Code-Qualität mit potenziellem Folgefehler, fehlende Validierung
  ohne unmittelbaren Exploit-Pfad.
- **Low:** Stil/Wartbarkeit, keine Sicherheitsrelevanz.

## 7. Definition of Done

- [ ] Alle Critical/High-Findings sind "Fixed" oder explizit als "Risk –
      Rücksprache nötig" mit Begründung markiert (nicht stillschweigend offen).
- [ ] `pnpm build` und `pnpm lint` grün.
- [ ] Alle bestehenden Test-Scripts (Abschnitt 2) laufen ohne Fehler.
- [ ] Keine neuen Secrets/Klartext-Zugangsdaten im Diff (Diff explizit auf
      `.env`-artige Muster geprüft).
- [ ] `docs/audit-findings.md` vollständig und aktuell.
- [ ] Keine Änderung an Preis-/Fulfillment-/Verfügbarkeits-Fachlogik ohne
      expliziten Risk-Vermerk statt automatischem Fix.
