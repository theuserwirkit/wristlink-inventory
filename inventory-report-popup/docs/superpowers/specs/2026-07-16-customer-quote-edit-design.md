# Kundenänderung per Angebots-Link

**Datum:** 2026-07-16  
**Status:** Freigegeben — implementiert auf `feature/customer-quote-edit`  
**Plan:** `docs/superpowers/plans/2026-07-16-customer-quote-edit.md`  

**Kontext:** Wristlink / inventory-report-popup — öffentliche Statusseite `/angebot/[token]`

## Problem

Kunden erhalten nach dem Submit einen individuellen Link (`public_token`). Darüber können sie heute nur Status, Angebot und Zahlung sehen — **nicht** die Anfrage anpassen. Änderungen laufen manuell oder über eine neue Anfrage.

## Ziel

Kunden können bis zur Zahlung über denselben Link erlaubte Felder ändern. Jede Änderung erzeugt eine chronologische Version, setzt den Status zurück auf Prüfung und zeigt Verfügbarkeit als Ampel (ohne Stückzahlen).

## Nicht-Ziele

- Kein Ändern nach `paid` (oder End-Status `rejected` / `expired` / `cancelled`)
- Kein Self-Service für Eventdatum / Zeitraum
- Kein vollständiges Kundenportal / Account-Login
- Keine Anzeige von Restmengen oder feinen Lagerzahlen gegenüber dem Kunden

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Edit-Fenster | Bis zur Zahlung: `submitted`, `approved`, `payment_pending` |
| Nach Speichern | Status → `submitted` (erneute Prüfung), alter Stripe-Zahlungslink ungültig |
| Bei „nicht verfügbar“ | Absenden trotzdem erlaubt (Wunsch geht in Prüfung) |
| Editierbare Felder | Menge, Logo/Branding, Techniker, Druck, Flex-Option, Lieferoptionen |
| Gesperrt | Eventdatum (serverseitig erzwungen) |
| UI | Konfigurator-Wizard vorbefüllt im Edit-Modus (Variante B) |
| Versionierung | Tabelle `quote_request_versions` (append-only Snapshots) |
| Verfügbarkeit UX | Ampel wie im Konfigurator (Stress-Balken); **ohne** Untertitel wie „entspannt · Absenden ok“; ohne Stückzahlen |

## Ablauf

```text
/angebot/[token]  (PLZ-Gate wie heute)
    │
    ├─ Status erlaubt? ──nein──► kein „Anfrage ändern“
    │
    └─ „Anfrage ändern“
           │
           ▼
     /konfigurator?edit=[token]
     Wizard vorbefüllt, Datum read-only
     Ampel (bestehende AvailabilityIndicator, ohne Untertitel-Zusätze)
           │
           ▼
     POST /api/konfigurator/update/[token]
           │
           ├─ Auth: Token + Angebots-Zugang (PLZ-Cookie)
           ├─ Eventdatum unverändert erzwingen
           ├─ Preis neu berechnen
           ├─ Ampel-Stand ermitteln (Submit nicht blockieren)
           ├─ Version N+1 schreiben
           ├─ quote_requests aktualisieren → status=submitted
           ├─ Hold: alte ANFRAGE-Reservierung lösen, neue Hold
           ├─ Stripe-Link nullen
           └─ Telegram/Admin (+ optional Mail)
           │
           ▼
     Redirect /angebot/[token]
     Chronologie + „wird erneut geprüft“
```

## Datenmodell

### Neue Tabelle `quote_request_versions`

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | serial/uuid | PK |
| `quote_request_id` | FK → `quote_requests` | Anfrage |
| `version_number` | int | 1, 2, 3… unique pro Anfrage |
| `config_json` | jsonb | Snapshot |
| `price_snapshot_json` | jsonb | Snapshot |
| `availability_level` | text | `green` \| `yellow` \| `red` |
| `availability_label` | text nullable | optional interner/Admin-Label; **nicht** als Kunden-Untertitel unter der Ampel |
| `changed_by` | text | `customer` \| `admin` \| `system` |
| `change_summary` | text | z. B. „Menge 500→600; Flex an“ |
| `created_at` | timestamptz | |

Migration fortlaufend unter `scripts/migration/` (nächste freie Nummer nach 22).

### `quote_requests`

Bleibt Single Source für aktuellen Stand, Token, Status, Stripe, Fulfillment.

Bei Kunden-Edit:

1. `config_json` / `price_snapshot_json` überschreiben  
2. `status = submitted`  
3. Stripe-Payment-Link / Session-Felder invalidieren (`NULL` bzw. analog bestehender Cleanup-Logik)  
4. `booking_id`: Hold erneuern (Release + neue Hold für neue Menge, gleiches Datum)

Version 1 wird beim Erst-Submit angelegt (oder lazy beim ersten Edit, wenn Altbestand ohne Version existiert — Implementierung soll Alt-Anfragen einmalig Version 1 aus aktuellem Stand erzeugen).

## API & Auth

- `GET /konfigurator?edit=[token]` — lädt Config der Anfrage; Edit-Flags für gesperrte Felder  
- `POST /api/konfigurator/update/[token]` — Update-Pfad (nicht `POST /api/konfigurator/submit`)  
- Zugang wie Angebotsseite: gültiger `public_token` + PLZ-Cookie (`angebot-access`)  
- Rate-Limit analog Submit  
- Server verwirft/überschreibt Client-Änderungen am Eventdatum  

## UI

### Statusseite `/angebot/[token]`

- Button „Anfrage ändern“ nur in editierbaren Status  
- Chronologie: Versionen neu→alt, Kurz-Summary, Ampel-Punkt (ohne Zahlen/Untertitel), aktuelle Version markiert  
- Nach Edit: klarer Status „Eingegangen — wird erneut geprüft“

### Konfigurator Edit-Modus

- Banner: Änderung an bestehender Anfrage → danach erneute Prüfung  
- Eventdatum read-only  
- Editierbar: Menge, Logo/Branding, Techniker, Druck, Flex, Lieferoptionen  
- Ampel: bestehende Stress-Balken-Komponente; **keine** zusätzlichen Untertitel-Zeilen („entspannt · Absenden ok“ o. ä.); **keine** Restmengen und **keine** Anzeige „X offene Anfragen“ gegenüber dem Kunden  
- Kontakt-/Eventadresse (außer technikerbezogenen Feldern) bleiben unverändert / nicht editierbar  
- CTA: „Änderung absenden“  
- Bei Rot: Absenden erlaubt  

### Admin Auftrag

- Dieselbe Versions-Timeline inkl. `changed_by`  
- Bei Kundenänderung: Telegram/Admin-Hinweis  

## Fehlerfälle

| Fall | Verhalten |
|---|---|
| `paid` / End-Status | Kein Edit-Button; Update-API 403/409 |
| Ungültiger Token / PLZ | Wie heute |
| Parallel Admin-Freigabe + Kunden-Edit | Kunden-Edit speichert Version, Status wieder `submitted`; Admin sieht neue Version |
| Hold-Erneuerung scheitert | Version trotzdem speichern; Admin/Telegram-Warnung |
| Alter Stripe-Link | Invalidiert; neuer Link erst bei erneuter Freigabe |

## Betroffene Bereiche (Orientierung)

- `app/angebot/[token]/page.tsx`, `components/angebot/angebot-status-view.tsx`  
- `components/konfigurator/configurator-wizard.tsx`, `components/konfigurator/availability-indicator.tsx`  
- `app/api/konfigurator/submit/route.ts` (+ neue Update-Route)  
- `lib/quotes-internal.ts`, `lib/actions/quote-booking-internal.ts`  
- `lib/konfigurator/angebot-access.ts`, Stripe-Invalidierung in bestehender Quote-Logik  
- Admin Auftrag-UI, Telegram-Benachrichtigung  
- Migration `scripts/migration/24-…sql`  

## Erfolgskriterien

1. Kunde kann bis Zahlung erlaubte Felder über denselben Link ändern.  
2. Eventdatum ist client- und serverseitig unveränderbar.  
3. Jede Änderung erscheint chronologisch für Kunde und Admin.  
4. Status geht zurück auf Prüfung; Zahlungslink der alten Freigabe funktioniert nicht mehr.  
5. Ampel ohne Stückzahlen und ohne die genannten Untertitel-Zusätze.  
6. Absenden bei roter Ampel möglich.  
