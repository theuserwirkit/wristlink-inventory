import { getDb } from "@/lib/db"
import { getBaseAvailability, getBaseAvailabilityByDateRange } from "@/lib/actions/bookings"
import { computeStationStress } from "@/lib/konfigurator/group-allocation"
import type { AvailabilityStressLevel } from "@/lib/konfigurator/availability-stress"
import { isBaseStationTyp, type BaseStationTyp } from "@/lib/konfigurator/station-types"
import { normalizeKanalanzahl } from "@/lib/konfigurator/kanalanzahl"

export type StationAvailability = {
  verfuegbar: boolean
  frei: number | null
  bestand: number | null
  belegt: number | null
  fehlt: number
  hinweis?: string
  stressLevel: AvailabilityStressLevel
  stressScore: number
  stressLabel: string
}

function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

async function resolveBasesForStation(
  station: string,
  kanalanzahl: number,
): Promise<Array<{ id: number; bezeichnung: string }>> {
  const stationTyp = station.toLowerCase()
  if (!isBaseStationTyp(stationTyp) || stationTyp === "keine") return []

  const sql = getDb()
  const bases = await sql`
    SELECT id, bezeichnung, station_typ, kanalanzahl
    FROM bases
    WHERE station_typ = ${stationTyp}
      AND kanalanzahl = ${kanalanzahl}
    ORDER BY bezeichnung ASC
  `

  return bases.map((base) => ({
    id: Number(base.id),
    bezeichnung: String(base.bezeichnung),
  }))
}

export async function checkStationAvailability(input: {
  station: string
  stationModus: string
  kanalanzahl?: number
  von?: string
  bis?: string
}): Promise<StationAvailability> {
  const station = String(input.station || "keine").toLowerCase()
  const stationModus = String(input.stationModus || "miete").toLowerCase()
  const kanalanzahl = normalizeKanalanzahl(input.kanalanzahl)

  if (station === "keine") {
    const stress = computeStationStress({
      verfuegbar: true,
      frei: null,
      bestand: null,
      belegt: null,
    })
    return {
      verfuegbar: true,
      frei: null,
      bestand: null,
      belegt: null,
      fehlt: 0,
      hinweis: "Keine Basis-Station gewählt",
      ...stress,
    }
  }

  const bases = await resolveBasesForStation(station, kanalanzahl)
  if (bases.length === 0) {
    const stress = computeStationStress({
      verfuegbar: true,
      frei: null,
      bestand: null,
      belegt: null,
    })
    return {
      verfuegbar: true,
      frei: null,
      bestand: null,
      belegt: null,
      fehlt: 0,
      hinweis: `Kein ${station.toUpperCase()}-Controller hinterlegt – Verfügbarkeit wird manuell geprüft`,
      ...stress,
    }
  }

  const menge = 1
  let bestand = 0
  let belegt = 0
  let frei = 0

  if (stationModus === "miete") {
    const von = input.von
    const bis = input.bis || von
    if (!von) {
      const stress = computeStationStress({
        verfuegbar: false,
        frei: 0,
        bestand: 0,
        belegt: 0,
      })
      return {
        verfuegbar: false,
        frei: 0,
        bestand: 0,
        belegt: 0,
        fehlt: menge,
        hinweis: "Eventzeitraum fehlt für Controller-Prüfung",
        ...stress,
      }
    }

    const ausgabe = parseDate(von)
    const rueckgabe = parseDate(bis || von)
    const statsList = await Promise.all(
      bases.map((base) => getBaseAvailabilityByDateRange(base.id, ausgabe, rueckgabe)),
    )
    for (const stats of statsList) {
      bestand += stats.gesamtsumme
      belegt += stats.inVermietung
      frei += stats.verfuegbar
    }
  } else {
    const statsList = await Promise.all(
      bases.map((base) => getBaseAvailability(base.id)),
    )
    for (const stats of statsList) {
      bestand += stats.gesamtsumme
      belegt += stats.inVermietung
      frei += stats.verfuegbar
    }
  }

  const verfuegbar = frei >= menge
  const stress = computeStationStress({ verfuegbar, frei, bestand, belegt })

  return {
    verfuegbar,
    frei,
    bestand,
    belegt,
    fehlt: verfuegbar ? 0 : Math.max(0, menge - frei),
    ...stress,
  }
}

export type { BaseStationTyp }
