# UX-Redesign: Auftragsdetailseite (Warenverwaltung)

**Stand:** 15. Juli 2026  
**Status:** Implementiert  
**Route:** `/warenverwaltung/auftraege/[id]`

Spec und Referenz für die Auftragsabwicklung im Tab **Abwicklung**. Details zu Lager-Logik und Druckformaten: `docs/konfigurator.md`.

> **Mitarbeiter-Anleitung:** Pipeline-/Schritt-Änderungen hier auch in `docs/mitarbeiter-anleitung.html` (+ PDF) nachziehen – siehe `docs/TODO.md`.

---

## Ziel

**Ein Schritt nach dem anderen, ganz eindeutig.**

- Eine Card **Auftragsabwicklung** mit Stepper (Kreise) und **nur dem aktuellen Schritt-Inhalt**
- Lager-Schritte als eigene Pipeline-Punkte zwischen „Vorbereitet“ und „Zusammengepackt“
- Footer mit **← Zum letzten Schritt** und **Primär-Button** zum Abschließen
- Referenz-Daten (Konfiguration, Preis, Stripe …) im Tab **Info**
- Tab **Lager** bleibt als Nachschlagewerk

---

## Layout (implementiert)

```
┌─────────────────────────────────────────────────────────┐
│ ← Auftrag #9 · Badges                                   │
├─────────────────────────────────────────────────────────┤
│  [ Abwicklung ]  [ Lager ]  [ Info ]                    │
├─────────────────────────────────────────────────────────┤
│  Auftragsabwicklung                                     │
│  300× armband · miete · …                               │
│  ●━━●━━●━━◉━━○━━○ …  (nur Kreise, horizontal scrollbar) │
│  ─────────────────────────────────────────────────────  │
│  [ Schritt-Titel ]                                      │
│  [ Inhalt nur dieses Schritts ]                         │
│  ─────────────────────────────────────────────────────  │
│  [← Zum letzten Schritt]  [Lager öffnen] [✓ Schritt …]  │
└─────────────────────────────────────────────────────────┘
```

Kein zweites „Fortschritt X/Y“, kein Fortschrittsbalken, keine parallele Mini-Checkliste unter dem Stepper.

---

## Tabs

| Tab | Zweck | Komponente |
|---|---|---|
| **Abwicklung** | Arbeiten – Stepper + aktueller Schritt | `QuoteOrderWorkflow` in `AuftragDetailView` |
| **Lager** | Nachschlagen – Buchung, Chargen, Basis, Rückgabe | `QuoteWarehousePanel` (`variant="reference"`) |
| **Info** | Status, Konfiguration, Preis, Stripe, Kunden-Link, Notizen | `AuftragInfoTab` |

---

## Pipeline

### UI-Schritte (abgeleitet, keine DB-`fulfillment_status`-Werte)

Zwischen `vorbereitet` und `verpackt`:

| Key | Label | Erledigt wenn |
|---|---|---|
| `material_zuweisen` | Material zuweisen | `isQuoteAllocationComplete()` + Basis vollständig |
| `unterlagen_drucken` | Lagerunterlagen drucken | `quote_requests.packing_docs_printed_at` gesetzt (Migration 21) |

### Beispiel (ohne Druck)

```
Freigabe → Geldeingang → Angenommen → Vorbereitet
  → Material zuweisen → Lagerunterlagen drucken → Zusammengepackt
  → Versand beauftragt → Versandt → …
```

Logik: `lib/konfigurator/order-pipeline.ts` (`getOrderPipelinePhase`, `getOrderPipelineProgressIndex`).

---

## Schritt-Inhalte (Tab Abwicklung)

| Schritt | Inhalt |
|---|---|
| **Material zuweisen** | Eingebettetes Lager-Panel (`QuoteWarehousePanel` mit `embedded`) – Buchungstabelle, Station, Basen; „Zuweisung ändern“ öffnet Modal |
| **Lagerunterlagen drucken** | Kurztext; Druck-Popup über Footer „Lagerunterlagen öffnen“ |
| **Als gepackt markieren** | Pack-Checkliste (`OrderPackingChecklistUi` aus `PackingSheetData`) + Fulfillment-Formular |
| **Fulfillment** (angenommen, vorbereitet, versand …) | `QuoteFulfillmentWorkflow` (Buttons im Footer, Formular inline) |
| **Freigabe / Geldeingang** | `QuoteApprovalActions` / `QuotePaymentActions` |

---

## Footer-Navigation

| Button | Verhalten |
|---|---|
| **← Zum letzten Schritt** | `viewIndex` − 1 (vorherigen Schritt ansehen; erledigte Schritte read-only) |
| **Zum aktuellen Schritt** | Erscheint beim Zurückblättern; springt zu `currentIndex` |
| **Lagerunterlagen öffnen** | Nur bei Schritt `unterlagen_drucken` – öffnet `QuotePackingPrintModal` |
| **Primär-Button** | Schritt abschließen (Label je Phase, siehe unten) |

### Primär-Aktionen

| Phase | Button | Aktion |
|---|---|---|
| `material_zuweisen` (offen) | Material zuweisen | `QuoteWarehouseModal` |
| `material_zuweisen` (vollständig) | Zuweisung abschließen | `router.refresh()` → Phase wechselt automatisch |
| `unterlagen_drucken` | Druck erledigt – Schritt abschließen | `confirmPackingDocsPrinted()` |
| `verpackt` / Fulfillment | Als gepackt markieren / Schritt abschließen: … | Klick auf `#fulfillment-advance-btn` → Bestätigungsdialog |

Druck-Popup: Vorschau + Druck **im Modal** (iframe, kein neuer Tab). Zusätzlich „Druck erledigt – weiter zum Packen“ im Modal.

---

## Lagerunterlagen drucken

- Modal: `QuotePackingPrintModal` – Tabs Labels / Checkliste / Übersicht
- Voraussetzung: `isQuoteWarehouseReadyForPrint()`
- Bestätigung: `confirmPackingDocsPrinted()` in `lib/actions/quote-warehouse.ts`
- DB: `packing_docs_printed_at` (Migration `21-packing-docs-printed.sql`)

---

## Implementierte Dateien

| Datei | Rolle |
|---|---|
| `app/warenverwaltung/auftraege/[id]/page.tsx` | Server-Daten, `resolvedWarehouseContext`, `packingSheetData` |
| `components/admin/auftrag-detail-view.tsx` | Tabs Abwicklung / Lager / Info |
| `components/admin/auftrag-info-tab.tsx` | Info-Tab-Inhalt |
| `components/admin/quote-order-workflow.tsx` | Stepper, Schritt-Inhalt, Footer |
| `components/admin/order-pipeline-stepper.tsx` | Kreis-Stepper (ohne Balken) |
| `components/admin/order-packing-checklist-ui.tsx` | Pack-Checkliste im Schritt „Gepackt“ |
| `components/admin/quote-warehouse-panel.tsx` | Lager-Tab + embedded im Schritt Material |
| `components/admin/quote-packing-print-modal.tsx` | Druck-Popup |
| `lib/konfigurator/order-pipeline.ts` | Pipeline inkl. `material_zuweisen`, `unterlagen_drucken` |
| `lib/actions/quote-warehouse.ts` | `confirmPackingDocsPrinted`, `getWarehousePipelineContext` |
| `scripts/migration/21-packing-docs-printed.sql` | Spalte `packing_docs_printed_at` |

Legacy (nicht mehr in der Haupt-UI): `components/admin/order-primary-action.tsx`, `components/admin/order-packing-step-panel.tsx`.

---

## Akzeptanzkriterien (erfüllt)

1. Stepper zeigt Material zuweisen, Lagerunterlagen drucken, Zusammengepackt als eigene Schritte
2. Kein Anker-Link `#fulfillment-workflow`
3. Keine doppelten Fortschritts-Anzeigen (Header + Balken + Checkliste)
4. Lager-Tab ohne konkurrierende Hauptbuttons (nur „Zuweisung ändern“)
5. Info-Tab bündelt Referenz-Cards
6. Blockierung „Als gepackt markieren“ ohne vollständige Zuweisung (`validateWarehouseForFulfillmentStep`)

---

## Nicht im Scope / offen

- **Auftrag anpassen** (Menge, Techniker, neues Angebot) – separates Feature
- Automatisches Drucker-Tracking
- Kunden-Ansicht / Konfigurator

---

## Migration

```bash
cd inventory-report-popup
set -a && source .env.local && set +a && pnpm db:migrate
```

Enthält Migration 21 (`packing_docs_printed_at`). Production: ggf. `.env.production.local` laden.
