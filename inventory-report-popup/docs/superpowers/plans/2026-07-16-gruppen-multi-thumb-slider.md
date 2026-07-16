# Multi-Thumb-Gruppenverteilung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Konfigurator Schritt 4 (PRO) die n Einzel-Slider durch einen Multi-Thumb-Slider ersetzen, der die Bandmenge immer exakt auf die Gruppen aufteilt.

**Architecture:** Pure Hilfsfunktionen in `gruppen-config.ts` (Größen ↔ Grenzen, Equal-Split, Drag); UI-Komponente `gruppen-verteilungs-slider.tsx` auf bestehendem Radix/shadcn-`Slider` mit farbigen Track-Segmenten; Wizard bindet nur noch diese Komponente unter dem Gruppenanzahl-Slider.

**Tech Stack:** TypeScript, React 19, `@radix-ui/react-slider` / shadcn `Slider`, `tsx` Script-Tests (Projekt-Konvention).

**Spec:** `docs/superpowers/specs/2026-07-16-gruppen-multi-thumb-slider-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `lib/konfigurator/gruppen-config.ts` | Boundaries, Equal-Split, Drag, strengere Validierung, Sync/Normalize |
| `scripts/test-gruppen-config.ts` | Unit-Tests für die Pure Logic |
| `components/konfigurator/gruppen-verteilungs-slider.tsx` | Multi-Thumb UI + Farben + Labels |
| `components/konfigurator/configurator-wizard.tsx` | Einzel-Slider ersetzen, Count-Slider behalten |
| `package.json` | Script `test:gruppen-config` |

---

### Task 1: Pure Logic + Tests (TDD)

**Files:**
- Create: `scripts/test-gruppen-config.ts`
- Modify: `lib/konfigurator/gruppen-config.ts`
- Modify: `package.json` (test script)

- [ ] **Step 1: Write failing test script**

```typescript
import {
  groessenToBoundaries,
  boundariesToGroessen,
  applyBoundaryDrag,
  equalSplitToMenge,
  gruppenVerteilungGueltig,
  GRUPPEN_SLIDER_STEP,
} from "../lib/konfigurator/gruppen-config"

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL", msg)
    failed++
  } else {
    console.log("OK", msg)
  }
}

const g = [300, 250, 200, 250]
assert(JSON.stringify(groessenToBoundaries(g)) === JSON.stringify([300, 550, 750]), "boundaries")
assert(JSON.stringify(boundariesToGroessen([300, 550, 750], 1000)) === JSON.stringify(g), "roundtrip")

const dragged = applyBoundaryDrag([500, 500], 0, 450)
assert(JSON.stringify(dragged) === JSON.stringify([450, 550]), "drag -50/+50")
assert(dragged.reduce((a, b) => a + b, 0) === 1000, "drag sum")

const split = equalSplitToMenge(1000, 4)
assert(split.length === 4, "split length")
assert(split.reduce((a, b) => a + b, 0) === 1000, "split sum")
assert(split.every((n) => n >= GRUPPEN_SLIDER_STEP && n % GRUPPEN_SLIDER_STEP === 0), "split step/min")

assert(gruppenVerteilungGueltig([500, 500], 1000) === true, "valid exact")
assert(gruppenVerteilungGueltig([400, 400], 1000) === false, "reject under-alloc")
assert(gruppenVerteilungGueltig([0, 1000], 1000) === false, "reject below min")

console.log(failed === 0 ? "Alle Gruppen-Config-Tests bestanden." : `${failed} fehlgeschlagen.`)
process.exit(failed > 0 ? 1 : 0)
```

- [ ] **Step 2: Run test — expect FAIL** (exports missing)

Run: `npx tsx scripts/test-gruppen-config.ts`

- [ ] **Step 3: Implement helpers in `gruppen-config.ts`**

Add: `equalSplitToMenge`, `groessenToBoundaries`, `boundariesToGroessen`, `applyBoundaryDrag`.

Change `gruppenVerteilungGueltig` to: length > 0, every ≥ `GRUPPEN_SLIDER_STEP`, sum === menge.

Change `normalizeGruppenGroessen`: if existing array length matches and `gruppenVerteilungGueltig`, keep; else `equalSplitToMenge`.

Change `syncGruppenGroessen`: on `gruppenGroessen` patch keep if valid else equal-split; on gruppen/menge change always `equalSplitToMenge` (discard previous sizes).

Keep `clampGruppenGroessenToMenge` for overflow callers, but normalize/sync should prefer equal-split / exact allocation.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Add `"test:gruppen-config": "tsx scripts/test-gruppen-config.ts"` to package.json; commit**

---

### Task 2: UI-Komponente `GruppenVerteilungsSlider`

**Files:**
- Create: `components/konfigurator/gruppen-verteilungs-slider.tsx`

- [ ] **Step 1: Implement component**

Props: `{ menge: number; groessen: number[]; onChange: (next: number[]) => void; disabled?: boolean }`

- Farben: feste Palette (Index % length), z. B. `#3b82f6 #22c55e #f59e0b #a855f7 #ef4444 #06b6d4 #84cc16 #ec4899`
- Labels-Grid über dem Track: `Gruppe i: X Stück`
- Farbige Segmente (flex proportional)
- Wenn `groessen.length >= 2`: `Slider` mit `min={0}`, `max={menge}`, `step={50}`, `minStepsBetweenThumbs={1}`, `value={groessenToBoundaries(groessen)}`, Range ausblenden (`opacity-0`), `onValueChange` → `boundariesToGroessen` → `onChange` (oder `applyBoundaryDrag` wenn ein Handle erkannt)
- Wenn 1 Gruppe: nur Segment + Label, kein Thumb
- Summenzeile: `{menge} von {menge} Bändern auf {n} Gruppe(n) verteilt`

- [ ] **Step 2: Commit**

---

### Task 3: Wizard einbinden

**Files:**
- Modify: `components/konfigurator/configurator-wizard.tsx`

- [ ] **Step 1: Replace per-group sliders** with `<GruppenVerteilungsSlider menge={…} groessen={gruppenGroessen} onChange={(g) => updateConfig({ gruppenGroessen: g })} disabled={editMode} />`

- [ ] **Step 2: Remove** `updateGruppeGroesse` and unused imports (`maxGroesseForGruppe`, `minGroesseProGruppe` if unused)

- [ ] **Step 3: Keep** count-slider, availability block, validation via `gruppenVerteilungGueltig`

- [ ] **Step 4: Manual smoke** — optional `npm run lint` on touched files; run `npm run test:gruppen-config`

- [ ] **Step 5: Commit + update spec status to freigegeben/implementiert**

---

## Spec coverage

| Spec-Punkt | Task |
|---|---|
| Multi-Thumb, volle Menge | 1+2 |
| Count-Slider oben | 3 (behalten) |
| Farben + Labels | 2 |
| Equal-Split bei Gruppenwechsel | 1 (`syncGruppenGroessen`) |
| Validierung Summe === menge | 1 |
| 1-Gruppe-Edge | 2 |
| Keine API/Preis-Änderung | — (bewusst) |
