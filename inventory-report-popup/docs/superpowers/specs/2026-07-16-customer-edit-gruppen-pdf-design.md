# Kundenänderung: Gruppenaufteilung + Angebots-PDF Historie

**Datum:** 2026-07-16  
**Status:** Freigegeben — implementiert  
**Plan:** `docs/superpowers/plans/2026-07-16-customer-edit-gruppen-pdf.md`  
**Erweitert:** `docs/superpowers/specs/2026-07-16-customer-quote-edit-design.md`  
**Kontext:** Wristlink / inventory-report-popup — Edit-Modus, `/angebot/[token]`, `quote_request_versions`

## Problem

1. **Gruppen:** Beim Ändern einer Anfrage sind Gruppenanzahl und Stückverteilung gesperrt (`disabled={editMode}` + `LOCKED_KEYS`), obwohl Menge und andere Optionen editierbar sind. Kunden mit PRO können die Aufteilung nicht korrigieren.
2. **PDF:** Das Admin-Angebots-PDF liegt nur auf `quote_requests` und ist für Kunden über den Token-Link nicht einsehbar. Nach Änderungen fehlen ältere PDFs im Änderungsverlauf.

## Ziel

- Bei bestehender PRO-Station: Gruppenanzahl und Multi-Thumb-Verteilung im Kunden-Edit freischalten (Station bleibt locked).
- Aktuelles Angebots-PDF über denselben individuellen Link (PLZ-Gate) anzeigen/downloaden.
- Bei Kundenänderung: vorhandenes PDF an die abgeschlossene Version anhängen, aktuelles PDF invalidieren; alte PDFs im Verlauf verlinkt.

## Nicht-Ziele

- Kein Freischalten von Station / ECO↔PRO / Kontakt / Eventdatum / Produkt / Modus
- Keine weiteren Dokumenttypen (Rechnung, AB, Packliste)
- Kein Snapshot bei Admin-PDF-Austausch ohne Kunden-Edit (PDF-Ersetzung überschreibt nur das aktuelle BYTEA)
- Kein Object-Storage / S3 — weiter BYTEA wie heute
- Keine Änderung an Soft-Submit / Ampel-Verhalten

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Gruppen-Scope | Nur `gruppen` + `gruppenGroessen`; Station locked → UI nur bei PRO |
| Ansatz Gruppen | Minimal: LOCKED_KEYS + Wizard `disabled` entfernen + Change-Summary |
| PDF-Typ | Nur Angebots-PDF (`offer_pdf_*`) |
| Historien-Trigger | Snapshot bei Kundenänderung auf die **bisher aktuelle** Version |
| Nach Edit | Aktuelles PDF auf Anfrage leeren (wie Stripe-Link) |
| Speicherung Historie | Spalten auf `quote_request_versions` (Ansatz 1) |
| Auth Auslieferung | `public_token` + bestehendes PLZ-Cookie (`hasAngebotAccess`) |

## Architektur

### Gruppen

**`lib/konfigurator/quote-customer-edit.ts`**
- `gruppen`, `gruppenGroessen` aus `LOCKED_KEYS` entfernen
- `buildChangeSummary`: bei geänderter Anzahl „Gruppen a→b“; bei nur Verteilung „Gruppenaufteilung“

**`components/konfigurator/configurator-wizard.tsx`**
- Count-Slider und `GruppenVerteilungsSlider`: `disabled={editMode}` entfernen
- Station-Cards und sonstige Locked-Felder unverändert
- Bestehende Client-Validierung (`gruppenVerteilungGueltig`) bleibt Absende-Guard; keine neue Server-Hard-Validation (bewusst, Ansatz 1)

### PDF Historie

**Migration `scripts/migration/25-quote-version-offer-pdf.sql`**

```sql
ALTER TABLE quote_request_versions
  ADD COLUMN IF NOT EXISTS offer_pdf_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS offer_pdf_data BYTEA,
  ADD COLUMN IF NOT EXISTS offer_pdf_mime_type VARCHAR(100);
```

**Kunden-Edit in `updateQuoteByPublicToken`** (Reihenfolge):

1. `ensureInitialQuoteVersion` (wie heute; V1 = bisheriger Stand falls fehlend)
2. Wenn `quote_requests` ein PDF hat: BYTEA + Filename + Mime auf die **max. existierende** Version kopieren (die abgeschlossene Version)
3. Neue Version N+1 ohne PDF einfügen
4. `quote_requests` updaten: Config/Preis/Status/`submitted`, Stripe nullen, **`offer_pdf_*` nullen**, Hold wie heute

**Listen / DTO:** `listQuoteVersions` und Timeline-Payload liefern **kein** BYTEA — nur z. B. `has_offer_pdf: boolean` und optional `offer_pdf_filename`.

### Öffentliche PDF-Routen

| Route | Inhalt |
|---|---|
| `GET /api/angebot/[token]/offer-pdf` | Aktuelles PDF von `quote_requests`; 404 wenn keines |
| `GET /api/angebot/[token]/versions/[versionNumber]/offer-pdf` | PDF der Version; 404 wenn keines / Version fremd |

Beide: `hasAngebotAccess(token)` → sonst 401. Response: `Content-Type: application/pdf`, `Content-Disposition: inline` (analog Admin-Route). Filename sanitizen wie Admin.

Admin-Upload (`uploadQuoteOfferPdf`) bleibt unverändert auf `quote_requests`.

## UX

### Konfigurator Edit

- PRO: Gruppen-Slider bedienbar; Preis/Verfügbarkeitshinweise wie Erst-Anfrage
- Ungültige Verteilung blockiert Absenden (wie heute)
- Mengenänderung synct Gruppengrößen weiter über `syncGruppenGroessen`

### Statusseite `/angebot/[token]`

- Wenn aktuelles PDF existiert: Button/Link „Angebot als PDF“ (öffnet/lädt aktuelle Route)
- Wenn keines (z. B. nach Edit noch in Prüfung): kein aktueller PDF-Button; Hinweis optional unnötig — Verlauf deckt Alte ab
- Änderungsverlauf: pro Version mit PDF ein Link „PDF“ → Versions-Route; ohne PDF kein Link

## Fehlerfälle

| Fall | Verhalten |
|---|---|
| Kein PDF auf Anfrage beim Edit | Kein Snapshot; weiter Version schreiben + Stripe/Status wie heute |
| Version ohne PDF | Versions-Route 404; Timeline ohne Link |
| Ungültiger Token / PLZ | 401 wie Angebotsseite |
| Manipulation `station` im Update-Body | weiter durch `LOCKED_KEYS` verworfen |
| Admin ersetzt PDF ohne Kunden-Edit | Nur aktuelles BYTEA ändert sich; alte Versionen unberührt (kein Auto-Snapshot) |

## Tests

- `scripts/test-quote-versions.ts`: Merge erlaubt `gruppen`/`gruppenGroessen`; Station weiter locked; Summary enthält Gruppen-Hinweis
- Unit/Integration (Script oder Route-Test): Snapshot kopiert PDF auf latest version, leert `quote_requests.offer_pdf_*`, neue Version ohne PDF
- Optional: Auth-Negativtest öffentliche PDF-Route ohne Cookie → 401

## Erfolgskriterien

1. PRO-Kunde kann im Edit Gruppenanzahl und Aufteilung ändern und absenden; Werte persistieren.
2. Station/ECO↔PRO bleibt im Edit unveränderbar.
3. Mit hinterlegtem Angebots-PDF sieht der Kunde es auf `/angebot/[token]`.
4. Nach Kundenänderung ist kein aktuelles PDF mehr auf der Anfrage; das vorherige ist an der abgeschlossenen Version verlinkt.
5. Frühere Versions-PDFs bleiben über den Verlauf erreichbar (Token + PLZ).

## Betroffene Bereiche

- `lib/konfigurator/quote-customer-edit.ts`
- `lib/quotes-internal.ts` (`updateQuoteByPublicToken`)
- `lib/konfigurator/quote-versions.ts` (+ Typen ohne Blob in Listen)
- `components/konfigurator/configurator-wizard.tsx`
- `components/angebot/angebot-status-view.tsx`, `quote-version-timeline.tsx`
- `app/angebot/[token]/page.tsx` (Flags `hasOfferPdf` / Version-Metadaten)
- Neu: `app/api/angebot/[token]/offer-pdf/route.ts`, `…/versions/[versionNumber]/offer-pdf/route.ts`
- `scripts/migration/25-quote-version-offer-pdf.sql`
- `scripts/test-quote-versions.ts` (+ ggf. PDF-Snapshot-Test)
- Parent-Spec Editierbare-Felder-Zeile um Gruppen ergänzen (Kurzverweis)
