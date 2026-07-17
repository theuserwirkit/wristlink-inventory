# Kunden-Edit Gruppen + Angebots-PDF Historie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Kunden-Edit Gruppenanzahl/-aufteilung (PRO) freischalten und Angebots-PDFs über den Token-Link anzeigen — aktuell und als Snapshot an abgeschlossenen Versionen nach Kundenänderung.

**Architecture:** `gruppen`/`gruppenGroessen` aus `LOCKED_KEYS` + Wizard-Slider freigeben. Migration ergänzt `offer_pdf_*` auf `quote_request_versions`. Bei `updateQuoteByPublicToken` PDF auf latest Version kopieren, dann Anfrage-PDF leeren. Öffentliche GET-Routen unter Token + PLZ-Cookie; Timeline nur mit `has_offer_pdf`-Flag (kein BYTEA in Listen).

**Tech Stack:** TypeScript, Next.js App Router, Postgres BYTEA, bestehende `tsx`-Script-Tests (`test:quote-versions`)

**Spec:** `docs/superpowers/specs/2026-07-16-customer-edit-gruppen-pdf-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `lib/konfigurator/quote-customer-edit.ts` | Locked keys ohne Gruppen; Change-Summary Gruppen |
| `scripts/test-quote-versions.ts` | Merge/Summary-Tests Gruppen |
| `components/konfigurator/configurator-wizard.tsx` | Gruppen-Slider im Edit bedienbar |
| `scripts/migration/25-quote-version-offer-pdf.sql` | PDF-Spalten auf Versionen |
| `lib/konfigurator/quote-versions.ts` | Typ `has_offer_pdf`; List ohne Blob; Snapshot- + Get-Helfer |
| `lib/quotes-internal.ts` | Snapshot + PDF-Clear in `updateQuoteByPublicToken` |
| `app/api/angebot/[token]/offer-pdf/route.ts` | Aktuelles Kunden-PDF |
| `app/api/angebot/[token]/versions/[versionNumber]/offer-pdf/route.ts` | Versions-PDF |
| `components/angebot/quote-version-timeline.tsx` | PDF-Link pro Version |
| `components/angebot/angebot-status-view.tsx` | Button „Angebot als PDF“ |
| `app/angebot/[token]/page.tsx` | `hasOfferPdf` prop |
| Spec-Status | Parent + Feature-Spec → Plan verlinkt / implementiert |

**Unverändert lassen:** Station/Kontakt/Datum-Locks, Admin-Upload auf `quote_requests`, Soft-Submit/Ampel, kein Snapshot bei Admin-PDF-Replace ohne Edit.

---

### Task 1: Gruppen aus LOCKED_KEYS + Summary (TDD)

**Files:**
- Modify: `lib/konfigurator/quote-customer-edit.ts`
- Modify: `scripts/test-quote-versions.ts`

- [ ] **Step 1: Failing tests in `scripts/test-quote-versions.ts` ergänzen**

Nach den bestehenden Merge-Asserts:

```typescript
const withGruppen: QuoteConfig = {
  ...base,
  station: "pro",
  gruppen: 2,
  gruppenGroessen: [250, 250],
}
const gruppenPatch = {
  ...withGruppen,
  gruppen: 4,
  gruppenGroessen: [100, 100, 150, 150],
  station: "eco" as const,
  menge: 600,
}
const mergedGruppen = mergeCustomerEditConfig(withGruppen, gruppenPatch)
assert(mergedGruppen.gruppen === 4, "gruppen editable")
assert(
  JSON.stringify(mergedGruppen.gruppenGroessen) === JSON.stringify([100, 100, 150, 150]),
  "gruppenGroessen editable",
)
assert(mergedGruppen.station === "pro", "station still locked")
assert(mergedGruppen.menge === 600, "menge still editable")

const summaryGruppen = buildChangeSummary(withGruppen, mergedGruppen)
assert(summaryGruppen.includes("Gruppen 2→4"), "summary mentions Gruppen count")

const onlySplit = mergeCustomerEditConfig(withGruppen, {
  ...withGruppen,
  gruppenGroessen: [200, 300],
})
const summarySplit = buildChangeSummary(withGruppen, onlySplit)
assert(summarySplit.includes("Gruppenaufteilung"), "summary mentions Verteilung")
```

- [ ] **Step 2: Tests ausführen — erwartet FAIL**

Run: `npm run test:quote-versions`  
Expected: FAIL (`gruppen` noch locked und/oder Summary ohne Gruppen)

- [ ] **Step 3: `quote-customer-edit.ts` anpassen**

`LOCKED_KEYS`: Einträge `"gruppen"` und `"gruppenGroessen"` entfernen. Kommentar aktualisieren:

```typescript
/** Erlaubte Kunden-Felder: Menge, Logo/Branding, Techniker, Druck, Flex, Lieferoptionen, Gruppen (PRO) */
```

In `buildChangeSummary` vor dem `return`:

```typescript
  if (before.gruppen !== after.gruppen) {
    parts.push(`Gruppen ${before.gruppen}→${after.gruppen}`)
  } else {
    const beforeSizes = JSON.stringify(before.gruppenGroessen ?? [])
    const afterSizes = JSON.stringify(after.gruppenGroessen ?? [])
    if (beforeSizes !== afterSizes) parts.push("Gruppenaufteilung")
  }
```

- [ ] **Step 4: Tests PASS**

Run: `npm run test:quote-versions`  
Expected: All passed

- [ ] **Step 5: Commit**

```bash
git add lib/konfigurator/quote-customer-edit.ts scripts/test-quote-versions.ts
git commit -m "$(cat <<'EOF'
feat: Gruppenanzahl und -aufteilung im Kunden-Edit freigeben

EOF
)"
```

---

### Task 2: Wizard Gruppen-Slider im Edit freigeben

**Files:**
- Modify: `components/konfigurator/configurator-wizard.tsx`

- [ ] **Step 1: `disabled={editMode}` an beiden Gruppen-Controls entfernen**

Count-Slider (ca. Zeile mit `onValueChange={([v]) => updateConfig({ gruppen: v })}`):

```tsx
<Slider
  min={GRUPPEN_MIN}
  max={maxGruppen}
  step={1}
  value={[Math.min(config.gruppen, maxGruppen)]}
  onValueChange={([v]) => updateConfig({ gruppen: v })}
/>
```

`GruppenVerteilungsSlider`:

```tsx
<GruppenVerteilungsSlider
  menge={config.menge}
  groessen={gruppenGroessen}
  onChange={(next) => updateConfig({ gruppenGroessen: next })}
/>
```

**Nicht ändern:** `disabled={editMode}` an Station, Kontakt, Eventdatum, Produkt usw.

- [ ] **Step 2: Smoke — keine neuen TS-Fehler an den geänderten Stellen**

Run (aus `braceled-konfigurator-warenverwaltung`): `npx tsc --noEmit`  
Expected: Exit 0 (oder nur vorbestehende Fehler außerhalb dieser Datei — neue Fehler an den Slider-Zeilen beheben)

- [ ] **Step 3: Commit**

```bash
git add components/konfigurator/configurator-wizard.tsx
git commit -m "$(cat <<'EOF'
feat: Gruppen-Slider im Konfigurator-Edit-Modus bedienbar

EOF
)"
```

---

### Task 3: Migration + Version-PDF Helfer

**Files:**
- Create: `scripts/migration/25-quote-version-offer-pdf.sql`
- Modify: `lib/konfigurator/quote-versions.ts`
- Modify: `scripts/test-quote-versions.ts` (reine Map-/Flag-Logik falls exportiert)

- [ ] **Step 1: Migration anlegen**

```sql
-- 25-quote-version-offer-pdf.sql
ALTER TABLE quote_request_versions
  ADD COLUMN IF NOT EXISTS offer_pdf_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS offer_pdf_data BYTEA,
  ADD COLUMN IF NOT EXISTS offer_pdf_mime_type VARCHAR(100);
```

- [ ] **Step 2: Typen und List-Query in `quote-versions.ts`**

`QuoteVersionRow` erweitern (ohne Blob):

```typescript
export type QuoteVersionRow = {
  id: number
  quote_request_id: number
  version_number: number
  config_json: QuoteConfig
  price_snapshot_json: Record<string, unknown>
  availability_level: AvailabilityStressLevel
  availability_label: string | null
  changed_by: "customer" | "admin" | "system"
  change_summary: string
  created_at: string
  offer_pdf_filename: string | null
  has_offer_pdf: boolean
}
```

`listQuoteVersions` **nicht** `SELECT *` — explizite Spalten, Flag statt Blob:

```typescript
export async function listQuoteVersions(quoteRequestId: number): Promise<QuoteVersionRow[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT
      id,
      quote_request_id,
      version_number,
      config_json,
      price_snapshot_json,
      availability_level,
      availability_label,
      changed_by,
      change_summary,
      created_at,
      offer_pdf_filename,
      (offer_pdf_data IS NOT NULL) AS has_offer_pdf
    FROM quote_request_versions
    WHERE quote_request_id = ${quoteRequestId}
    ORDER BY version_number DESC
  `
  return rows.map((r) => ({
    ...(r as Omit<QuoteVersionRow, "has_offer_pdf">),
    has_offer_pdf: Boolean(r.has_offer_pdf),
    offer_pdf_filename: (r.offer_pdf_filename as string | null) ?? null,
  }))
}
```

- [ ] **Step 3: Snapshot- und Get-Funktionen hinzufügen**

```typescript
/** Kopiert aktuelles Anfrage-PDF auf die höchste existierende Version. No-op wenn kein PDF. */
export async function snapshotOfferPdfOntoLatestVersion(quoteRequestId: number): Promise<void> {
  const sql = getDb()
  await sql`
    UPDATE quote_request_versions AS v
    SET
      offer_pdf_filename = q.offer_pdf_filename,
      offer_pdf_data = q.offer_pdf_data,
      offer_pdf_mime_type = q.offer_pdf_mime_type
    FROM quote_requests AS q
    WHERE q.id = ${quoteRequestId}
      AND v.quote_request_id = q.id
      AND v.version_number = (
        SELECT MAX(version_number) FROM quote_request_versions WHERE quote_request_id = ${quoteRequestId}
      )
      AND q.offer_pdf_data IS NOT NULL
  `
}

export async function getOfferPdfByPublicToken(publicToken: string): Promise<{
  data: Buffer
  mimeType: string
  filename: string
} | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT offer_pdf_data, offer_pdf_mime_type, offer_pdf_filename
    FROM quote_requests
    WHERE public_token = ${publicToken}
    LIMIT 1
  `
  if (!rows.length || !rows[0].offer_pdf_data) return null
  return {
    data: rows[0].offer_pdf_data as Buffer,
    mimeType: String(rows[0].offer_pdf_mime_type || "application/pdf"),
    filename: String(rows[0].offer_pdf_filename || "angebot.pdf"),
  }
}

export async function getVersionOfferPdfByPublicToken(
  publicToken: string,
  versionNumber: number,
): Promise<{
  data: Buffer
  mimeType: string
  filename: string
} | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT v.offer_pdf_data, v.offer_pdf_mime_type, v.offer_pdf_filename
    FROM quote_request_versions v
    JOIN quote_requests q ON q.id = v.quote_request_id
    WHERE q.public_token = ${publicToken}
      AND v.version_number = ${versionNumber}
    LIMIT 1
  `
  if (!rows.length || !rows[0].offer_pdf_data) return null
  return {
    data: rows[0].offer_pdf_data as Buffer,
    mimeType: String(rows[0].offer_pdf_mime_type || "application/pdf"),
    filename: String(rows[0].offer_pdf_filename || "angebot.pdf"),
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/migration/25-quote-version-offer-pdf.sql lib/konfigurator/quote-versions.ts
git commit -m "$(cat <<'EOF'
feat: Angebots-PDF-Spalten und Helfer für Versionshistorie

EOF
)"
```

Hinweis: Migration lokal/Prod ausführen bevor Snapshot in Prod getestet wird (`psql` / bestehender Mig-Prozess des Repos).

---

### Task 4: Snapshot + Clear in `updateQuoteByPublicToken`

**Files:**
- Modify: `lib/quotes-internal.ts`

- [ ] **Step 1: Import ergänzen**

```typescript
import {
  ensureInitialQuoteVersion,
  insertQuoteVersion,
  getNextVersionNumber,
  snapshotOfferPdfOntoLatestVersion,
} from "@/lib/konfigurator/quote-versions"
```

- [ ] **Step 2: Reihenfolge nach `ensureInitialQuoteVersion`**

Unmittelbar nach `ensureInitialQuoteVersion(...)` und **vor** `getNextVersionNumber` / `insertQuoteVersion`:

```typescript
    await snapshotOfferPdfOntoLatestVersion(quote.id)
```

- [ ] **Step 3: UPDATE um PDF-Clear erweitern**

Im bestehenden `UPDATE quote_requests SET` zusätzlich:

```typescript
        offer_pdf_filename = NULL,
        offer_pdf_data = NULL,
        offer_pdf_mime_type = NULL,
```

(neben Stripe-Nullen / `status = 'submitted'`)

- [ ] **Step 4: Commit**

```bash
git add lib/quotes-internal.ts
git commit -m "$(cat <<'EOF'
feat: Angebots-PDF bei Kundenänderung versionieren und invalidieren

EOF
)"
```

---

### Task 5: Öffentliche PDF-API-Routen

**Files:**
- Create: `app/api/angebot/[token]/offer-pdf/route.ts`
- Create: `app/api/angebot/[token]/versions/[versionNumber]/offer-pdf/route.ts`

- [ ] **Step 1: Aktuelles PDF**

```typescript
import { NextRequest } from "next/server"
import { hasAngebotAccess } from "@/lib/konfigurator/angebot-access"
import { getOfferPdfByPublicToken } from "@/lib/konfigurator/quote-versions"
import { sanitizeFilename } from "@/lib/utils/sanitize-filename"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!(await hasAngebotAccess(token))) {
    return Response.json({ error: "Zugang erforderlich" }, { status: 401 })
  }
  try {
    const pdf = await getOfferPdfByPublicToken(token)
    if (!pdf) {
      return Response.json({ error: "Kein PDF vorhanden" }, { status: 404 })
    }
    return new Response(new Uint8Array(pdf.data), {
      headers: {
        "Content-Type": pdf.mimeType,
        "Content-Disposition": `inline; filename="${sanitizeFilename(pdf.filename, "angebot.pdf")}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("public offer-pdf failed:", error)
    return Response.json({ error: "PDF konnte nicht geladen werden" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Versions-PDF**

```typescript
import { NextRequest } from "next/server"
import { hasAngebotAccess } from "@/lib/konfigurator/angebot-access"
import { getVersionOfferPdfByPublicToken } from "@/lib/konfigurator/quote-versions"
import { sanitizeFilename } from "@/lib/utils/sanitize-filename"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; versionNumber: string }> },
) {
  const { token, versionNumber: versionRaw } = await params
  const versionNumber = Number(versionRaw)
  if (!Number.isFinite(versionNumber) || versionNumber < 1) {
    return Response.json({ error: "Ungültige Version" }, { status: 400 })
  }
  if (!(await hasAngebotAccess(token))) {
    return Response.json({ error: "Zugang erforderlich" }, { status: 401 })
  }
  try {
    const pdf = await getVersionOfferPdfByPublicToken(token, versionNumber)
    if (!pdf) {
      return Response.json({ error: "Kein PDF vorhanden" }, { status: 404 })
    }
    return new Response(new Uint8Array(pdf.data), {
      headers: {
        "Content-Type": pdf.mimeType,
        "Content-Disposition": `inline; filename="${sanitizeFilename(pdf.filename, "angebot.pdf")}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("public version offer-pdf failed:", error)
    return Response.json({ error: "PDF konnte nicht geladen werden" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/angebot/[token]/offer-pdf/route.ts \
  app/api/angebot/[token]/versions/[versionNumber]/offer-pdf/route.ts
git commit -m "$(cat <<'EOF'
feat: öffentliche Angebots-PDF-Routen unter Token und PLZ-Zugang

EOF
)"
```

---

### Task 6: Statusseite + Änderungsverlauf UI

**Files:**
- Modify: `app/angebot/[token]/page.tsx`
- Modify: `components/angebot/angebot-status-view.tsx`
- Modify: `components/angebot/quote-version-timeline.tsx`

- [ ] **Step 1: Page — `hasOfferPdf` ableiten**

```tsx
  const hasOfferPdf = Boolean(quote.offer_pdf_filename)

  return (
    <AngebotStatusView
      quote={quote}
      fulfillmentEvents={fulfillmentEvents}
      versions={versions}
      canEdit={canEdit}
      hasOfferPdf={hasOfferPdf}
      paid={paid}
      cancelled={cancelled}
    />
  )
```

- [ ] **Step 2: `AngebotStatusView` — Prop + Button**

Props um `hasOfferPdf: boolean` erweitern. Im Status-Card-Bereich (z. B. nach Status-Badge / bei freigegebenem Angebot), wenn `hasOfferPdf`:

```tsx
{hasOfferPdf && (
  <Button asChild variant="outline">
    <a href={`/api/angebot/${quote.public_token}/offer-pdf`} target="_blank" rel="noopener noreferrer">
      Angebot als PDF
    </a>
  </Button>
)}
```

(`quote.public_token` muss am `QuoteRequest`-Typ verfügbar sein — ist es bereits.)

- [ ] **Step 3: Timeline — PDF-Link**

`QuoteVersionTimeline` um optionales `publicToken?: string` erweitern. Pro Version:

```tsx
{publicToken && version.has_offer_pdf && (
  <p className="text-sm mt-1">
    <a
      href={`/api/angebot/${publicToken}/versions/${version.version_number}/offer-pdf`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      PDF
    </a>
  </p>
)}
```

In `AngebotStatusView`:

```tsx
<QuoteVersionTimeline versions={versions} publicToken={quote.public_token} />
```

Admin-Aufrufe ohne `publicToken` zeigen keinen Kunden-PDF-Link (weiterhin ok; Admin nutzt eigene Route).

- [ ] **Step 4: Default für `has_offer_pdf` bei Alt-Typen**

Falls irgendwo noch Row-Shapes ohne Flag ankommen: in der Timeline `Boolean(version.has_offer_pdf)` verwenden.

- [ ] **Step 5: Commit**

```bash
git add app/angebot/[token]/page.tsx \
  components/angebot/angebot-status-view.tsx \
  components/angebot/quote-version-timeline.tsx
git commit -m "$(cat <<'EOF'
feat: Angebots-PDF und Versions-PDFs auf der Kunden-Statusseite

EOF
)"
```

---

### Task 7: Spec-Status + Verifikation

**Files:**
- Modify: `docs/superpowers/specs/2026-07-16-customer-edit-gruppen-pdf-design.md`
- Optional Kurzverweis in Parent-Spec Plan-Zeile

- [ ] **Step 1: Feature-Spec Status**

```markdown
**Status:** Freigegeben — implementiert  
**Plan:** `docs/superpowers/plans/2026-07-16-customer-edit-gruppen-pdf.md`
```

- [ ] **Step 2: Tests + Typecheck**

```bash
npm run test:quote-versions
npx tsc --noEmit
```

Expected: Quote-Versions-Tests grün; keine neuen TS-Fehler durch geänderte Props/Typen.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-16-customer-edit-gruppen-pdf-design.md
git commit -m "$(cat <<'EOF'
docs: Spec-Status Kunden-Edit Gruppen und PDF-Historie

EOF
)"
```

---

## Spec coverage

| Spec-Punkt | Task |
|---|---|
| Gruppen aus LOCKED_KEYS | 1 |
| Change-Summary Gruppen | 1 |
| Wizard Slider freigeben | 2 |
| Station bleibt locked | 1 (Test) + 2 (UI unverändert) |
| Migration 25 PDF auf Versionen | 3 |
| List ohne BYTEA / `has_offer_pdf` | 3 |
| Snapshot auf latest vor neuer Version | 3+4 |
| Clear `offer_pdf_*` nach Edit | 4 |
| Public current + version PDF routes | 5 |
| UI Button + Timeline-Links | 6 |
| Kein Snapshot bei Admin-Replace | (bewusst kein Code) |
| Docs Status | 7 |

## Self-review notes

- Keine TBD/Placeholder.
- Snapshot **vor** `insertQuoteVersion(N+1)`, damit PDF auf der abgeschlossenen Version landet.
- `listQuoteVersions` darf kein `SELECT *` mehr nutzen (BYTEA-Last + Spec).
- Admin-Timeline ohne `publicToken` bleibt ohne Kunden-PDF-Links.
