import { rechnePreis } from "../lib/pricing/preis-engine"
import { stationPreisNetto } from "../lib/pricing/constants"

const testCases = [
  { produkt: "armband", modus: "kauf", menge: 300, druck: false, gruppen: 0, station: "keine", stationModus: "miete", lieferzeit: "standard", land: "DE" },
  { produkt: "armband", modus: "miete", menge: 500, druck: false, gruppen: 0, station: "eco", stationModus: "miete", lieferzeit: "express", land: "DE" },
  { produkt: "armband", modus: "kauf", menge: 300, druck: false, gruppen: 0, station: "eco", stationModus: "kauf", lieferzeit: "standard", land: "DE" },
  { produkt: "armband", modus: "kauf", menge: 500, druck: false, gruppen: 2, station: "pro", stationModus: "miete", lieferzeit: "standard", land: "DE" },
  { produkt: "licht", modus: "miete", menge: 150, druck: false, gruppen: 0, station: "keine", stationModus: "miete", lieferzeit: "hyperexpress", land: "DE", expectInvalid: true },
  { produkt: "armband", modus: "miete", menge: 75, druck: false, gruppen: 0, station: "keine", stationModus: "miete", lieferzeit: "standard", land: "DE" },
  { produkt: "armband", modus: "kauf", menge: 300, druck: false, gruppen: 0, station: "pro", stationModus: "kauf", lieferzeit: "standard", land: "DE" },
]

function jsReference(input: typeof testCases[0]) {
  const PREISE_FULL: Record<string, [number, number, number, number][]> = {
    armband: [[100,300,4.20,3.90],[301,500,3.98,3.85],[501,1000,3.83,3.82],[1001,4000,3.76,3.80]],
    licht: [[100,300,4.90,3.95],[301,500,4.89,3.90],[501,1000,4.74,3.85],[1001,2500,4.66,3.80]],
  }
  const eur = (n: number) => Math.round(n * 100) / 100
  const tier = (t: [number, number, number, number][], m: number, c: number) =>
    t.find((r) => m >= r[0] && m <= r[1])?.[c] ?? null

  const produkt = input.produkt
  const modus = input.modus
  const menge = input.menge
  const stationModus = input.station === "pro" ? "miete" : input.stationModus
  const fehler: string[] = []
  if (!PREISE_FULL[produkt]) fehler.push("produkt")
  if (menge < 100 || menge > 4000 || menge % 50 !== 0) fehler.push("menge")
  if (input.station === "pro" && input.stationModus === "kauf") fehler.push("pro-kauf")
  if (fehler.length) return { gueltig: false as const }

  const spalte = modus === "kauf" ? 2 : 3
  const stueck = tier(PREISE_FULL[produkt], menge, spalte)!
  let netto = menge * stueck
  if (input.gruppen > 0) netto += input.gruppen * 65
  const lieferpaketPreis: Record<string, number> = {
    standard: 100,
    express: 349,
    hyperexpress: 919,
  }
  netto += stationPreisNetto(input.station, stationModus) + lieferpaketPreis[input.lieferzeit] + 90
  const gesamt_netto = eur(netto)
  const mwst_19 = eur(gesamt_netto * 0.19)
  const gesamt_brutto = eur(gesamt_netto + mwst_19)
  return { gueltig: true as const, gesamt_netto, mwst_19, gesamt_brutto }
}

let failed = 0
for (const input of testCases) {
  const ts = rechnePreis(input)
  const js = (input as { expectInvalid?: boolean }).expectInvalid
    ? { gueltig: false as const }
    : jsReference(input)
  if (ts.gueltig !== js.gueltig) {
    console.error("FAIL gueltig", input, ts.gueltig, js.gueltig)
    failed++
    continue
  }
  if (ts.gueltig && js.gueltig) {
    if (ts.gesamt_netto !== js.gesamt_netto || ts.gesamt_brutto !== js.gesamt_brutto) {
      console.error("FAIL sums", input, ts, js)
      failed++
    } else {
      console.log("OK", input.produkt, input.modus, input.station, input.stationModus, "→", ts.gesamt_brutto)
    }
  } else {
    console.log("OK invalid", input.menge, input.station, input.stationModus ?? input.produkt)
  }
}

console.log(failed === 0 ? "Alle Preis-Engine-Tests bestanden." : `${failed} Tests fehlgeschlagen.`)
process.exit(failed > 0 ? 1 : 0)
