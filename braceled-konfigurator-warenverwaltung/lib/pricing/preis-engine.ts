import type {
  PreisEngineInput,
  PreisEngineResult,
  PreisPosition,
  WristlinkProdukt,
} from "./types"
import {
  PRODUKT_ANZEIGE,
  isProductKonfiguratorAvailable,
  MAX_MENGE,
  MIN_MENGE,
  MENGE_STEP,
  modusAnzeige,
} from "@/lib/konfigurator/product-info"
import {
  getProbedruckLabel,
  normalizeDruckArt,
  normalizeProbedruckOption,
  probedruckPreisNetto,
} from "@/lib/konfigurator/product-info"
import {
  applyLieferpaket,
  getLieferpaketLabel,
  LIEFERPAKET_PREIS,
  normalizeFlexRueckgabe,
  normalizeLieferpaket,
  type Lieferpaket,
} from "@/lib/konfigurator/lieferpaket"
import {
  FLEX_NETTO,
  DRUCK_VOLLFLAECHIG_PRO_STK,
  PREMIUM_AUFSCHLAG_FAKTOR,
  TECHNIKER_KM_NETTO,
  TECHNIKER_REISEPAUSCHALE_NETTO,
  TECHNIKER_TAG_NETTO,
  stationPreisNetto,
} from "./constants"

const PREISE: Record<WristlinkProdukt, [number, number, number, number][]> = {
  armband: [
    [100, 300, 4.2, 3.9],
    [301, 500, 3.98, 3.85],
    [501, 1000, 3.83, 3.82],
    [1001, 4000, 3.76, 3.8],
  ],
  zauberstab: [
    [100, 300, 4.1, 3.9],
    [301, 500, 3.89, 3.85],
    [501, 1000, 3.74, 3.82],
    [1001, 2500, 3.66, 3.8],
  ],
  licht: [
    [100, 300, 4.9, 3.95],
    [301, 500, 4.89, 3.9],
    [501, 1000, 4.74, 3.85],
    [1001, 2500, 4.66, 3.8],
  ],
}

const DRUCK_PRO_STK: [number, number, number][] = [
  [100, 300, 2.12],
  [301, 500, 1.8],
  [501, 1000, 0.97],
  [1001, 4000, 0.95],
]
const DRUCK_SETUP = 120.0

const GRUPPE = 65.0
const VERSAND: Record<string, number> = { DE: 90.0 }

const eur = (n: number) => Math.round(n * 100) / 100

function tier(tabelle: [number, number, number, number][], menge: number, spalte: number) {
  const row = tabelle.find((r) => menge >= r[0] && menge <= r[1])
  return row ? row[spalte] : null
}

function tierDruck(tabelle: [number, number, number][], menge: number, spalte: number) {
  const row = tabelle.find((r) => menge >= r[0] && menge <= r[1])
  return row ? row[spalte] : null
}

export function rechnePreis(input: PreisEngineInput): PreisEngineResult {
  const produkt = String(input.produkt || "").toLowerCase()
  const modus = String(input.modus || "").toLowerCase()
  const menge = Number(input.menge)
  const druck = Boolean(input.druck)
  const gruppen = Number(input.gruppen || 0)
  const station = String(input.station || "keine").toLowerCase()
  const stationModusRaw = String(input.stationModus || input.modus || "miete").toLowerCase()
  const stationModus = station === "pro" ? "miete" : stationModusRaw
  const lieferpaket = normalizeLieferpaket(input)
  const flexRueckgabe = normalizeFlexRueckgabe({ ...input, lieferpaket })
  const lieferung = applyLieferpaket(lieferpaket, flexRueckgabe)
  const lieferzeit = lieferung.lieferzeit
  const land = String(input.land || "DE").toUpperCase()
  const techniker = Boolean(input.techniker)
  const technikerTage = Number(input.technikerTage || 0)
  const technikerKm = Number(input.technikerKm || 0)
  const variante = String(input.variante || "standard").toLowerCase()
  const druckArt = normalizeDruckArt({ druck, druckArt: input.druckArt })
  const probedruckOption = normalizeProbedruckOption(input)
  const probedruck = probedruckOption !== "none"

  const fehler: string[] = []
  if (!PREISE[produkt as WristlinkProdukt]) {
    fehler.push(`Unbekanntes Produkt: "${input.produkt}"`)
  }
  if (!isProductKonfiguratorAvailable(produkt)) {
    fehler.push(`Produkt "${input.produkt}" ist im Konfigurator derzeit nicht verfügbar`)
  }
  if (!["kauf", "miete"].includes(modus)) {
    fehler.push('Modus muss "kauf" oder "miete" sein')
  }
  if (!Number.isFinite(menge) || menge < MIN_MENGE || menge > MAX_MENGE) {
    fehler.push(`Menge ${input.menge} außerhalb ${MIN_MENGE}–${MAX_MENGE}`)
  }
  if (Number.isFinite(menge) && menge % MENGE_STEP !== 0) {
    fehler.push("Menge muss in 50er-Schritten liegen")
  }
  if (gruppen < 0 || gruppen > 20) {
    fehler.push(`Gruppen ${gruppen} außerhalb 0–20`)
  }
  if (station === "pro" && gruppen < 1) {
    fehler.push("Gruppenprogrammierung erfordert mindestens 1 Gruppe")
  }
  if (gruppen > 0 && station !== "pro") {
    fehler.push("Gruppenprogrammierung nur mit PRO-Basis-Station")
  }
  if (druck && modus === "miete") {
    fehler.push("Druck ist nur beim Kauf möglich")
  }
  if (variante === "premium" && produkt !== "armband") {
    fehler.push("Premium-Variante nur für LED-Armbänder")
  }
  if (probedruck && !druck) {
    fehler.push("Probedruck nur bei aktivierter Bedruckung")
  }
  if (probedruck && druckArt === "vollflaechig") {
    fehler.push("Probedruck nur beim Logo-Druck möglich")
  }
  if (probedruck && modus !== "kauf") {
    fehler.push("Probedruck nur beim Kauf möglich")
  }
  if (station === "pro" && stationModusRaw === "kauf") {
    fehler.push("PRO-Basis-Station ist nur zur Miete verfügbar")
  }
  if (station !== "keine" && !["kauf", "miete"].includes(stationModus)) {
    fehler.push('Basis-Station-Modus muss "kauf" oder "miete" sein')
  }
  if (!["keine", "eco", "pro"].includes(station)) {
    fehler.push(`Unbekannte Basis-Station: "${input.station}"`)
  }
  if (!LIEFERPAKET_PREIS[lieferpaket as Lieferpaket]) {
    fehler.push(`Unbekanntes Lieferpaket: "${lieferpaket}"`)
  }
  if (!Object.prototype.hasOwnProperty.call(VERSAND, land)) {
    fehler.push(`Versand nur nach: ${Object.keys(VERSAND).join(", ")}`)
  }
  if (techniker) {
    if (!Number.isFinite(technikerTage) || technikerTage < 1) {
      fehler.push("Techniker: mindestens 1 Einsatztag erforderlich")
    }
    if (!Number.isFinite(technikerKm) || technikerKm < 0) {
      fehler.push("Techniker: gültige Kilometerangabe erforderlich")
    }
  }

  if (fehler.length) return { gueltig: false, fehler }

  const spalte = modus === "kauf" ? 2 : 3
  const basisStueck = tier(PREISE[produkt as WristlinkProdukt], menge, spalte)!
  const stueckpreis =
    variante === "premium" && produkt === "armband"
      ? eur(basisStueck * PREMIUM_AUFSCHLAG_FAKTOR)
      : basisStueck
  const positionen: PreisPosition[] = []

  const produktBasis = PRODUKT_ANZEIGE[produkt] ?? produkt
  const modusLabel = modusAnzeige(modus)
  const produktLabel =
    variante === "premium" && produkt === "armband"
      ? `${produktBasis} Premium (${modusLabel})`
      : `${produktBasis} (${modusLabel})`

  positionen.push({
    pos: produktLabel,
    menge,
    einzel: stueckpreis,
    summe: eur(menge * stueckpreis),
  })

  if (druck && modus === "kauf") {
    if (druckArt === "vollflaechig") {
      positionen.push({
        pos: "Vollflächiger Druck – pro Stück",
        menge,
        einzel: DRUCK_VOLLFLAECHIG_PRO_STK,
        summe: eur(menge * DRUCK_VOLLFLAECHIG_PRO_STK),
      })
    } else {
      const dp = tierDruck(DRUCK_PRO_STK, menge, 2)!
      positionen.push({
        pos: "Druck – Setup-/Abwicklungsgebühr",
        menge: 1,
        einzel: DRUCK_SETUP,
        summe: DRUCK_SETUP,
      })
      positionen.push({
        pos: "Druck – pro Stück",
        menge,
        einzel: dp,
        summe: eur(menge * dp),
      })
      if (probedruck) {
        const preis = probedruckPreisNetto(probedruckOption)
        const label = getProbedruckLabel(probedruckOption) ?? "Probedruck"
        positionen.push({
          pos: label,
          menge: 1,
          einzel: preis,
          summe: preis,
        })
      }
    }
  }

  const paketPreis = LIEFERPAKET_PREIS[lieferpaket as Lieferpaket]
  positionen.push({
    pos: `Lieferpaket ${getLieferpaketLabel(lieferpaket as Lieferpaket)}`,
    menge: 1,
    einzel: paketPreis,
    summe: paketPreis,
  })

  if (flexRueckgabe) {
    positionen.push({
      pos: "Flex-Rückgabe",
      menge: 1,
      einzel: FLEX_NETTO,
      summe: FLEX_NETTO,
    })
  }

  if (gruppen > 0) {
    positionen.push({
      pos: "Gruppenprogrammierung",
      menge: gruppen,
      einzel: GRUPPE,
      summe: eur(gruppen * GRUPPE),
    })
  }

  const stationPreis = stationPreisNetto(station, stationModus)
  if (stationPreis > 0) {
    const stationLabel =
      station === "eco"
        ? `ECO Handcontroller (${stationModus === "kauf" ? "Kauf" : "Miete"})`
        : "PRO Basis-Station (Miete)"
    positionen.push({
      pos: stationLabel,
      menge: 1,
      einzel: stationPreis,
      summe: stationPreis,
    })
  }

  positionen.push({
    pos: `Versand ${land}`,
    menge: 1,
    einzel: VERSAND[land],
    summe: VERSAND[land],
  })

  if (techniker && technikerTage >= 1) {
    positionen.push({
      pos: "Techniker – Reisepauschale",
      menge: 1,
      einzel: TECHNIKER_REISEPAUSCHALE_NETTO,
      summe: TECHNIKER_REISEPAUSCHALE_NETTO,
    })
    positionen.push({
      pos: "Techniker – Einsatztag",
      menge: technikerTage,
      einzel: TECHNIKER_TAG_NETTO,
      summe: eur(technikerTage * TECHNIKER_TAG_NETTO),
    })
    if (technikerKm > 0) {
      positionen.push({
        pos: "Techniker – Fahrtkosten",
        menge: technikerKm,
        einzel: TECHNIKER_KM_NETTO,
        summe: eur(technikerKm * TECHNIKER_KM_NETTO),
      })
    }
  }

  const gesamt_netto = eur(positionen.reduce((s, p) => s + p.summe, 0))
  const mwst_19 = eur(gesamt_netto * 0.19)
  const gesamt_brutto = eur(gesamt_netto + mwst_19)

  return {
    gueltig: true,
    eingabe: {
      produkt,
      modus,
      menge,
      variante,
      druck,
      probedruck,
      probedruckOption,
      flex: lieferung.flex,
      lieferpaket,
      flexRueckgabe,
      gruppen,
      station,
      stationModus,
      lieferzeit,
      land,
      techniker,
      technikerTage: techniker ? technikerTage : 0,
      technikerKm: techniker ? technikerKm : 0,
    },
    positionen,
    gesamt_netto,
    mwst_19,
    gesamt_brutto,
  }
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}
