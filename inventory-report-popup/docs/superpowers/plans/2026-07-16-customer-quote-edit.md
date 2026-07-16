# Customer Quote Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kunden können bis zur Zahlung über denselben Angebots-Link Menge/Logo/Upsells ändern; jede Änderung wird versioniert, Status geht zurück auf Prüfung, Ampel ohne Stückzahlen/Untertitel.

**Architecture:** Append-only Tabelle `quote_request_versions`; Update-API unter Token + PLZ-Cookie; Konfigurator im Edit-Modus (`?edit=[token]`) ohne E-Mail-Gate; Cookie-Pfad von `/angebot` auf `/` erweitern, damit Wizard und API den Zugang sehen.

**Tech Stack:** Next.js 15 App Router, Neon SQL (`lib/db.ts`), bestehende Preis-Engine, Availability/Ampel (`availability-stress`), Hold-Buchungen (`quote-booking-internal`), Telegram.

**Spec:** `docs/superpowers/specs/2026-07-16-customer-quote-edit-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `scripts/migration/24-quote-request-versions.sql` | Schema Versions |
| `lib/konfigurator/quote-versions.ts` | Types, CRUD, change_summary, ensureVersion1 |
| `lib/konfigurator/quote-customer-edit.ts` | `canCustomerEditQuote`, merge locked fields, map stress→level |
| `lib/quotes-internal.ts` | `updateQuoteByPublicToken`, Version-1 bei Create, Stripe clear |
| `lib/konfigurator/angebot-access.ts` | Cookie `path: "/"` |
| `app/api/konfigurator/update/[token]/route.ts` | Public Update-API |
| `app/api/konfigurator/edit-session/[token]/route.ts` | Prefill-Config für Edit (GET) |
| `app/konfigurator/page.tsx` + `konfigurator-client.tsx` | `?edit=` Bypass EmailGate |
| `components/konfigurator/configurator-wizard.tsx` | Edit-Flags, CTA, locked date/contact |
| `components/konfigurator/availability-indicator.tsx` | Prop `customerFacing` ohne pending-Counts |
| `components/angebot/angebot-status-view.tsx` | Button + Chronologie |
| `components/angebot/quote-version-timeline.tsx` | Shared Timeline UI |
| `components/admin/…` (Auftrag-Info) | Admin-Timeline |
| `scripts/test-quote-versions.ts` | Pure-Logic-Tests |

---

### Task 1: Migration + Status-Helper

**Files:**
- Create: `scripts/migration/24-quote-request-versions.sql`
- Modify: `lib/konfigurator/quote-status.ts`
- Modify: `lib/konfigurator/types.ts` (optional type export only if needed later)

Hinweis: `23-sku-lot-unique.sql` existiert bereits — daher Nummer **24**.

- [ ] **Step 1: Migration anlegen**

```sql
-- scripts/migration/24-quote-request-versions.sql
CREATE TABLE IF NOT EXISTS quote_request_versions (
  id SERIAL PRIMARY KEY,
  quote_request_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  config_json JSONB NOT NULL,
  price_snapshot_json JSONB NOT NULL,
  availability_level TEXT NOT NULL CHECK (availability_level IN ('green', 'yellow', 'red')),
  availability_label TEXT,
  changed_by TEXT NOT NULL CHECK (changed_by IN ('customer', 'admin', 'system')),
  change_summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quote_request_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_quote_request_versions_quote
  ON quote_request_versions (quote_request_id, version_number DESC);
```

- [ ] **Step 2: Edit-Helper in quote-status**

In `lib/konfigurator/quote-status.ts` ergänzen:

```ts
/** Status, in denen Kunden die Anfrage noch ändern dürfen (bis Zahlung). */
export const CUSTOMER_EDITABLE_STATUSES: QuoteStatus[] = [
  "submitted",
  "approved",
  "payment_pending",
]

export function canCustomerEditQuoteStatus(status: QuoteStatus): boolean {
  return CUSTOMER_EDITABLE_STATUSES.includes(status)
}
```

Hinweis: `ACTIVE_STATUSES` ist inhaltlich gleich — `CUSTOMER_EDITABLE_STATUSES` trotzdem explizit halten (Spec-Semantik).

- [ ] **Step 3: Commit**

```bash
git add scripts/migration/24-quote-request-versions.sql lib/konfigurator/quote-status.ts
git commit -m "$(cat <<'EOF'
feat: add quote_request_versions schema and customer-edit status helper

EOF
)"
```

Paths relativ zu `inventory-report-popup/` im Repo-Root.

---

### Task 2: Version-Logic (pure) + Tests

**Files:**
- Create: `lib/konfigurator/quote-versions.ts`
- Create: `lib/konfigurator/quote-customer-edit.ts`
- Create: `scripts/test-quote-versions.ts`
- Modify: `package.json` (script `test:quote-versions`)

- [ ] **Step 1: Failing test script schreiben**

```ts
// scripts/test-quote-versions.ts
import { buildChangeSummary, mergeCustomerEditConfig } from "../lib/konfigurator/quote-customer-edit"
import { mapStressToAvailabilityLevel } from "../lib/konfigurator/quote-customer-edit"
import type { QuoteConfig } from "../lib/konfigurator/types"

const base: QuoteConfig = {
  produkt: "armband",
  modus: "miete",
  menge: 500,
  von: "2026-09-12",
  bis: "2026-09-14",
  druck: true,
  druckArt: "logo",
  logoId: "abc",
  lieferpaket: "regulaer",
  flexRueckgabe: false,
  gruppen: 0,
  station: "keine",
  stationModus: "miete",
  lieferzeit: "standard",
  land: "DE",
  kontaktName: "Max",
  kontaktPlz: "10115",
  techniker: false,
}

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg)
    failed++
  } else {
    console.log("OK:", msg)
  }
}

// Eventdatum + Kontakt bleiben, Menge/Flex ändern
const patched = { ...base, menge: 600, flexRueckgabe: true, von: "2099-01-01", kontaktName: "Hacker" }
const merged = mergeCustomerEditConfig(base, patched)
assert(merged.von === "2026-09-12", "von locked")
assert(merged.bis === "2026-09-14", "bis locked")
assert(merged.kontaktName === "Max", "kontakt locked")
assert(merged.menge === 600, "menge editable")
assert(merged.flexRueckgabe === true, "flex editable")

const summary = buildChangeSummary(base, merged)
assert(summary.includes("Menge"), "summary mentions Menge")
assert(summary.includes("Flex"), "summary mentions Flex")

assert(mapStressToAvailabilityLevel("green") === "green", "map green")
assert(mapStressToAvailabilityLevel("yellow") === "yellow", "map yellow")
assert(mapStressToAvailabilityLevel("red") === "red", "map red")

if (failed) {
  console.error(`${failed} failed`)
  process.exit(1)
}
console.log("All passed")
```

- [ ] **Step 2: Test ausführen (erwartet FAIL – Module fehlen)**

Run: `npx tsx scripts/test-quote-versions.ts`  
Expected: FAIL (cannot find module)

- [ ] **Step 3: Implementierung**

```ts
// lib/konfigurator/quote-customer-edit.ts
import type { QuoteConfig } from "@/lib/konfigurator/types"
import type { AvailabilityStressLevel } from "@/lib/konfigurator/availability-stress"

const LOCKED_KEYS: (keyof QuoteConfig)[] = [
  "von",
  "bis",
  "kontaktName",
  "kontaktFirma",
  "kontaktTelefon",
  "kontaktStrasse",
  "kontaktPlz",
  "kontaktOrt",
  "produkt",
  "modus",
  "station",
  "stationModus",
  "gruppen",
  "gruppenGroessen",
  "kanalanzahl",
  "land",
  "szenario",
  "variante",
]

/** Erlaubte Kunden-Felder laut Spec: Menge, Logo/Branding, Techniker, Druck, Flex, Lieferoptionen */
export function mergeCustomerEditConfig(
  previous: QuoteConfig,
  incoming: QuoteConfig,
): QuoteConfig {
  const next: QuoteConfig = { ...incoming }
  for (const key of LOCKED_KEYS) {
    if (key in previous) {
      ;(next as Record<string, unknown>)[key as string] = previous[key]
    }
  }
  return next
}

export function buildChangeSummary(before: QuoteConfig, after: QuoteConfig): string {
  const parts: string[] = []
  if (before.menge !== after.menge) parts.push(`Menge ${before.menge}→${after.menge}`)
  if (before.logoId !== after.logoId) parts.push("Logo")
  if (before.druck !== after.druck || before.druckArt !== after.druckArt) parts.push("Druck")
  if (before.probedruckOption !== after.probedruckOption) parts.push("Probedruck")
  if (Boolean(before.techniker) !== Boolean(after.techniker) || before.technikerTage !== after.technikerTage) {
    parts.push("Techniker")
  }
  if (Boolean(before.flexRueckgabe ?? before.flex) !== Boolean(after.flexRueckgabe ?? after.flex)) {
    parts.push("Flex")
  }
  if (before.lieferpaket !== after.lieferpaket || before.lieferart !== after.lieferart || before.lieferzeit !== after.lieferzeit) {
    parts.push("Lieferung")
  }
  return parts.length ? parts.join(" · ") : "Konfiguration angepasst"
}

export function mapStressToAvailabilityLevel(
  level: AvailabilityStressLevel,
): AvailabilityStressLevel {
  return level
}
```

```ts
// lib/konfigurator/quote-versions.ts
import { getDb } from "@/lib/db"
import type { QuoteConfig } from "@/lib/konfigurator/types"
import type { AvailabilityStressLevel } from "@/lib/konfigurator/availability-stress"

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
}

export async function listQuoteVersions(quoteRequestId: number): Promise<QuoteVersionRow[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM quote_request_versions
    WHERE quote_request_id = ${quoteRequestId}
    ORDER BY version_number DESC
  `
  return rows as QuoteVersionRow[]
}

export async function getNextVersionNumber(quoteRequestId: number): Promise<number> {
  const sql = getDb()
  const rows = await sql`
    SELECT COALESCE(MAX(version_number), 0) AS max_v
    FROM quote_request_versions
    WHERE quote_request_id = ${quoteRequestId}
  `
  return Number(rows[0]?.max_v ?? 0) + 1
}

export async function insertQuoteVersion(input: {
  quoteRequestId: number
  versionNumber: number
  config: QuoteConfig
  price: Record<string, unknown>
  availabilityLevel: AvailabilityStressLevel
  availabilityLabel?: string | null
  changedBy: "customer" | "admin" | "system"
  changeSummary: string
}): Promise<void> {
  const sql = getDb()
  await sql`
    INSERT INTO quote_request_versions (
      quote_request_id, version_number, config_json, price_snapshot_json,
      availability_level, availability_label, changed_by, change_summary
    ) VALUES (
      ${input.quoteRequestId},
      ${input.versionNumber},
      ${JSON.stringify(input.config)},
      ${JSON.stringify(input.price)},
      ${input.availabilityLevel},
      ${input.availabilityLabel ?? null},
      ${input.changedBy},
      ${input.changeSummary}
    )
  `
}

/** Legt Version 1 aus aktuellem Stand an, falls noch keine Version existiert. */
export async function ensureInitialQuoteVersion(input: {
  quoteRequestId: number
  config: QuoteConfig
  price: Record<string, unknown>
  changedBy?: "customer" | "admin" | "system"
}): Promise<void> {
  const sql = getDb()
  const existing = await sql`
    SELECT id FROM quote_request_versions
    WHERE quote_request_id = ${input.quoteRequestId}
    LIMIT 1
  `
  if (existing.length > 0) return
  await insertQuoteVersion({
    quoteRequestId: input.quoteRequestId,
    versionNumber: 1,
    config: input.config,
    price: input.price,
    availabilityLevel: "green",
    availabilityLabel: null,
    changedBy: input.changedBy ?? "system",
    changeSummary: "Erst-Anfrage",
  })
}
```

- [ ] **Step 4: package.json Script**

```json
"test:quote-versions": "tsx scripts/test-quote-versions.ts"
```

- [ ] **Step 5: Tests grün**

Run: `pnpm test:quote-versions`  
Expected: `All passed`

- [ ] **Step 6: Commit**

```bash
git add lib/konfigurator/quote-customer-edit.ts lib/konfigurator/quote-versions.ts scripts/test-quote-versions.ts package.json
git commit -m "$(cat <<'EOF'
feat: add quote version helpers and customer-edit merge logic

EOF
)"
```

---

### Task 3: Cookie-Pfad für Edit + API

**Files:**
- Modify: `lib/konfigurator/angebot-access.ts`

- [ ] **Step 1: Cookie-Path auf `/` setzen**

In `setAngebotAccess`:

```ts
  cookieStore.set(ANGEBOT_ACCESS_COOKIE, signAngebotToken(publicToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ANGEBOT_ACCESS_MAX_AGE,
    path: "/", // vorher "/angebot" — nötig für /konfigurator?edit= und Update-API
  })
```

Hinweis: Bestehende Cookies mit `path=/angebot` bleiben bis Ablauf gültig für `/angebot/*`; Nutzer müssen PLZ ggf. einmal neu eingeben, wenn sie direkt zum Konfigurator springen. Optional später: beim Unlock beide Paths setzen — YAGNI, `/` reicht.

- [ ] **Step 2: Commit**

```bash
git add lib/konfigurator/angebot-access.ts
git commit -m "$(cat <<'EOF'
fix: broaden angebot access cookie path for configurator edit

EOF
)"
```

---

### Task 4: Core `updateQuoteByPublicToken`

**Files:**
- Modify: `lib/quotes-internal.ts`
- Modify: `lib/actions/quotes.ts` (thin re-export / server action if needed)

- [ ] **Step 1: Funktion implementieren**

In `lib/quotes-internal.ts` (Imports ergänzen: `canCustomerEditQuoteStatus`, `mergeCustomerEditConfig`, `buildChangeSummary`, `ensureInitialQuoteVersion`, `insertQuoteVersion`, `getNextVersionNumber`, `releaseQuoteBooking`, `createQuoteHoldBooking`, `rechnePreis`, `checkProductAvailability` oder bestehende Availability-Pipeline, `sendQuoteTelegramNotification`):

```ts
export async function updateQuoteByPublicToken(input: {
  publicToken: string
  incomingConfig: QuoteConfig
  availabilityLevel: "green" | "yellow" | "red"
  availabilityLabel?: string | null
}): Promise<{ success: boolean; error?: string; quoteId?: number }> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM quote_requests WHERE public_token = ${input.publicToken} LIMIT 1
  `
  if (!rows[0]) return { success: false, error: "Anfrage nicht gefunden" }
  const quote = mapQuoteRow(rows[0]) // bestehende Mapper-Hilfe nutzen / analog getQuoteByPublicToken

  if (!canCustomerEditQuoteStatus(quote.status)) {
    return { success: false, error: "Änderung in diesem Status nicht möglich" }
  }

  const previous = quote.config_json as QuoteConfig
  const merged = mergeCustomerEditConfig(previous, input.incomingConfig)
  const price = rechnePreis(merged)
  if (!price.gueltig) {
    return { success: false, error: "Konfiguration ungültig" }
  }

  await ensureInitialQuoteVersion({
    quoteRequestId: quote.id,
    config: previous,
    price: quote.price_snapshot_json as Record<string, unknown>,
    changedBy: "system",
  })

  const versionNumber = await getNextVersionNumber(quote.id)
  const changeSummary = buildChangeSummary(previous, merged)

  await insertQuoteVersion({
    quoteRequestId: quote.id,
    versionNumber,
    config: merged,
    price: price as unknown as Record<string, unknown>,
    availabilityLevel: input.availabilityLevel,
    availabilityLabel: input.availabilityLabel ?? null,
    changedBy: "customer",
    changeSummary,
  })

  await releaseQuoteBooking(quote.booking_id)
  const hold = await createQuoteHoldBooking(quote.id, merged, quote.lead_email)
  // Hold-Fehler: trotzdem speichern + Warnung (Spec)
  let holdWarning: string | null = null
  let newBookingId: number | null = null
  if (!hold.success) {
    holdWarning = hold.error || "Hold fehlgeschlagen"
  } else {
    newBookingId = hold.bookingId ?? null
  }

  await sql`
    UPDATE quote_requests SET
      config_json = ${JSON.stringify(merged)},
      price_snapshot_json = ${JSON.stringify(price)},
      status = 'submitted',
      approved_at = NULL,
      expires_at = NULL,
      stripe_checkout_session_id = NULL,
      stripe_payment_link_url = NULL,
      booking_id = ${newBookingId},
      notes = CASE
        WHEN ${holdWarning}::text IS NOT NULL
        THEN COALESCE(notes || E'\n', '') || ${`[System] Hold nach Kundenänderung: ${holdWarning}`}
        ELSE notes
      END,
      updated_at = NOW()
    WHERE id = ${quote.id}
  `

  // Telegram (fire-and-forget pattern wie createQuoteWithHold)
  if (quote.lead_email) {
    void sendQuoteTelegramNotification({
      quoteId: quote.id,
      email: quote.lead_email,
      summary: `Kundenänderung: ${changeSummary}`,
      totalNetto: Number(price.gesamt_netto) || 0,
      totalBrutto: Number(price.gesamt_brutto) || 0,
      source: quote.source,
    }).catch((err) => console.error("Telegram customer-edit notify failed", err))
  }

  revalidatePath("/warenverwaltung/auftraege")
  revalidatePath(`/angebot/${input.publicToken}`)
  return { success: true, quoteId: quote.id }
}
```

Anpassungen an reale Mapper-/Preis-Feldnamen im File vornehmen (`mapQuoteRow` ggf. lokal extrahieren aus bestehendem SELECT-Mapping in `getQuoteByPublicToken`).

Beim Erst-Submit in `createQuoteWithHold` nach erfolgreichem Insert:

```ts
await ensureInitialQuoteVersion({
  quoteRequestId: quoteId,
  config: input.config,
  price: input.price as unknown as Record<string, unknown>,
  changedBy: "customer",
})
```

- [ ] **Step 2: Commit**

```bash
git add lib/quotes-internal.ts lib/actions/quotes.ts
git commit -m "$(cat <<'EOF'
feat: update quote by public token with versioning and hold refresh

EOF
)"
```

---

### Task 5: Public APIs (edit-session + update)

**Files:**
- Create: `app/api/konfigurator/edit-session/[token]/route.ts`
- Create: `app/api/konfigurator/update/[token]/route.ts`

- [ ] **Step 1: GET edit-session**

```ts
// app/api/konfigurator/edit-session/[token]/route.ts
import { getQuoteByPublicToken } from "@/lib/actions/quotes"
import { hasAngebotAccess } from "@/lib/konfigurator/angebot-access"
import { canCustomerEditQuoteStatus } from "@/lib/konfigurator/quote-status"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const allowed = await hasAngebotAccess(token)
  if (!allowed) {
    return Response.json({ error: "Zugang erforderlich" }, { status: 401 })
  }
  const quote = await getQuoteByPublicToken(token)
  if (!quote) return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  if (!canCustomerEditQuoteStatus(quote.status)) {
    return Response.json({ error: "Nicht editierbar" }, { status: 409 })
  }
  return Response.json({
    quoteId: quote.id,
    publicToken: quote.public_token,
    status: quote.status,
    config: quote.config_json,
    leadEmail: quote.lead_email,
  })
}
```

- [ ] **Step 2: POST update**

Analog `submit/route.ts`: Rate-Limit, Zod `quoteConfigSchema`, dann:

```ts
const access = await hasAngebotAccess(token)
if (!access) return Response.json({ error: "Zugang erforderlich" }, { status: 401 })

// Availability für Ampel-Level (Submit nicht blockieren)
const availability = await checkProductAvailability(/* from config */)
const level = availability.stressLevel // green|yellow|red

const result = await updateQuoteByPublicToken({
  publicToken: token,
  incomingConfig: config,
  availabilityLevel: level,
  availabilityLabel: availability.stressLabel,
})
if (!result.success) {
  return Response.json({ error: result.error }, { status: 400 })
}
return Response.json({ success: true, publicToken: token })
```

`checkProductAvailability` / Session-Action wie im Wizard nutzen (`lib/actions/n8n-api.ts`). Bei Fehler der Availability-Prüfung trotzdem Update mit `availabilityLevel: "yellow"` und ohne Block — lieber speichern als hart failen.

- [ ] **Step 3: Commit**

```bash
git add app/api/konfigurator/edit-session app/api/konfigurator/update
git commit -m "$(cat <<'EOF'
feat: add public edit-session and quote update API routes

EOF
)"
```

---

### Task 6: Konfigurator Edit-Modus (Page + Client + Wizard)

**Files:**
- Modify: `app/konfigurator/page.tsx`
- Modify: `components/konfigurator/konfigurator-client.tsx`
- Modify: `components/konfigurator/configurator-wizard.tsx`

- [ ] **Step 1: Page liest `searchParams.edit`**

```tsx
// app/konfigurator/page.tsx
export default async function KonfiguratorPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const lead = await getVerifiedLead()
  return (
    // ...header...
    <KonfiguratorClient
      editToken={edit}
      initialVerified={Boolean(lead) || Boolean(edit)}
      initialEmail={lead?.email}
      initialContact={{...}}
    />
  )
}
```

- [ ] **Step 2: Client lädt Prefill bei `editToken`**

Wenn `editToken`: `fetch(/api/konfigurator/edit-session/${editToken})` — bei 401 Redirect zu `/angebot/${editToken}` (PLZ-Gate). Bei OK: Wizard mit `editMode`, `initialConfig`, `editToken`.

Ohne erfolgreiche Session und ohne Lead: weiterhin EmailGate (außer editToken-Pfad).

- [ ] **Step 3: Wizard-Anpassungen**

Props ergänzen:

```ts
editMode?: boolean
editToken?: string
initialConfig?: QuoteConfig
```

Verhalten:
- `useState` initial aus `initialConfig` statt nur `DEFAULT_CONFIG`
- Banner oben: „Du änderst Anfrage … Nach dem Absenden prüfen wir erneut.“
- Eventdatum-Inputs: `disabled` / read-only wenn `editMode`
- Kontaktfelder (Name/Firma/Telefon/Adresse/PLZ): read-only wenn `editMode`
- Submit: wenn `editMode` → `POST /api/konfigurator/update/${editToken}` statt submit; danach `router.push(/angebot/${editToken})`
- CTA-Text: „Änderung absenden“
- Availability darf Submit **nicht** blockieren wenn `editMode` (bestehende Guards wie `step2AvailabilityInvalid` für Navigation lockern bzw. Final-Submit erlauben)

- [ ] **Step 4: Commit**

```bash
git add app/konfigurator/page.tsx components/konfigurator/konfigurator-client.tsx components/konfigurator/configurator-wizard.tsx
git commit -m "$(cat <<'EOF'
feat: configurator edit mode prefilled from angebot token

EOF
)"
```

---

### Task 7: Ampel kundenfreundlich

**Files:**
- Modify: `components/konfigurator/availability-indicator.tsx`
- Modify: `components/konfigurator/configurator-wizard.tsx` (Prop durchreichen)

- [ ] **Step 1: Prop `hideDetails`**

```tsx
export function AvailabilityIndicator({
  availability,
  loading,
  hideDetails = false,
}: {
  availability: AvailabilityResponse | null
  loading?: boolean
  hideDetails?: boolean
}) {
  // ... stress bar bleibt ...
  // stressLabel in der Kopfzeile: bei hideDetails weglassen (nur Titel „Aktuelle Verfügbarkeit“)
  // Block `{availability.hinweis && ...}`: bei hideDetails nicht rendern
  // Block `pendingInquiries`: bei hideDetails nicht rendern
  // Stand-Datum-Zeile: darf bleiben (kein Lagerbestand)
}
```

Im Edit-Modus: `<AvailabilityIndicator hideDetails />`. Optional auch Station-Indicator analog, falls Zahlen/Untertitel dort auftauchen.

- [ ] **Step 2: Commit**

```bash
git add components/konfigurator/availability-indicator.tsx components/konfigurator/configurator-wizard.tsx
git commit -m "$(cat <<'EOF'
feat: hide availability detail copy for customer-facing ampel

EOF
)"
```

---

### Task 8: Statusseite — Button + Chronologie

**Files:**
- Create: `components/angebot/quote-version-timeline.tsx`
- Modify: `components/angebot/angebot-status-view.tsx`
- Modify: `app/angebot/[token]/page.tsx`
- Modify: `lib/actions/quotes.ts` — `getQuoteVersionsForPublic` / reuse `listQuoteVersions`

- [ ] **Step 1: Timeline-Komponente**

```tsx
// components/angebot/quote-version-timeline.tsx
// Props: versions: QuoteVersionRow[]
// Neu → alt; Punkt in Farbe green/yellow/red; change_summary; „aktuell“ auf version_number max
// Keine Stückzahlen, keine Untertitel unter der Ampel
```

Ampel-Punkt:

```tsx
const color = { green: "bg-green-500", yellow: "bg-yellow-400", red: "bg-red-500" }[v.availability_level]
```

- [ ] **Step 2: AngebotStatusView**

- Prop `versions` + `canEdit`
- Wenn `canEdit`: Link/Button → `/konfigurator?edit=${quote.public_token}`
- Nach Edit (status submitted): Copy „Eingegangen — wird erneut geprüft“ ist bereits über Status-Label abgedeckt; ggf. kurze Zusatzzeile wenn `versions.length > 1`
- Timeline unter Config/Preis

- [ ] **Step 3: Page lädt Versionen**

```tsx
const versions = await listQuoteVersions(quote.id)
const canEdit = canCustomerEditQuoteStatus(quote.status)
```

- [ ] **Step 4: Commit**

```bash
git add components/angebot app/angebot lib/actions/quotes.ts
git commit -m "$(cat <<'EOF'
feat: show edit CTA and version chronology on angebot page

EOF
)"
```

---

### Task 9: Admin-Timeline

**Files:**
- Modify: passende Auftrag-Detail-Komponente (z. B. `components/admin/auftrag-info-tab.tsx` oder Workflow-Panel — beim Implementieren die Stelle suchen, wo Config/Status gezeigt wird)

- [ ] **Step 1: `listQuoteVersions(quote.id)` im Server-Parent laden und Timeline einbinden**

Gleiche `QuoteVersionTimeline` mit Prop `showActor` (zeigt `changed_by`: Kunde/Admin/System).

- [ ] **Step 2: Commit**

```bash
git add components/admin
git commit -m "$(cat <<'EOF'
feat: show quote version history in admin order view

EOF
)"
```

---

### Task 10: Verifikation & Docs

**Files:**
- Modify: `docs/konfigurator.md` (kurzer Abschnitt „Kundenänderung“)
- Modify: Spec-Status auf „Freigegeben / in Umsetzung“

- [ ] **Step 1: Migration auf Dev-DB anwenden** (projektüblicher Weg; falls Script existiert nutzen)

- [ ] **Step 2: Manuelle Checkliste**

1. Anfrage anlegen → Version 1 existiert  
2. `/angebot/token` → PLZ → „Anfrage ändern“ sichtbar  
3. Menge ändern → Ampel ohne Untertitel/Zahlen → absenden auch bei Rot  
4. Status `submitted`, Chronologie Version 2, Stripe-Link weg  
5. Eventdatum im Network-Payload manipulieren → Server behält Original  
6. Nach `paid` kein Edit-Button / API 409  

- [ ] **Step 3: Automatisierte Tests**

Run:
```bash
pnpm test:quote-versions
pnpm test:preis-engine
pnpm lint
pnpm build
```

Expected: alle grün

- [ ] **Step 4: Commit Docs**

```bash
git add docs/konfigurator.md docs/superpowers/specs/2026-07-16-customer-quote-edit-design.md
git commit -m "$(cat <<'EOF'
docs: document customer quote edit via angebot link

EOF
)"
```

---

## Spec coverage checklist

| Spec-Anforderung | Task |
|---|---|
| Edit bis Zahlung | 1, 4, 8 |
| Zurück auf submitted + Stripe invalid | 4 |
| Absenden trotz rot | 6 |
| Felder Menge/Logo/Druck/Techniker/Flex/Lieferung | 2, 6 |
| Eventdatum gesperrt (Client+Server) | 2, 6 |
| Wizard Edit-Modus | 6 |
| Versionstabelle | 1, 2, 4 |
| Ampel ohne Untertitel/Zahlen | 7 |
| Chronologie Kunde + Admin | 8, 9 |
| Telegram bei Änderung | 4 |
| Hold erneuern / Warnung bei Fail | 4 |
| Cookie für Konfigurator/API | 3 |

## Self-review notes

- Cookie-Path-Änderung ist Voraussetzung für Spec-Route `/konfigurator?edit=` — im Plan Task 3.  
- `mapQuoteRow` / Availability-Aufruf an bestehende Hilfsfunktionen anpassen (keine neuen Parallel-Implementierungen).  
- Keine Jest-Suite: Tests analog `scripts/test-*.ts`.  
- Optional Kunden-Mail „Änderung eingegangen“ bewusst weggelassen (Spec: optional) — YAGNI bis explizit gewünscht.
