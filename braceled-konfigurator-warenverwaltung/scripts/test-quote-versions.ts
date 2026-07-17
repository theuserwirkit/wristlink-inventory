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

const patched = { ...base, menge: 600, flexRueckgabe: true, von: "2099-01-01", kontaktName: "Hacker" }
const merged = mergeCustomerEditConfig(base, patched)
assert(merged.von === "2026-09-12", "von locked")
assert(merged.bis === "2026-09-14", "bis locked")
assert(merged.kontaktName === "Max", "kontakt locked")
assert(merged.menge === 600, "menge editable")
assert(merged.flexRueckgabe === true, "flex editable")

const previousNoVon = { ...base }
delete previousNoVon.von
const hacked = { ...previousNoVon, von: "2099-01-01" }
const mergedNoVon = mergeCustomerEditConfig(previousNoVon, hacked)
assert(mergedNoVon.von === undefined, "missing von on previous clears hacked incoming von")

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
