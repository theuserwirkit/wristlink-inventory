# UX-Redesign: Auftragsdetailseite (Warenverwaltung)

**Stand:** 14. Juli 2026  
**Status:** Entwurf – zur Freigabe vor Implementierung  
**Route:** `/warenverwaltung/auftraege/[id]`

---

## Problem

Die Auftragsdetailseite ist ein vertikaler Card-Stack. Der Lager-Workflow ist über drei Bereiche verteilt:

1. **Packen & Material zuweisen** – großer Button in „Lager & Bestand“
2. **Lagerunterlagen drucken** – kleiner Button im Header *und* unten in der Lager-Card
3. **Als gepackt markieren** – Anker-Link `#fulfillment-workflow` in eine andere Card

Der Stepper zeigt `Angenommen → Vorbereitet → Zusammengepackt`, aber die drei Lager-Aktionen dazwischen fehlen in der Pipeline. Nutzer wissen nicht, was als Nächstes zu tun ist.

---

## Ziel

**Ein Schritt nach dem anderen, ganz eindeutig.**

- Genau **eine** primäre Aktion, immer sichtbar im Header
- Pipeline spiegelt die **reale Lagerarbeit** wider
- Referenz-Infos (Konfiguration, Preis, Stripe …) aus dem Arbeitsfluss heraus
- Keine Anker-Links zwischen Cards

---

## Entscheidungen (bestätigt)

| Entscheidung | Wahl |
|---|---|
| Tab-Struktur | Abwicklung · Lager · Info |
| Info-Tab | Status & Verknüpfungen, Konfiguration, Preis, Stripe, Kunden-Link |
| Material zuweisen | **Eigener Pipeline-Schritt** (nicht nur Checkliste unter „Vorbereitet“) |
| Header-CTA | Immer sichtbar, zeigt genau die nächste Aktion |

---

## Informationsarchitektur

### Tab 1: Abwicklung (Default)

**Zweck:** Arbeiten – nur der aktuelle Schritt + Stepper.

Inhalt:
- `OrderPipelineStepper` (erweitert, siehe unten)
- **Aktueller Schritt-Panel** – Titel, Kurz-Erklärung, erledigte Vorbedingungen (✓), ggf. Formular (Fulfillment)
- Keine vollständigen Lager-Tabellen (die sind im Tab Lager)
- Fulfillment-Formular (Kommentar, Mail, Versand) bleibt hier, wenn der aktuelle Schritt ein Fulfillment-Schritt ist

### Tab 2: Lager

**Zweck:** Nachschlagen – was ist zugewiesen?

Inhalt (bestehende `QuoteWarehousePanel`-Sektionen, read-only-first):
- Readiness-Hinweis (Buchung, Leuchtgruppe+Charge, Basis)
- Ausgabe/Reservierung (Buchungstabelle)
- Station & Basen
- Rückgabe (Miete)

**Kein** zweiter Gradient-Button „Packen & Material zuweisen“.  
Stattdessen dezenter Link „Zuweisung ändern“, falls nötig (öffnet dasselbe Modal).

### Tab 3: Info

**Zweck:** Referenz – selten während des Packens gebraucht.

Inhalt (bestehende inline Cards aus `page.tsx`):
- Status & Verknüpfungen
- Konfiguration
- Preis (wenn vorhanden)
- Stripe (wenn vorhanden)
- Kunden-Link (Konfigurator)
- Notizen (wenn vorhanden)

Darstellung: Accordion oder Unterüberschriften, kein weiterer Card-Stack.

---

## Erweiterte Pipeline

### Neue UI-Schritte (keine DB-`fulfillment_status`-Werte)

Zwischen `vorbereitet` und `verpackt` kommen zwei **abgeleitete** Schritte:

| Key | Label | Erledigt wenn |
|---|---|---|
| `material_zuweisen` | Material zuweisen | `isQuoteAllocationComplete()` + Basis vollständig |
| `unterlagen_drucken` | Lagerunterlagen drucken | Nutzer bestätigt Druck (siehe unten) |

Danach folgen die bestehenden Fulfillment-Schritte unverändert:

`verpackt` → `bedruckt` (optional) → `versand_beauftragt` → `versandt` → …

### Vollständige Pipeline (Beispiel ohne Druck)

```
Freigabe → Geldeingang → Angenommen → Vorbereitet → Material zuweisen → Lagerunterlagen drucken → Zusammengepackt → Versand beauftragt → Versandt → …
```

### Phasen-Berechnung

Neue Funktion `getOrderPipelinePhase()` / `getCurrentOrderAction()` in `lib/konfigurator/order-pipeline.ts`:

```
status !== paid          → freigabe / geldeingang (wie bisher)
fulfillment < vorbereitet → Fulfillment-Schritt (angenommen, vorbereitet)
allocation incomplete    → material_zuweisen
print not confirmed      → unterlagen_drucken
fulfillment < verpackt   → verpackt (Fulfillment-Aktion)
…                        → nächster Fulfillment-Schritt
```

Warehouse-Readiness kommt aus bestehenden Funktionen:
- `isQuoteAllocationComplete()`
- `isQuoteBaseAllocationComplete()`
- `isQuoteWarehouseReadyForPrint()`

### Druck-Bestätigung

Für Schritt „Lagerunterlagen drucken“ braucht es eine explizite Bestätigung (Honor-System reicht nicht allein):

**V1 (empfohlen):** Neues optionales Timestamp-Feld `packing_docs_printed_at` auf `quote_requests` (Migration 19).

- Header-CTA „Pack-Checkliste öffnen“ → Modal/Druckseite
- Danach zweiter Klick im Header oder im Schritt-Panel: **„Druck erledigt – weiter“** → setzt Timestamp
- Alternativ: ein kombinierter Flow – Modal mit Druck-Tabs + Button „Fertig, weiter zum Packen“

**Fallback ohne Migration:** Fulfillment-Event `packing_docs_printed` (bestehende Events-Tabelle) – weniger sauber, aber ohne Schema-Change.

---

## Sticky Header-CTA

Neue Client-Komponente: `OrderPrimaryAction` (sticky unter Seiten-Titel).

### Verhalten

| Aktuelle Phase | Button-Label | Aktion |
|---|---|---|
| `freigabe` | Freigeben | `QuoteApprovalActions` |
| `geldeingang` | Zahlung erfassen / Link senden | `QuotePaymentActions` |
| Fulfillment (angenommen, vorbereitet, …) | Schritt abschließen: … | `advanceFulfillmentStep` |
| `material_zuweisen` | Material zuweisen | `QuoteWarehouseModal` |
| `unterlagen_drucken` | Pack-Checkliste öffnen | `QuotePackingPrintModal` / Druckroute |
| `unterlagen_drucken` (nach Öffnen) | Druck erledigt – weiter | Timestamp setzen |
| `verpackt` (nächster Schritt) | Als gepackt markieren | `advanceFulfillmentStep("verpackt")` |

### Regeln

- **Immer genau ein** primärer Button
- Disabled + ein Satz Erklärung, wenn Voraussetzung fehlt
- Nach Abschluss: automatisch nächste Aktion (via `router.refresh()`)
- Default-Tab bleibt „Abwicklung“; nach Tab-Wechsel bleibt Header-CTA sichtbar

### Layout (Wireframe)

```
┌─────────────────────────────────────────────────────────┐
│ ← Auftrag #8 · kunde@example.com                        │
│ [Konfigurator] [Bezahlt] [Vorbereitet]                  │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │  📦  Schritt 5/9: Lagerunterlagen drucken           │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  [ Abwicklung ]  [ Lager ]  [ Info ]                    │
│  … Tab-Inhalt …                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Was entfällt / wird vereinfacht

| Bisher | Neu |
|---|---|
| Gradient-Button „Packen & Material zuweisen“ in Lager-Card | Header-CTA + dezenter „Zuweisung ändern“ im Lager-Tab |
| „Pack-Checkliste öffnen“ (klein, unten) | Header-CTA |
| „Zum Fulfillment-Schritt →“ Anker-Link | Header-CTA „Als gepackt markieren“ |
| `QuotePackingPrintModal` im Header neben Badges | In Header-CTA integriert (nicht doppelt) |
| `PackingCompletionSection` Checkliste | Ersetzt durch Schritt-Panel in Abwicklung |
| Vertikaler Card-Stack (7+ Cards) | 3 Tabs |

---

## Betroffene Dateien (Implementierung)

| Datei | Änderung |
|---|---|
| `app/warenverwaltung/auftraege/[id]/page.tsx` | Tab-Layout, Header-CTA, Info-Tab extrahieren |
| `components/admin/order-primary-action.tsx` | **Neu** – sticky CTA |
| `components/admin/auftrag-detail-tabs.tsx` | **Neu** – Tab-Container (Radix Tabs) |
| `components/admin/quote-order-workflow.tsx` | Schritt-Panel, embedded Fulfillment |
| `components/admin/quote-warehouse-panel.tsx` | Read-only Lager-Tab, Buttons entfernen |
| `lib/konfigurator/order-pipeline.ts` | UI-Schritte `material_zuweisen`, `unterlagen_drucken` |
| `lib/actions/quote-warehouse.ts` | ggf. `confirmPackingDocsPrinted()` |
| `db/migrations/19-packing-docs-printed.sql` | **Neu** – `packing_docs_printed_at` |
| `components/admin/order-pipeline-stepper.tsx` | Mehr Schritte, ggf. kompaktere Darstellung |

---

## Stepper UX (viele Schritte)

Bei 9+ Schritten: horizontal scrollbar (bereits vorhanden) + aktueller Schritt hervorgehoben.  
Optional: auf Mobile nur „Schritt X von Y: Label“ ohne alle Kreise.

---

## Nicht im Scope

- Kunden-Ansicht / Konfigurator
- Änderung der Fulfillment-E-Mail-Templates
- Automatisches Tracking ob wirklich gedruckt wurde (Drucker-API)
- Admin-Anfragen-Route (`/admin/anfragen`) – leitet weiter, profitiert automatisch

---

## Akzeptanzkriterien

1. Nutzer sieht **ohne Scrollen** die nächste Aktion (Header-CTA)
2. Pipeline zeigt **Material zuweisen** und **Lagerunterlagen drucken** als eigene Schritte
3. Kein Anker-Link `#fulfillment-workflow` mehr nötig
4. Lager-Tab zeigt Zuweisungs-Status, aber keine konkurrierenden Hauptbuttons
5. Info-Tab bündelt alle Referenz-Cards
6. Blockierung „Als gepackt markieren“ ohne vollständige Zuweisung bleibt erhalten (`validateWarehouseForFulfillmentStep`)

---

## Offene Frage (optional, V2)

Soll nach „Druck erledigt“ automatisch zum Schritt „Als gepackt markieren“ gewechselt werden, oder explizit zwei Klicks?  
**Empfehlung V1:** Zwei Klicks – Druck bestätigen, dann separat packen markieren (klare Trennung).
