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
  werktageToCalendarDays,
  workdaysUntilEvent,
} from "../lib/konfigurator/lieferpaket"
import { rechnePreis } from "../lib/pricing/preis-engine"
import { workdaysUntil } from "../lib/utils/date"

let failed = 0

function assert(name: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${name}`)
    failed++
  } else {
    console.log(`OK: ${name}`)
  }
}

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

assert("20 Werktage → 28 Kalendertage", werktageToCalendarDays(20) === 28)

assert("Regulär = 100 EUR", LIEFERPAKET_PREIS.regulaer === 100)
assert("Eilauftrag = 919 EUR", LIEFERPAKET_PREIS.eil === 919)

assert("Regulär min = 24", minWerktageForPaket("regulaer", false) === 24)
assert("Express min = 14", minWerktageForPaket("express", false) === 14)
assert("Eil min = 3", minWerktageForPaket("eil", false) === 3)
assert("Express+Flex min = 17", minWerktageForPaket("express", true) === 17)
assert("Regulär+Flex min = 27", minWerktageForPaket("regulaer", true) === 27)

assert(
  "workdaysUntilEvent Wrapper",
  workdaysUntilEvent("2026-07-30", new Date("2026-07-16T12:00:00")) === 10,
)

assert("10 WT: nur Eil", firstAllowedLieferpaket(10) === "eil")
assert("10 WT: Express gesperrt", !isLieferpaketAllowed("express", 10))
assert("10 WT: Regulär gesperrt", !isLieferpaketAllowed("regulaer", 10))
assert(
  "14 WT: Express ja, Regulär nein",
  isLieferpaketAllowed("express", 14) && !isLieferpaketAllowed("regulaer", 14),
)
assert("24 WT: Regulär ja", isLieferpaketAllowed("regulaer", 24))
assert("2 WT: kein Paket", !hasAllowedLieferpaket(2))
assert("3 WT: nur Eil", firstAllowedLieferpaket(3) === "eil")

assert(
  "Eilauftrag mit Bedruckung bei 14 WT wählbar",
  isLieferpaketAllowed("eil", 14, { hasDruck: true }),
)
assert(
  "Eil bei 14 WT hat keinen Sperrgrund",
  getLieferpaketBlockReason("eil", 14, { hasDruck: true }) === null,
)

const preisEilDruck = rechnePreis({
  produkt: "armband",
  modus: "kauf",
  menge: 300,
  druck: true,
  lieferpaket: "eil",
  land: "DE",
})
assert(
  "Preis-Engine: Eilauftrag + Bedruckung gültig",
  preisEilDruck.gueltig,
)

assert("14 WT: Express+Flex nicht", !isFlexRueckgabeAllowed(14, "express"))
assert("17 WT: Express+Flex ja", isFlexRueckgabeAllowed(17, "express"))
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

assert(
  "applyLieferpaket eil",
  applyLieferpaket("eil", false).lieferzeit === "hyperexpress" &&
    applyLieferpaket("eil", false).lieferart === "overnight",
)

assert(
  "normalize aus Legacy hyperexpress",
  normalizeLieferpaket({ lieferzeit: "hyperexpress", lieferart: "overnight" }) === "eil",
)

const preis = rechnePreis({
  produkt: "armband",
  modus: "miete",
  menge: 300,
  lieferpaket: "eil",
  land: "DE",
})
assert(
  "Preis-Engine: Eilauftrag-Position",
  preis.gueltig && preis.positionen.some((p) => p.pos === "Lieferpaket Eilauftrag"),
)

const preisFlex = rechnePreis({
  produkt: "armband",
  modus: "miete",
  menge: 300,
  lieferpaket: "regulaer",
  flexRueckgabe: true,
  land: "DE",
})

const preisProbedruckVersand = rechnePreis({
  produkt: "armband",
  modus: "kauf",
  menge: 300,
  druck: true,
  probedruckOption: "versand",
  lieferpaket: "regulaer",
  land: "DE",
})
assert(
  "Preis-Engine: Flex-Rückgabe Position",
  preisFlex.gueltig && preisFlex.positionen.some((p) => p.pos === "Flex-Rückgabe"),
)
assert(
  "Preis-Engine: Probedruck + Versand",
  preisProbedruckVersand.gueltig &&
    preisProbedruckVersand.positionen.some((p) => p.pos === "Probedruck + Versand"),
)

assert("Techniker ab 7 Tagen", isTechnikerAllowed(7))
assert("Techniker nicht unter 7 Tagen", !isTechnikerAllowed(6))

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen`)
  process.exit(1)
}

console.log("\nAlle Lieferpaket-Tests bestanden.")
