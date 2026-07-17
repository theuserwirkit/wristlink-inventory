# Lieferpaket-Vorlauf Werktage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lieferpaket-Freigabe und Packlisten-Versand auf echte Werktage umstellen: Produktion + Versand + Ankunftspuffer statt Kalender-Näherung nur aus Produktionszeit.

**Architecture:** Neue Pure-Helpers `workdaysUntilEvent` und `minWerktageForPaket` in `lieferpaket.ts` / `date.ts`. Freigabe-Funktionen vergleichen Werktage bis Event gegen die Summenformel. Wizard speist Lieferpaket-Checks mit Werktagen (Ampel/Techniker bleiben auf Kalendertagen). Packlisten-Transit wird auf 2 Werktage vereinheitlicht.

**Tech Stack:** TypeScript, bestehende `tsx`-Script-Tests, `addWorkdays`/`subtractWorkdays` in `lib/utils/date.ts`

**Spec:** `docs/superpowers/specs/2026-07-16-lieferpaket-werktage-vorlauf-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `lib/utils/date.ts` | `workdaysUntil` (echte Mo–Fr-Zählung) |
| `lib/konfigurator/lieferpaket.ts` | Konstanten, `minWerktageForPaket`, Freigabe/Warnung auf Werktagen |
| `scripts/test-lieferpaket.ts` | Unit-Tests Freigabe-Formel + 16.→30.07.-Beispiel |
| `lib/konfigurator/fulfillment-timing.ts` | Pack-Versand = 2 WT; Flex-Extra Transit entfernen |
| `scripts/test-fulfillment-timing.ts` | Erwartete Versanddaten anpassen |
| `components/konfigurator/configurator-wizard.tsx` | `werktageBisEvent` für Lieferpaket/Flex; Warntexte „Werktag(e)“ |
| `docs/konfigurator.md` | Min-WT-Tabelle + Packlisten-Transit |
| `docs/superpowers/specs/2026-07-16-lieferpaket-werktage-vorlauf-design.md` | Status → freigegeben/implementiert |
| `package.json` | optional `test:lieferpaket` / `test:fulfillment-timing` Scripts |

**Unverändert lassen:** Ampel/`daysUntilEvent` Kalender, Techniker-Mindestvorlauf (weiter Kalendertage), Preise, Rückversandfristen.

**Formel (Referenz):**

| Paket | min WT |
|---|---|
| Regulär | 24 (= 20+2+2) |
| Express | 14 (= 10+2+2) |
| Eil | 3 (= 2+1) |
| Regulär+Flex | 27 |
| Express+Flex | 17 |

`workdaysUntil`: Zähle Werktage **nach** `from` und **bis einschließlich** Eventdatum.

---

### Task 1: `workdaysUntil` + Tests (TDD)

**Files:**
- Modify: `lib/utils/date.ts`
- Modify: `scripts/test-lieferpaket.ts` (zuerst nur Zähl-Tests ergänzen; voller Rewrite in Task 2)
- Modify: `package.json`

- [ ] **Step 1: Failing test für Werktage-Zählung in `scripts/test-lieferpaket.ts` anlegen/erweitern**

Am Anfang der Datei (nach Imports) sicherstellen, dass importiert wird:

```typescript
import { workdaysUntil } from "../lib/utils/date"
```

Tests (vorerst; alte Assertions bleiben und failen später in Task 2):

```typescript
assert(
  "16.→30.07.2026 = 10 Werktage",
  workdaysUntil(new Date("2026-07-16T12:00:00"), new Date("2026-07-30T12:00:00")) === 10,
)
assert(
  "gleicher Tag = 0",
  workdaysUntil(new Date("2026-07-16T12:00:00"), new Date("2026-07-16T12:00:00")) === 0,
)
assert(
  "Fr→Mo = 1 Werktag",
  workdaysUntil(new Date("2026-07-17T12:00:00"), new Date("2026-07-20T12:00:00")) === 1,
)
```

- [ ] **Step 2: Test ausführen — erwartet FAIL (export fehlt)**

Run: `npx tsx scripts/test-lieferpaket.ts`  
Expected: Import-/Reference-Error für `workdaysUntil`

- [ ] **Step 3: `workdaysUntil` in `lib/utils/date.ts` implementieren**

```typescript
/** Werktage streng nach `from` bis einschließlich `to` (Mo–Fr). Wochenenden zählen nicht. */
export function workdaysUntil(from: Date, to: Date): number {
  const start = new Date(from)
  start.setHours(12, 0, 0, 0)
  const end = new Date(to)
  end.setHours(12, 0, 0, 0)
  if (end.getTime() < start.getTime()) {
    return -workdaysUntil(end, start)
  }
  let count = 0
  const d = new Date(start)
  while (d.getTime() < end.getTime()) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}
```

- [ ] **Step 4: Tests erneut — die drei neuen Assertions PASS** (alte Freigabe-Tests können noch PASS oder später in Task 2 umgeschrieben werden; wenn die Datei wegen alter Asserts noch grün ist, ok)

Run: `npx tsx scripts/test-lieferpaket.ts`

- [ ] **Step 5: Script in `package.json`**

```json
"test:lieferpaket": "tsx scripts/test-lieferpaket.ts",
"test:fulfillment-timing": "tsx scripts/test-fulfillment-timing.ts"
```

- [ ] **Step 6: Commit**

```bash
git add lib/utils/date.ts scripts/test-lieferpaket.ts package.json
git commit -m "$(cat <<'EOF'
feat: workdaysUntil für echte Werktage-Zählung bis Event

EOF
)"
```

---

### Task 2: `minWerktageForPaket` + Freigabe-Logik (TDD)

**Files:**
- Modify: `lib/konfigurator/lieferpaket.ts`
- Modify: `scripts/test-lieferpaket.ts`
- Modify: `lib/konfigurator/lieferzeit.ts` (nur falls `minTage`/Signatur bricht — Legacy-Shims anpassen)

- [ ] **Step 1: Tests in `scripts/test-lieferpaket.ts` auf neue Formel umschreiben**

Ersetze die alten Kalender-Assertions durch:

```typescript
import {
  LIEFERPAKET_PREIS,
  applyLieferpaket,
  firstAllowedLieferpaket,
  getLieferpaketBlockReason,
  getLieferpaketWarning,
  hasAllowedLieferpaket,
  isFlexRueckgabeAllowed,
  isLieferpaketAllowed,
  isTechnikerAllowed,
  minWerktageForPaket,
  normalizeLieferpaket,
  workdaysUntilEvent,
} from "../lib/konfigurator/lieferpaket"
import { workdaysUntil } from "../lib/utils/date"
import { rechnePreis } from "../lib/pricing/preis-engine"

// … assert helper …

assert("Regulär min = 24", minWerktageForPaket("regulaer", false) === 24)
assert("Express min = 14", minWerktageForPaket("express", false) === 14)
assert("Eil min = 3", minWerktageForPaket("eil", false) === 3)
assert("Express+Flex min = 17", minWerktageForPaket("express", true) === 17)
assert("Regulär+Flex min = 27", minWerktageForPaket("regulaer", true) === 27)

assert(
  "16.→30.07.2026 = 10 Werktage",
  workdaysUntil(new Date("2026-07-16T12:00:00"), new Date("2026-07-30T12:00:00")) === 10,
)
assert(
  "workdaysUntilEvent Wrapper",
  workdaysUntilEvent("2026-07-30", new Date("2026-07-16T12:00:00")) === 10,
)

assert("10 WT: nur Eil", firstAllowedLieferpaket(10) === "eil")
assert("10 WT: Express gesperrt", !isLieferpaketAllowed("express", 10))
assert("10 WT: Regulär gesperrt", !isLieferpaketAllowed("regulaer", 10))
assert("14 WT: Express ja, Regulär nein", isLieferpaketAllowed("express", 14) && !isLieferpaketAllowed("regulaer", 14))
assert("24 WT: Regulär ja", isLieferpaketAllowed("regulaer", 24))
assert("2 WT: kein Paket", !hasAllowedLieferpaket(2))
assert("3 WT: nur Eil", firstAllowedLieferpaket(3) === "eil")

assert(
  "14 WT: Express+Flex nicht",
  !isFlexRueckgabeAllowed(14, "express"),
)
assert(
  "17 WT: Express+Flex ja",
  isFlexRueckgabeAllowed(17, "express"),
)
assert("Flex nie bei Eil", !isFlexRueckgabeAllowed(30, "eil"))

assert(
  "Warnung bei 10 WT nennt Regulär und Express",
  getLieferpaketWarning(10) ===
    "Bei nur noch 10 Werktagen bis zum Event sind Regulär, Express nicht verfügbar.",
)

assert(
  "Eil mit Druck bei 10 WT wählbar",
  isLieferpaketAllowed("eil", 10, { hasDruck: true }) &&
    getLieferpaketBlockReason("eil", 10, { hasDruck: true }) === null,
)

// bestehende Preis-/apply-/normalize-/Techniker-Tests beibehalten:
assert("Regulär = 100 EUR", LIEFERPAKET_PREIS.regulaer === 100)
assert("Eilauftrag = 919 EUR", LIEFERPAKET_PREIS.eil === 919)
// … restliche preis/apply/normalize/Techniker asserts wie bisher …
assert("Techniker ab 7 Tagen", isTechnikerAllowed(7))
assert("Techniker nicht unter 7 Tagen", !isTechnikerAllowed(6))
```

Hinweis: `isTechnikerAllowed` bleibt bewusst auf dem übergebenen Zahlenwert (Wizard gibt weiter **Kalendertage**).

- [ ] **Step 2: Tests ausführen — erwartet FAIL**

Run: `npx tsx scripts/test-lieferpaket.ts`  
Expected: FAIL (`minWerktageForPaket` / neue Schwellen fehlen)

- [ ] **Step 3: `lieferpaket.ts` umbauen**

Konstanten und Kernfunktionen:

```typescript
export const PRODUKTION_WERKTAGE = {
  regulaer: 20,
  express: 10,
  eil: 2,
} as const

export const VERSAND_WERKTAGE_STANDARD = 2
export const VERSAND_WERKTAGE_EIL = 1
export const ANKUNFT_WERKTAGE_STANDARD = 2
export const ANKUNFT_WERKTAGE_FLEX = 5

export function minWerktageForPaket(paket: Lieferpaket, flexRueckgabe = false): number {
  if (paket === "eil") {
    return PRODUKTION_WERKTAGE.eil + VERSAND_WERKTAGE_EIL // 3; Flex ignorieren
  }
  const ankunft = flexRueckgabe ? ANKUNFT_WERKTAGE_FLEX : ANKUNFT_WERKTAGE_STANDARD
  return PRODUKTION_WERKTAGE[paket] + VERSAND_WERKTAGE_STANDARD + ankunft
}

export function workdaysUntilEvent(eventDateIso: string, from = new Date()): number {
  const event = new Date(`${eventDateIso.slice(0, 10)}T12:00:00`)
  const fromNorm = new Date(`${from.toISOString().slice(0, 10)}T12:00:00`)
  return workdaysUntil(fromNorm, event)
}
```

`LIEFERPAKET_OPTIONS`: Feld `minTage` → `minWerktage` mit Werten `minWerktageForPaket(value, false)` (24 / 14 / 3).

`FLEX_RUECKGABE_INFO.minTage` entfernen oder durch Hinweis ersetzen — Freigabe läuft über `minWerktageForPaket(paket, true)`.

Freigabe:

```typescript
export function isLieferpaketAllowed(
  paket: Lieferpaket,
  workdaysUntilEvt: number | null,
  _ctx?: LieferungContext,
): boolean {
  if (workdaysUntilEvt === null) return true
  if (workdaysUntilEvt < 0) return false
  return workdaysUntilEvt >= minWerktageForPaket(paket, false)
}

export function isFlexRueckgabeAllowed(
  workdaysUntilEvt: number | null,
  paket?: Lieferpaket,
): boolean {
  if (paket === "eil") return false
  if (workdaysUntilEvt === null) return true
  if (workdaysUntilEvt < 0) return false
  const p = paket ?? "regulaer"
  return workdaysUntilEvt >= minWerktageForPaket(p, true)
}

export function getLieferpaketWarning(
  workdaysUntilEvt: number | null,
  ctx?: LieferungContext,
): string | null {
  if (workdaysUntilEvt === null) return null
  const blockedByTime = LIEFERPAKET_OPTIONS.filter(
    (opt) => !isLieferpaketAllowed(opt.value, workdaysUntilEvt, ctx),
  )
  if (blockedByTime.length === 0) return null
  const names = blockedByTime.map((opt) => opt.label).join(", ")
  const n = workdaysUntilEvt
  const unit = n === 1 ? "Werktag" : "Werktagen"
  const verb = blockedByTime.length === 1 ? "ist" : "sind"
  return `Bei nur noch ${n} ${unit} bis zum Event ${verb} ${names} nicht verfügbar.`
}
```

`werktageToCalendarDays` und `LIEFERZEIT_MIN_TAGE` als `@deprecated` belassen für Legacy-Imports (`lieferzeit.ts`, alte Tests), aber **nicht** mehr für Freigabe nutzen.

`fulfillment-timing` nutzt später `minWerktageForPaket` statt `opt.minTage` — in Task 3.

- [ ] **Step 4: Tests PASS**

Run: `npx tsx scripts/test-lieferpaket.ts`  
Expected: Alle bestanden.

- [ ] **Step 5: Legacy `scripts/test-lieferzeit.ts` prüfen**

Run: `npx tsx scripts/test-lieferzeit.ts`  
Wenn FAIL wegen neuer Schwellen: Assertions auf Werktage anpassen (deprecated Shims reichen `isLieferpaketAllowed` durch). Mindestens: Express ab 14 WT, Regulär ab 24 WT, Eil ab 3 WT.

- [ ] **Step 6: Commit**

```bash
git add lib/konfigurator/lieferpaket.ts lib/konfigurator/lieferzeit.ts scripts/test-lieferpaket.ts scripts/test-lieferzeit.ts
git commit -m "$(cat <<'EOF'
feat: Lieferpaket-Freigabe mit Produktion+Versand+Ankunft in Werktagen

EOF
)"
```

---

### Task 3: Packlisten-Transit auf 2 Werktage

**Files:**
- Modify: `lib/konfigurator/fulfillment-timing.ts`
- Modify: `scripts/test-fulfillment-timing.ts`

- [ ] **Step 1: Tests anpassen (erwartete Daten)**

Event `2026-08-01` (Sa), Standard-Anlieferung bleibt `2026-07-30` (2 WT).

```typescript
assert(
  "Pack-Versand 2 Werktage vor Anlieferung",
  versand?.toISOString().slice(0, 10) === "2026-07-28",
)

assert(
  "Pack-Flex-Versand 2 Werktage vor Flex-Anlieferung",
  flexVersand?.toISOString().slice(0, 10) === "2026-07-23",
)
```

Kurier: Transit weiter 1 Tag; wenn auf `subtractWorkdays(..., 1)` umgestellt, Datum `2026-07-30` bleibt im Beispiel gültig — Assertion-Text auf „1 Werktag“ ändern.

- [ ] **Step 2: Test FAIL bestätigen**

Run: `npx tsx scripts/test-fulfillment-timing.ts`

- [ ] **Step 3: `fulfillment-timing.ts` anpassen**

```typescript
/** UPS/TNT-Standard: Werktage Versandlaufzeit vor Anlieferung */
export const PACKING_VERSAND_TRANSIT_WERKTAGE = 2
/** Kurierfahrt: kurze Laufzeit in Werktagen */
export const PACKING_VERSAND_TRANSIT_KURIER_WERKTAGE = 1
```

Entfernen: `PACKING_VERSAND_TRANSIT_KALENDERTAGE`, `PACKING_VERSAND_TRANSIT_FLEX_EXTRA`, `PACKING_VERSAND_TRANSIT_KURIER` (oder als deprecated Alias auf neue Konstanten).

```typescript
function versandTransitWerktageForMode(mode: PackingDeliveryMode): number {
  switch (mode) {
    case "kurier":
      return PACKING_VERSAND_TRANSIT_KURIER_WERKTAGE
    case "flex":
    default:
      return PACKING_VERSAND_TRANSIT_WERKTAGE
  }
}

export function getVersandDeadlineForPacking(quote: TimingQuote): Date | null {
  const anlieferung = getAnlieferungDeadlineForPacking(quote)
  if (!anlieferung) return null
  const mode = resolvePackingDeliveryMode(quote.config_json)
  return subtractWorkdays(anlieferung, versandTransitWerktageForMode(mode))
}
```

`minTageForConfig`: statt `opt.minTage` → `minWerktageForPaket(normalizeLieferpaket(config), normalizeFlexRueckgabe(config))`. Import aus `lieferpaket` ergänzen. Anker-Fall ohne Event weiter Kalendertage addieren ist ok (oder `addWorkdays` — spezifiziert nicht; **Kalender belassen** wie bisher, nur Zahlenquelle wechseln).

- [ ] **Step 4: Tests PASS**

Run: `npx tsx scripts/test-fulfillment-timing.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/konfigurator/fulfillment-timing.ts scripts/test-fulfillment-timing.ts
git commit -m "$(cat <<'EOF'
fix: Packlisten-Versandtransit auf 2 Werktage angleichen

EOF
)"
```

---

### Task 4: Wizard auf Werktage für Lieferpakete

**Files:**
- Modify: `components/konfigurator/configurator-wizard.tsx`

- [ ] **Step 1: Import `workdaysUntilEvent` aus `@/lib/konfigurator/lieferpaket`**

- [ ] **Step 2: Zwei Zähler parallel**

```typescript
const tageBisEvent = config.von ? daysUntilEvent(config.von) : null // Ampel, Kurzvorlauf, Techniker
const werktageBisEvent = config.von ? workdaysUntilEvent(config.von) : null // Lieferpaket, Flex
```

- [ ] **Step 3: Alle Lieferpaket-/Flex-Aufrufe auf `werktageBisEvent` umstellen**

Betroffen (Kalender `tage` → `workdaysUntilEvent`):

- `syncLieferpaketFromEvent(next, workdaysUntilEvent(von))` in `updateConfig` / Effects
- `getLieferpaketWarning(werktageBisEvent)`
- `hasAllowedLieferpaket(werktageBisEvent)`
- `isLieferpaketAllowed(..., werktageBisEvent)`
- `isFlexRueckgabeAllowed(werktageBisEvent, lieferpaket)`
- `getLieferpaketBlockReason(..., werktageBisEvent)`

**Nicht umstellen:** `kurzeLieferzeit`, Techniker-`isTechnikerAllowed(tageBisEvent)`, Ampel.

- [ ] **Step 4: Flex-Hinweistext auf Werktage**

Wo bisher:

```tsx
Bei nur noch {tageBisEvent} Tag{…} bis …
```

für Flex (Lieferpaket-Kontext) → `werktageBisEvent` und „Werktag/Werktagen“. Techniker-Hinweis darf bei Kalendertagen bleiben.

- [ ] **Step 5: Smoke**

Run: `npm run test:lieferpaket && npm run test:fulfillment-timing`  
Optional: `npx tsc --noEmit` oder Lint der Wizard-Datei.

- [ ] **Step 6: Commit**

```bash
git add components/konfigurator/configurator-wizard.tsx
git commit -m "$(cat <<'EOF'
feat: Konfigurator nutzt Werktage für Lieferpaket- und Flex-Freigabe

EOF
)"
```

---

### Task 5: Docs + Spec-Status

**Files:**
- Modify: `docs/konfigurator.md` (Lieferpaket-Tabelle ~Zeile 162–166 und Packlisten ~462–467)
- Modify: `docs/superpowers/specs/2026-07-16-lieferpaket-werktage-vorlauf-design.md`

- [ ] **Step 1: `docs/konfigurator.md` aktualisieren**

Tabelle:

| Paket | Min. Werktage bis Event |
| Regulär | 24 |
| Express | 14 |
| Eilauftrag | 3 |

Formel kurz erwähnen: Produktion + 2 WT Versand + Ankunft (2 bzw. Flex 5).  
Packlisten: Versandlaufzeit **2 Werktage** (nicht 3 Kalendertage); Flex ohne Extra-Transit.

- [ ] **Step 2: Spec-Status**

```markdown
**Status:** Freigegeben — implementiert  
**Plan:** `docs/superpowers/plans/2026-07-16-lieferpaket-werktage-vorlauf.md`
```

- [ ] **Step 3: Commit**

```bash
git add docs/konfigurator.md docs/superpowers/specs/2026-07-16-lieferpaket-werktage-vorlauf-design.md
git commit -m "$(cat <<'EOF'
docs: Lieferpaket-Werktage-Vorlauf in konfigurator.md und Spec-Status

EOF
)"
```

---

## Spec coverage

| Spec-Punkt | Task |
|---|---|
| Summe Produktion+Versand+Ankunft | 2 |
| Echte Werktage-Zählung | 1 |
| Express 14 / Regulär 24 / Eil 3 | 2 |
| Flex Ankunft 5 (+3 WT) | 2 |
| 10 WT → nur Eil | 2 |
| Warnung „Werktag(e)“ | 2+4 |
| Packlisten 2 WT Transit | 3 |
| Wizard speist Werktage | 4 |
| Ampel/Techniker unverändert | 4 (bewusst) |
| Docs | 5 |

## Self-review notes

- Keine TBD/Placeholder.
- `isFlexRueckgabeAllowed` prüft volles `minWerktageForPaket(paket, true)`, nicht nur 5 WT.
- Parameter heißen semantisch weiter `number | null`, Wizard übergibt Werktage für Lieferpaket und Kalender für Techniker.
- Feiertage bewusst out of scope.
