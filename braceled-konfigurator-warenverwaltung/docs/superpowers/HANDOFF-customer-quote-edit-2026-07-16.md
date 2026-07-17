# Handoff: Kundenänderung per Angebots-Link

**Für:** Head-Agent / Gegencheck mit Fable  
**Datum:** 2026-07-16  
**Branch:** `feature/customer-quote-edit`  
**HEAD (bei Erstellung dieses Docs):** siehe `git rev-parse HEAD` auf dem Branch  
**Repo-Root:** Elternverzeichnis von `braceled-konfigurator-warenverwaltung/` (Git-Root)  
**App:** `braceled-konfigurator-warenverwaltung/`

---

## 1. Auftrag / Ergebnis in einem Satz

Kunden können bis zur Zahlung über denselben individuellen Link (`/angebot/[public_token]`) Menge, Logo/Branding und Upsells (Techniker, Druck, Flex, Lieferoptionen) ändern. Jede Änderung erzeugt eine chronologische Version, setzt den Status zurück auf Prüfung, invalidiert den Stripe-Zahlungslink und zeigt Verfügbarkeit als Ampel **ohne Stückzahlen und ohne Untertitel**.

---

## 2. Spec & Plan (Quellen der Wahrheit)

| Dokument | Pfad |
|---|---|
| Design-Spec | [`docs/superpowers/specs/2026-07-16-customer-quote-edit-design.md`](superpowers/specs/2026-07-16-customer-quote-edit-design.md) |
| Implementierungsplan | [`docs/superpowers/plans/2026-07-16-customer-quote-edit.md`](superpowers/plans/2026-07-16-customer-quote-edit.md) |
| Kurz-Doku Konfigurator | [`docs/konfigurator.md`](konfigurator.md) (Abschnitt „Kundenänderung per Angebots-Link“) |

**Status Spec:** Freigegeben — implementiert auf `feature/customer-quote-edit`.

---

## 3. Produktentscheidungen (aus Brainstorming)

| Thema | Entscheidung |
|---|---|
| Edit-Fenster | Bis Zahlung: `submitted`, `approved`, `payment_pending` |
| Nach Speichern | Status → `submitted`; Stripe-Link/Session null; erneute Admin-Prüfung |
| Bei „nicht verfügbar“ | Absenden **erlaubt** (Wunsch geht in Prüfung) |
| Editierbar | Menge, Logo/Branding, Techniker, Druck, Flex, Lieferoptionen |
| Gesperrt | Eventdatum (`von`/`bis`), Kontaktadresse, Produkt, Modus, Station, Gruppen, Szenario (UI + Server) |
| UI | Konfigurator-Wizard vorbefüllt (`/konfigurator?edit=[token]`), nicht separates Mini-Form |
| Versionierung | Tabelle `quote_request_versions` (append-only) |
| Ampel | Stress-Balken wie Konfigurator; **kein** Untertitel („entspannt …“), **keine** Restmengen, **keine** „X offene Anfragen“ im Edit-Modus |
| Auth | Bestehendes PLZ-Cookie (`wristlink_angebot_access`); Cookie-Pfad von `/angebot` auf `/` erweitert |

---

## 4. Architektur / Datenfluss

```text
/angebot/[token]  (PLZ-Gate)
  → Button „Anfrage ändern“ (nur editierbare Status)
  → /konfigurator?edit=[token]
       GET /api/konfigurator/edit-session/[token]  (Cookie-Auth)
       Wizard vorbefüllt, Locks, Ampel hideDetails
       POST /api/konfigurator/update/[token]
            mergeCustomerEditConfig (Server-Locks)
            checkProductAvailability auf MERGED config
            updateQuoteByPublicToken:
              ensureInitialQuoteVersion
              insertQuoteVersion N+1
              Hold release + recreate (Fail → trotzdem speichern + Notiz)
              status=submitted, Stripe null
              Telegram „Kundenänderung: …“
            UPDATE nur wenn status noch editierbar (TOCTOU-Guard)
  → Redirect /angebot/[token]
       Chronologie QuoteVersionTimeline
```

Admin: dieselbe Timeline in `AuftragInfoTab` mit `showActor` (Kunde/Admin/System).

---

## 5. Neue / geänderte Kern-Dateien (Feature-Scope)

### Schema
- `scripts/migration/24-quote-request-versions.sql` — Tabelle `quote_request_versions`
- `scripts/run-migrations.mjs` — Registrierung von Migration 23 + 24
- **DB-Status:** `pnpm db:migrate` wurde gegen die lokale `.env.local`-DB ausgeführt; Tabelle existiert mit allen Spalten

### Domain
- `lib/konfigurator/quote-status.ts` — `CUSTOMER_EDITABLE_STATUSES`, `canCustomerEditQuoteStatus`
- `lib/konfigurator/quote-customer-edit.ts` — `mergeCustomerEditConfig`, `buildChangeSummary`, `mapStressToAvailabilityLevel`
- `lib/konfigurator/quote-versions.ts` — CRUD + `ensureInitialQuoteVersion`
- `lib/quotes-internal.ts` — `updateQuoteByPublicToken`; Version 1 bei `createQuoteWithHold`
- `lib/konfigurator/angebot-access.ts` — Cookie `path: "/"`

### APIs
- `app/api/konfigurator/edit-session/[token]/route.ts` — GET Prefill
- `app/api/konfigurator/update/[token]/route.ts` — POST Update (Ampel auf merged Config)

### UI
- `app/konfigurator/page.tsx` — `?edit=`
- `components/konfigurator/konfigurator-client.tsx` — Edit-Session-Load, 401→Angebot, kein Email-Gate
- `components/konfigurator/configurator-wizard.tsx` — Edit-Modus, Locks, Update-Submit, Availability-Bypass
- `components/konfigurator/availability-indicator.tsx` — `hideDetails`
- `components/angebot/quote-version-timeline.tsx` — Chronologie
- `components/angebot/angebot-status-view.tsx` — CTA + Timeline
- `app/angebot/[token]/page.tsx` — lädt Versionen
- `components/admin/auftrag-info-tab.tsx` + `app/warenverwaltung/auftraege/[id]/page.tsx` — Admin-Timeline

### Tests
- `scripts/test-quote-versions.ts` + `package.json` Script `test:quote-versions`

---

## 6. Feature-Commits (chronologisch, älteste zuerst)

Diese Commits gehören klar zum Feature (Subagent-Driven Execution):

1. `eb7b5f3` — Migration 24 + Status-Helper  
2. `448f436` — Migration im Runner registrieren  
3. `5e8b575` — Version-Helpers + Merge-Logic + Tests  
4. `f03808f` — Locked Fields immer überschreiben  
5. `f954aa4` — Cookie-Pfad `/`  
6. `b16ba5f` — `updateQuoteByPublicToken`  
7. `7b9d722` — Status-TOCTOU-Guard + try/catch + Telegram-Guard  
8. `9c307e3` — edit-session + update API  
9. `ec8a8e5` — Availability auf merged Config  
10. `13b9562` — Konfigurator Edit-Modus  
11. `e05f5c7` — Edit-Locks + Loading-Race härten  
12. `1515920` — Ampel `hideDetails`  
13. `2ff555d` — Statusseite CTA + Chronologie  
14. `34a2dbe` — Admin-Timeline  
15. `c0e87ae` — Docs  

**Hinweis für Fable:** Auf dem Branch kann es **weitere Commits** geben (z. B. Rate-Limit/API-Härtung), und `git diff main...HEAD` kann **unrelated Audit-/Refactor-Dateien** enthalten, die parallel im Working Tree lagen. Beim Gegencheck **Feature-Scope** (obige Dateien + Spec) priorisieren; nicht blind den gesamten Branch-Diff als „Kundenänderung“ werten.

---

## 7. Reviews während der Umsetzung (Kurz)

Pro Task: Spec-Review + Code-Quality-Review (Subagent-Driven). Wichtige nachgezogene Fixes:

| Finding | Fix |
|---|---|
| Migration 24 fehlte im Runner | `448f436` |
| `key in previous` schwächte Locks | `f03808f` |
| TOCTOU: UPDATE ohne Status-Guard | `7b9d722` |
| Ampel auf Client-`von`/`bis` | `ec8a8e5` (merged Config) |
| 401-Flash leerer Wizard; UI-Locks unvollständig | `e05f5c7` |

Bekannte Rest-Risiken (bewusst MVP, nicht blockierend):
- Keine volle DB-Transaktion um Version-Insert + Hold + Quote-UPDATE (Race bei parallelem Edit/Pay kann verwaiste Version/Hold hinterlassen)
- GET `edit-session` ohne eigenes Rate-Limit
- Fehler-Mapping in Update-API teils per String-Match (`"Status"` / `"nicht gefunden"`)

---

## 8. Verifikation

| Check | Ergebnis |
|---|---|
| `pnpm test:quote-versions` | grün (11 Assertions) |
| `pnpm test:preis-engine` | grün |
| `pnpm build` | grün (nach Cache-Clear; einmal stale `.next` ENOENT) |
| `pnpm lint` | scheitert projektweit (`eslint` nicht installiert) — **vorbestehend**, nicht Feature-bedingt |
| `pnpm db:migrate` | ausgeführt; `quote_request_versions` vorhanden |
| Manueller Browser-E2E | **noch nicht** durch den Agenten gemacht |

### Manuelle Checkliste für Gegencheck / QA

1. Anfrage anlegen → Version 1 in DB / Timeline  
2. `/angebot/token` → PLZ → „Anfrage ändern“ sichtbar  
3. Edit: Menge ändern, Ampel ohne Untertitel/Zahlen, Absenden auch bei Rot  
4. Zurück Status `submitted`, Chronologie Version 2, alter Stripe-Link weg  
5. Eventdatum im Network-Payload manipulieren → Server behält Original  
6. Nach `paid` kein Edit-Button; Update-API 409  
7. Admin-Auftrag: Änderungsverlauf mit Akteur sichtbar  

---

## 9. Was Fable gezielt prüfen sollte

1. **Spec-Treue:** Stimmen Edit-Felder, Locks, Status-Flow, Ampel-UX mit der Design-Spec überein?  
2. **Security:** Cookie-Auth auf Edit-APIs; Server-Merge der Locked Keys; kein Leak von Lagerzahlen; TOCTOU-Status-Guard.  
3. **Inventar/Holds:** Verhalten bei Hold-Fail und paralleler Zahlung/Ablehnung.  
4. **Regression:** Normaler Konfigurator-Submit (ohne `?edit=`) unverändert? Email-Gate nur ohne Edit-Token?  
5. **Branch-Hygiene:** Welche Diffs gehören **nicht** zum Feature und sollten vor Merge ausgeklammert/separiert werden?  
6. **Offene Lücken:** Transaktionen, Rate-Limit GET, typed error codes, Team-Mail bei Edit (Spec: optional, nicht gebaut).

---

## 10. Nächste Integrationsoptionen (noch offen)

User wurde gefragt, hat Migration erledigt; Integration noch nicht final gewählt:

1. Lokal nach `main` mergen  
2. Push + Pull Request  
3. Branch belassen  
4. Verwerfen  

---

## 11. Kurzantwort für den Head-Agent

Feature **Kunden-Edit bis Zahlung via Angebots-Link** ist spezifiziert, auf Branch `feature/customer-quote-edit` implementiert, DB-migriert, Unit-Tests + Build grün. Manueller E2E und Branch-vs-Audit-Diff-Trennung stehen noch aus. Bitte Spec + Kernpfade (Merge, Update-API, Wizard-Locks, Versionstabelle) mit Fable gegenchecken und Integration/PR empfehlen.
