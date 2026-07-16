import {
  groessenToBoundaries,
  boundariesToGroessen,
  applyBoundaryDrag,
  equalSplitToMenge,
  gruppenVerteilungGueltig,
  normalizeGruppenGroessen,
  syncGruppenGroessen,
  GRUPPEN_SLIDER_STEP,
} from "../lib/konfigurator/gruppen-config"
import type { QuoteConfig } from "../lib/konfigurator/types"

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
assert(JSON.stringify(groessenToBoundaries([1000])) === JSON.stringify([]), "one group no boundaries")

const dragged = applyBoundaryDrag([500, 500], 0, 450)
assert(JSON.stringify(dragged) === JSON.stringify([450, 550]), "drag -50/+50")
assert(dragged.reduce((a, b) => a + b, 0) === 1000, "drag sum")

const clamped = applyBoundaryDrag([100, 900], 0, 0)
assert(clamped[0] === GRUPPEN_SLIDER_STEP, "drag respects min left")
assert(clamped[1] === 1000 - GRUPPEN_SLIDER_STEP, "drag respects min right")

const split = equalSplitToMenge(1000, 4)
assert(split.length === 4, "split length")
assert(split.reduce((a, b) => a + b, 0) === 1000, "split sum")
assert(
  split.every((n) => n >= GRUPPEN_SLIDER_STEP && n % GRUPPEN_SLIDER_STEP === 0),
  "split step/min",
)

assert(gruppenVerteilungGueltig([500, 500], 1000) === true, "valid exact")
assert(gruppenVerteilungGueltig([400, 400], 1000) === false, "reject under-alloc")
assert(gruppenVerteilungGueltig([0, 1000], 1000) === false, "reject below min")

const base: QuoteConfig = {
  produkt: "armband",
  modus: "miete",
  menge: 1000,
  druck: false,
  gruppen: 2,
  station: "pro",
  stationModus: "miete",
  lieferzeit: "standard",
  land: "DE",
  gruppenGroessen: [400, 400],
}
const normalized = normalizeGruppenGroessen(base)
assert(normalized.reduce((a, b) => a + b, 0) === 1000, "normalize under-alloc → full")
assert(normalized.length === 2, "normalize length")

const synced = syncGruppenGroessen({ ...base, gruppenGroessen: [500, 500] }, { gruppen: 4 })
assert(synced !== undefined && synced.length === 4, "sync count change length")
assert(synced!.reduce((a, b) => a + b, 0) === 1000, "sync count change sum")

const kept = syncGruppenGroessen(base, { gruppenGroessen: [300, 700] })
assert(JSON.stringify(kept) === JSON.stringify([300, 700]), "sync keep valid patch")

console.log(failed === 0 ? "Alle Gruppen-Config-Tests bestanden." : `${failed} fehlgeschlagen.`)
process.exit(failed > 0 ? 1 : 0)
