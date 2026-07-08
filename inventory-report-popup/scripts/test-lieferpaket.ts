import {
  LIEFERPAKET_PREIS,
  applyLieferpaket,
  firstAllowedLieferpaket,
  hasAllowedLieferpaket,
  isFlexRueckgabeAllowed,
  isLieferpaketAllowed,
  isTechnikerAllowed,
  normalizeLieferpaket,
  werktageToCalendarDays,
} from "../lib/konfigurator/lieferpaket"
import { rechnePreis } from "../lib/pricing/preis-engine"

let failed = 0

function assert(name: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${name}`)
    failed++
  } else {
    console.log(`OK: ${name}`)
  }
}

assert("20 Werktage → 28 Kalendertage", werktageToCalendarDays(20) === 28)

assert("Regulär = 100 EUR", LIEFERPAKET_PREIS.regulaer === 100)
assert("Eilauftrag = 919 EUR", LIEFERPAKET_PREIS.eil === 919)

assert("1 Tag: kein Paket möglich", !hasAllowedLieferpaket(1))
assert("2 Tage: nur Eilauftrag", firstAllowedLieferpaket(2) === "eil")
assert("14 Tage: Express", firstAllowedLieferpaket(14) === "express")
assert("28 Tage: Regulär", firstAllowedLieferpaket(28) === "regulaer")

assert(
  "Bedruckung blockiert Eilauftrag",
  !isLieferpaketAllowed("eil", 10, { hasDruck: true }),
)

assert("Flex-Rückgabe ab 7 Tagen", isFlexRueckgabeAllowed(7, "regulaer"))
assert("Flex-Rückgabe nicht bei Eil", !isFlexRueckgabeAllowed(10, "eil"))

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
