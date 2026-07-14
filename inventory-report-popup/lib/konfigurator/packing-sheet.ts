import type { QuoteWarehouseData } from "@/lib/actions/quote-warehouse"
import { FULFILLMENT_STATUS_LABELS } from "@/lib/konfigurator/fulfillment-status"
import { normalizeGruppenGroessen } from "@/lib/konfigurator/gruppen-config"
import { formatKontaktAdresse } from "@/lib/konfigurator/kontakt-adresse"
import {
  getLieferpaketLabel,
  normalizeLieferpaket,
} from "@/lib/konfigurator/lieferpaket"
import {
  DRUCK_ART_OPTIONS,
  SZENARIO_OPTIONS,
  getProbedruckLabel,
  normalizeDruckArt,
  normalizeProbedruckOption,
} from "@/lib/konfigurator/product-info"
import {
  STATION_TYP_LABELS,
  isBaseStationTyp,
} from "@/lib/konfigurator/station-types"
import type { QuoteRequest } from "@/lib/konfigurator/types"
import { formatDate } from "@/lib/utils/date"

export type PackingBagLabel = {
  slot: number
  totalSlots: number
  anzahl: number
  lagerGruppe: string | null
  charge: string | null
}

export type PackingWarehouseRow = {
  slot: number
  anzahl: number
  lagerGruppe: string | null
  charge: string | null
}

export type PackingBookingRow = {
  lagerGruppe: string
  charge: string | null
  anzahl: number
}

export type PackingBaseRow = {
  bezeichnung: string
  hersteller: string
  anzahl: number
}

export type PackingSheetData = {
  quoteId: number
  kunde: string
  ansprechpartner: string | null
  eventLabel: string | null
  eventDatum: string | null
  modus: string
  menge: number
  gruppenAnzahl: number
  druck: boolean
  druckLabel: string
  probedruckLabel: string | null
  hasLogo: boolean
  lieferpaket: string
  station: string | null
  stationModus: string | null
  adresse: string | null
  telefon: string | null
  fulfillmentStatus: string | null
  bagLabels: PackingBagLabel[]
  warehouseRows: PackingWarehouseRow[]
  bookingRows: PackingBookingRow[]
  baseRows: PackingBaseRow[]
  checklistAccessories: string[]
}

function szenarioLabel(value?: string): string | null {
  if (!value) return null
  return SZENARIO_OPTIONS.find((o) => o.value === value)?.label ?? value
}

function formatEventDateRange(von?: string, bis?: string): string | null {
  if (!von) return null
  const start = formatDate(von)
  if (bis && bis !== von) {
    return `${start} – ${formatDate(bis)}`
  }
  return start
}

function getDruckLabel(druck: boolean, druckArt: ReturnType<typeof normalizeDruckArt>): string {
  if (!druck) return "Nein"
  return DRUCK_ART_OPTIONS.find((o) => o.value === druckArt)?.label ?? "Ja"
}

function buildChecklistAccessories(
  modus: string,
  station: string,
  gruppenAnzahl: number,
  druck: boolean,
  hasLogo: boolean,
): string[] {
  const items: string[] = []

  if (druck) {
    items.push("Bedruckung abgeschlossen")
    if (hasLogo) {
      items.push("Logo-Datei geprüft / verfügbar")
    }
  }

  if (modus === "miete") {
    items.push(
      "Versandlabel erstellt",
      "Rückgabe-Label erstellt",
      "Rückgabelabel und Protokoll mit verpackt",
    )
  } else {
    items.push("Versandlabel erstellt")
  }

  if (station !== "keine") {
    const stationLabel = isBaseStationTyp(station)
      ? STATION_TYP_LABELS[station]
      : station
    items.push(`Basis-Station (${stationLabel})`)
  }

  if (station === "pro") {
    items.push("Handfernbedienung")
  }

  if (gruppenAnzahl > 0) {
    items.push("DMX-Konfiguration geprüft")
  }

  return items
}

export function buildPackingSheetData(
  quote: QuoteRequest,
  warehouse: QuoteWarehouseData,
): PackingSheetData {
  const config = quote.config_json
  const gruppenGroessen = normalizeGruppenGroessen(config)
  const totalSlots = gruppenGroessen.length
  const station = config.station || "keine"
  const isMiete = config.modus === "miete"

  let bagLabels: PackingBagLabel[] = gruppenGroessen.map((anzahl, index) => ({
    slot: index + 1,
    totalSlots,
    anzahl,
    lagerGruppe: null,
    charge: null,
  }))

  let warehouseRows: PackingWarehouseRow[] = gruppenGroessen.map((anzahl, index) => ({
    slot: index + 1,
    anzahl,
    lagerGruppe: null,
    charge: null,
  }))

  if (bagLabels.length === 0 && config.menge > 0) {
    bagLabels = [
      { slot: 1, totalSlots: 1, anzahl: config.menge, lagerGruppe: null, charge: null },
    ]
    warehouseRows = [{ slot: 1, anzahl: config.menge, lagerGruppe: null, charge: null }]
  }

  const bookingItems = warehouse.primaryBooking?.items ?? []
  const bookingRows: PackingBookingRow[] = bookingItems
    .filter((item) => item.group_id != null)
    .map((item) => ({
      lagerGruppe: item.group?.name ?? `Gruppe ${item.group_id}`,
      charge: item.batch?.code ?? null,
      anzahl: item.anzahl,
    }))

  const baseRows: PackingBaseRow[] = bookingItems
    .filter((item) => item.base_id != null)
    .map((item) => ({
      bezeichnung: item.base?.bezeichnung ?? "Basis-Station",
      hersteller: item.base?.hersteller ?? "",
      anzahl: item.anzahl_basen ?? item.anzahl,
    }))

  const druckArt = normalizeDruckArt(config)
  const probedruckOption = normalizeProbedruckOption(config)
  const hasLogo = Boolean(config.logoId)

  const adresse = formatKontaktAdresse(config)
  const eventLabel =
    szenarioLabel(config.szenario) ??
    (isMiete ? formatEventDateRange(config.von, config.bis) : null)

  return {
    quoteId: quote.id,
    kunde: config.kontaktFirma || config.kontaktName || quote.lead_email || "–",
    ansprechpartner: config.kontaktName?.trim() || null,
    eventLabel,
    eventDatum: isMiete && config.von ? formatDate(config.von) : null,
    modus: config.modus,
    menge: config.menge,
    gruppenAnzahl: config.gruppen,
    druck: config.druck,
    druckLabel: getDruckLabel(config.druck, druckArt),
    probedruckLabel: getProbedruckLabel(probedruckOption),
    hasLogo,
    lieferpaket: getLieferpaketLabel(normalizeLieferpaket(config)),
    station: station === "keine" ? null : station,
    stationModus: station === "keine" ? null : config.stationModus || config.modus,
    adresse: adresse || null,
    telefon: config.kontaktTelefon?.trim() || null,
    fulfillmentStatus: quote.fulfillment_status
      ? FULFILLMENT_STATUS_LABELS[quote.fulfillment_status]
      : null,
    bagLabels,
    warehouseRows,
    bookingRows,
    baseRows,
    checklistAccessories: buildChecklistAccessories(
      config.modus,
      station,
      config.gruppen,
      config.druck,
      hasLogo,
    ),
  }
}
