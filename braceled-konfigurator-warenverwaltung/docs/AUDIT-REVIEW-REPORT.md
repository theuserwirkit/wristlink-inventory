# Review-Report: Security-Audit & Refactoring

**Projekt:** `braceled-konfigurator-warenverwaltung` (Wristlink / BraceLED)  
**Zeitraum:** 16. Juli 2026  
**Zweck:** Gesamtergebnis der Audit-/Fix-Session zur Zweitprüfung (z. B. mit Fable)  
**Detailliste aller Findings:** `docs/audit-findings.md`  
**Master-Prompt:** `docs/AUDIT-REFACTOR-MASTER-PROMPT.md`

---

## 1. Auftrag & Vorgehen

Vollständiges Refactoring plus Prüfung auf Fehler und Sicherheitslücken, orchestriert über Subagents (Phase 0–4). **Fable 5 wurde für die Ausführung nicht verwendet** (laut Auftrag).

| Phase | Inhalt | Modelle (Ausführung) |
|-------|--------|----------------------|
| 0 | Read-only Audit A–E parallel | Sonnet 5 |
| 1a–1c | Critical/High Security-Fixes | Sonnet 5 |
| 2a–2b | Medium Security + Frontend | Sonnet 5 |
| 3 | Verifikation (Build/Tests/Smoke) | Sonnet 5 |
| 4a–4d | Rest-Fixes inkl. RISK-Transaktionen + Frontend + Re-Verify | Sonnet 5 |

**Leitplanken:** keine Secrets ausgeben/committen; Fachlogik Preis/Fulfillment/Verfügbarkeit nicht ungefragt ändern; RISK-Themen ehrlich als Partial/Open markieren.

**Git-Stand (Stand dieses Reports):** Die Subagents selbst haben nicht committet. Die Audit-Fixes wurden anschließend gebündelt committet — Commit `5a67890 feat: enhance API routes with rate limiting and error handling` auf Branch **`feature/customer-quote-edit`** (nicht `main`). Uncommitted im Working Tree ist derzeit nur das **separate Parallel-Feature „customer-quote-edit“** (u. a. `lib/quotes-internal.ts`, `configurator-wizard.tsx`, `availability-stress.ts`, `preis-engine.ts`, neue Specs unter `docs/superpowers/`) — dieses gehört fachlich nicht zum Audit.

---

## 2. Ergebniszahlen (nach Phase 4d)

| Status | Anzahl (ca.) | Critical/High |
|--------|--------------|---------------|
| **Fixed** | **46** | Critical 1/1, High 10/12 |
| **Partial** | **1** (C-04) | High |
| **RISK – Rücksprache** | **1** (C-15) | High |
| **Open** (bewusst) | **~22** | E-01 (High) + Medium/Low/Info |

**Verifikation (Phase 3 + 4d):**

| Check | Ergebnis |
|-------|----------|
| `npx tsc --noEmit` | ✅ |
| `pnpm build` | ✅ (23 Routen; einmaliger, nicht reproduzierbarer `.next`-Prerender-Flake dokumentiert) |
| `pnpm test:preis-engine` | ✅ 7/7 |
| `test-fulfillment-timing.ts` | ✅ |
| `test-lieferzeit.ts` | ✅ |
| `test-email-links.ts` | ✅ |
| `pnpm lint` | ❌ ESLint fehlt als Dependency (vorbestehend) |
| Smoke öffentliche Routen | ✅ 200; `/warenverwaltung` + Druck-Route → 307 Login |
| Secrets-Scan Diff | ✅ keine `sk_live_` / `whsec_` / etc. |

---

## 3. Was geändert wurde (nach Themen)

### 3.1 Auth / Server Actions (Critical/High) — Phase 1a

- **A-01 / C-01:** Buchungslogik aus `"use server"` nach `lib/actions/quote-booking-internal.ts` (`server-only`); Client-Export nur noch `ensureQuoteBooking` mit `requireRole(["ADMIN"])`.
- **A-02 / C-03:** `syncSKUsAndLots` → `requireRole(["ADMIN"])`.
- **A-03 / C-02 / C-19:** Availability-/Stats-Exporte mit `ensureAuthed()`; öffentliche Konfigurator-Pfade über `*Internal`-Varianten; `createBookingInternal` → `bookings-internal.ts`.

### 3.2 Input-Validierung & Krypto — Phase 1b

- **B-01:** Zod `quoteConfigSchema` auf `submit` + `session` Routen.
- **A-05 / B-03:** Lead- & Angebot-Cookies: HMAC statt Hash; Legacy-Hash nur lesend bis Cookie-Ablauf.

### 3.3 Rate-Limiting — Phase 1c

- **A-07:** IP aus `x-vercel-forwarded-for` → `x-real-ip` → letzter `x-forwarded-for`-Hop.
- **B-02:** IP-Limit auf `verify-request`.
- **E-03:** Limit auf n8n Bearer-Routen (availability/bookings/quote-requests).
- **E-04:** Warnung ohne Upstash in Production (nicht hart erzwungen).

### 3.4 Medium Security — Phase 2a

- **E-02:** Permissions-Policy, COOP, CORP.
- **A-04:** Schreibaktionen → `canEdit` (VIEWER darf nicht schreiben).
- **A-08:** Login Timing (Dummy-scrypt bei unbekannter E-Mail).
- **A-09 / B-04 / B-05:** offer-pdf Auth 401/403 + `sanitizeFilename`.
- **B-06:** `import "server-only"` auf Secret-Module.
- **A-10 / C-14:** `lib/safe-error.ts` / `toSafeErrorMessage`.

### 3.5 Frontend Cleanup — Phase 2b + 4c

- **D-03:** gemeinsames `buildOrderContext`.
- **D-15:** Doppel-Submit-Guard.
- **D-16–D-23:** toter Code entfernt (`quote-return-section`, `chart.tsx`, ungenutzte Props/Helper).
- **D-01 / D-06:** Inventar-Druck → iframe + Route `/admin/inventory-report/druck` (kein `document.write`).
- **D-12:** `public_token` nicht an Client-Workflows.
- **D-07–D-10:** Typisierung/`formatDate` an Kernstellen.

### 3.6 Quick Wins — Phase 4a

- **B-07–B-10:** PNG-Magic-Bytes, Session-Rate-Limit, Stripe `ON CONFLICT`, Safe Errors.
- **A-11:** scrypt-Parameter explizit + neues Hash-Format mit Dual-Verify.
- **A-12 / C-18:** interne Helper aus Action-Exports raus / Defense-in-Depth.
- **C-10:** destruktives Reset → `scripts/dangerous/`.
- **E-06 / E-07:** stripe 22.3.2, resend 6.17.2.
- **A-06:** Production-Warnung bei Secret-Fallback (nicht hart erzwungen).

### 3.7 Transaktionen / Locking / UNIQUE — Phase 4b (RISK)

- **C-07 Fixed:** `saveQuoteBandAllocations` atomar.
- **C-11 Fixed:** Migration `23-sku-lot-unique.sql` + `ON CONFLICT` Resolver (`sku-lot-internal.ts`).
- **C-05 / C-06 Fixed:** `withInteractiveTransaction` + `pg_advisory_xact_lock`; atomare `inventory_lots.menge`-Updates.
- **C-04 Partial:** Booking-Finalisierung **vor** Status `paid`; Status+Fulfillment-Event atomar; Rest-Zeitfenster zwischen Booking-TX und Status-TX dokumentiert (Neon-Verschachtelung).
- **C-15 unverändert RISK:** Ledger vs. `inventory_lots.menge` — keine fachliche Vereinheitlichung.

---

## 4. Bewusst offen (für menschliche Entscheidung / Folge-Tasks)

| ID | Severity | Thema | Empfohlene nächste Aktion |
|----|----------|--------|---------------------------|
| **C-15** | High RISK | Mehrere Bestandslogik-Quellen | Architektur: Ledger als Wahrheit wählen |
| **E-01** | High | CSP `unsafe-inline` | Separater Nonce-CSP-Task |
| **C-04** | High Partial | Mini-Fenster Booking→paid | Optional: ein TX-Umbau größerer Scope |
| **E-04** | Medium | Upstash nicht erzwungen | Env in Vercel setzen |
| **A-06** | Medium | Gemeinsamer Password-Fallback | Dedizierte Secrets rollen |
| **C-08** | Medium | Kein Migrations-Tracking | `schema_migrations` |
| **D-04/05/11/13/14/24/25** | Low | Print-Duplikate, Rest-Typen, Datum | Spätere Refactor-Runde |
| **E-05/08/09/10/11** | Low | Next 16, Neon 1.1, sharp, tsconfig | Wartung |
| **E-12–14** | Info | Middleware/CORS/Secret-Rotation | Rotation manuell laut `docs/TODO.md` |

---

## 5. Positivbefunde (unverändert gut)

- SQL durchgängig als Neon Tagged Templates (kein Injection-Finding).
- Stripe-Webhook: raw body + Signaturprüfung.
- Telegram-Webhook: fail-closed, timing-safe.
- Admin-Session HMAC Edge (`middleware`) ↔ Node (`auth-core`) konsistent.
- Keine Secrets in Git-History / keine `NEXT_PUBLIC_*`-Secrets.
- Frontend ohne ausnutzbares XSS (Druck-Pfad gehärtet).

---

## 6. Wichtige neue / geänderte Artefakte (Auswahl)

| Pfad | Rolle |
|------|--------|
| `lib/actions/quote-booking-internal.ts` | Buchungslogik ohne Action-Export |
| `lib/actions/bookings-internal.ts` | `createBookingInternal` |
| `lib/actions/sku-lot-internal.ts` | SKU/Lot Resolver + ON CONFLICT |
| `lib/db.ts` | `withInteractiveTransaction`, Locks |
| `lib/safe-error.ts` | Client-sichere Fehlertexte |
| `lib/utils/sanitize-filename.ts` | Header-Filename |
| `lib/konfigurator/order-context.ts` | gemeinsamer Order-Kontext |
| `scripts/migration/23-sku-lot-unique.sql` | UNIQUE skus/lots |
| `scripts/dangerous/` | destruktives Reset |
| `app/admin/inventory-report/druck/page.tsx` | Druck-Route |
| `components/print/inventory-report-print-view.tsx` | Druck-View |
| `docs/audit-findings.md` | vollständige Finding-Tabelle |
| `next.config.mjs` | zusätzliche Security-Header |

**Deploy-Hinweis:** Migration `23-sku-lot-unique.sql` vor Go-Live in Wartungsfenster ausführen; parallele Lager-/Buchungsrequests einmal auf Staging gegenprüfen.

---

## 7. Hinweise für die Zweitprüfung (Fable)

Bitte besonders prüfen:

1. **Auth-Split Internal vs. Action** — kein Bypass über Client-importebare Server Actions; öffentliche Pfade (Konfigurator, Stripe, n8n) weiter funktionsfähig.
2. **HMAC-Übergang** Lead/Angebot — Legacy-Accept ok? Cutover nach Cookie-Ablauf.
3. **Zod an submit/session** — keine False-Negatives für legitime Configs.
4. **Interactive Transactions / Advisory Locks** — Deadlocks, Connection-Leaks, Neon-Pool-Verhalten auf Vercel.
5. **C-04 Partial** — Reihenfolge Booking→paid korrekt; Retry-Pfad Admin/Stripe.
6. **Migration 23** — Duplikat-Bereinigung vor UNIQUE sicher?
7. **Druck-Route** Auth + Query-Validierung (`year`/`month`).
8. **Parallel-Feature** auf Branch `feature/customer-quote-edit` (Routen `edit-session/[token]`, `update/[token]`, Kunden-Quote-Edit, Versionshistorie) — inhaltlich **nicht Teil des Audits**, aber im selben Branch/Diff. Beim Review vom Audit-Teil trennen; teils schon committet (siehe Commits `2ff555d`, `34a2dbe`, `c0e87ae`), teils noch uncommitted.
9. **Commit-Trennung:** Audit-Fixes liegen in Commit `5a67890`; Parallel-Feature teils uncommitted. Vor Merge nach `main` sauber trennen bzw. bewusst zusammen mergen.

---

## 8. Kurzfazit

Die Session hat die **kritischen Auth-Lücken** und die meisten **High-Findings** geschlossen, Rate-Limits/Validierung/HMAC gehärtet, Transaktions-/Race-Risiken im Lager- und Buchungspfad deutlich reduziert, und Frontend-Druck/`public_token`/Typen an den heißen Stellen bereinigt. Übrig bleiben vor allem **Architektur (C-15)**, **CSP-Nonce (E-01)**, **Betrieb (Upstash/Secrets)** und Low-Wartung — bewusst nicht „blind“ automatisiert.

**Empfehlung vor Production:** Migration 23 + Upstash-Env + Secret-Rotation (`docs/SECURITY-ROTATION.md` / `docs/TODO.md`) + Staging-Test paralleler Buchungen.
