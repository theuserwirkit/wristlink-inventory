import type { QuoteWarehouseData } from "@/lib/actions/quote-warehouse"
import { allocateGroupProgramming } from "@/lib/konfigurator/group-allocation"
import type { InventoryGroupPool } from "@/lib/konfigurator/group-allocation"
import { FULFILLMENT_STATUS_LABELS } from "@/lib/konfigurator/fulfillment-status"
import {
  formatPackingDeadline,
  getAnlieferungDeadlineForPacking,
  getVersandDeadlineForPacking,
} from "@/lib/konfigurator/fulfillment-timing"
import { normalizeGruppenGroessen } from "@/lib/konfigurator/gruppen-config"
import { parseLeuchtgruppeName } from "@/lib/konfigurator/leuchtgruppen"
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
import type { QuoteFulfillmentEvent, QuoteRequest } from "@/lib/konfigurator/types"
import type { BookingWithRelations } from "@/lib/types"
import { formatDate } from "@/lib/utils/date"

export function formatPhysicalGroupDisplay(name: string): string {
  return name.trim().replace(/_/g, " ")
}

type SlotWarehouseAssignment = {
  lagerGruppe: string | null
  charge: string | null
}

function buildInventoryPoolsFromBooking(
  bandItems: BookingWithRelations["items"],
): InventoryGroupPool[] {
  const byGroup = new Map<number, InventoryGroupPool>()

  for (const item of bandItems) {
    if (item.group_id == null) continue
    const groupId = item.group_id
    const name = item.group?.name ?? `Gruppe ${groupId}`
    const parsed = parseLeuchtgruppeName(name)
    const existing = byGroup.get(groupId)

    if (existing) {
      existing.frei += item.anzahl
      continue
    }

    byGroup.set(groupId, {
      groupId,
      name,
      kanalanzahl: parsed?.kanalanzahl ?? 40,
      frei: item.anzahl,
    })
  }

  return [...byGroup.values()]
}

function buildChargeByGroupId(
  bandItems: BookingWithRelations["items"],
): Map<number, string | null> {
  const charges = new Map<number, string | null>()
  for (const item of bandItems) {
    if (item.group_id == null) continue
    if (!charges.has(item.group_id)) {
      charges.set(item.group_id, item.batch?.code ?? null)
    }
  }
  return charges
}

export function resolveSlotWarehouseAssignments(
  gruppenGroessen: number[],
  bookingItems: BookingWithRelations["items"],
): SlotWarehouseAssignment[] {
  const empty = gruppenGroessen.map(() => ({
    lagerGruppe: null,
    charge: null,
  }))

  const bandItems = bookingItems.filter((item) => item.group_id != null)
  if (bandItems.length === 0) return empty

  const pools = buildInventoryPoolsFromBooking(bandItems)
  const charges = buildChargeByGroupId(bandItems)
  const { slots } = allocateGroupProgramming(gruppenGroessen, pools)

  return slots.map((slot) => {
    if (slot.zuteilungen.length === 0) {
      return { lagerGruppe: null, charge: null }
    }

    const primary = slot.zuteilungen.reduce((best, current) =>
      current.anzahl >= best.anzahl ? current : best,
    )

    return {
      lagerGruppe: formatPhysicalGroupDisplay(primary.name),
      charge: charges.get(primary.groupId) ?? null,
    }
  })
}

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
  seriennummer: string | null
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
  logoUrl: string | null
  lieferpaket: string
  station: string | null
  stationModus: string | null
  adresse: string | null
  telefon: string | null
  fulfillmentStatus: string | null
  versandDatum: string | null
  anlieferungDatum: string | null
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
    items.push("Zusammengepackt")
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
  fulfillmentEvents: QuoteFulfillmentEvent[] = [],
): PackingSheetData {
  const config = quote.config_json
  const gruppenGroessen = normalizeGruppenGroessen(config)
  const totalSlots = gruppenGroessen.length
  const station = config.station || "keine"
  const isMiete = config.modus === "miete"
  const bookingItems = warehouse.primaryBooking?.items ?? []
  const slotAssignments = resolveSlotWarehouseAssignments(gruppenGroessen, bookingItems)

  let bagLabels: PackingBagLabel[] = gruppenGroessen.map((anzahl, index) => ({
    slot: index + 1,
    totalSlots,
    anzahl,
    lagerGruppe: slotAssignments[index]?.lagerGruppe ?? null,
    charge: slotAssignments[index]?.charge ?? null,
  }))

  let warehouseRows: PackingWarehouseRow[] = gruppenGroessen.map((anzahl, index) => ({
    slot: index + 1,
    anzahl,
    lagerGruppe: slotAssignments[index]?.lagerGruppe ?? null,
    charge: slotAssignments[index]?.charge ?? null,
  }))

  if (bagLabels.length === 0 && config.menge > 0) {
    const fallbackAssignment = resolveSlotWarehouseAssignments([config.menge], bookingItems)[0]
    bagLabels = [
      {
        slot: 1,
        totalSlots: 1,
        anzahl: config.menge,
        lagerGruppe: fallbackAssignment?.lagerGruppe ?? null,
        charge: fallbackAssignment?.charge ?? null,
      },
    ]
    warehouseRows = [
      {
        slot: 1,
        anzahl: config.menge,
        lagerGruppe: fallbackAssignment?.lagerGruppe ?? null,
        charge: fallbackAssignment?.charge ?? null,
      },
    ]
  }

  const bookingRows: PackingBookingRow[] = bookingItems
    .filter((item) => item.group_id != null)
    .map((item) => ({
      lagerGruppe: formatPhysicalGroupDisplay(item.group?.name ?? `Gruppe ${item.group_id}`),
      charge: item.batch?.code ?? null,
      anzahl: item.anzahl,
    }))

  const baseRows: PackingBaseRow[] = bookingItems
    .filter((item) => item.base_id != null)
    .map((item) => ({
      bezeichnung: item.base?.bezeichnung ?? "Basis-Station",
      hersteller: item.base?.hersteller ?? "",
      seriennummer: item.base?.seriennummer ?? null,
      anzahl: item.anzahl_basen ?? item.anzahl,
    }))

  const druckArt = normalizeDruckArt(config)
  const probedruckOption = normalizeProbedruckOption(config)
  const hasLogo = Boolean(config.logoId)

  const adresse = formatKontaktAdresse(config)
  const eventLabel =
    szenarioLabel(config.szenario) ??
    (isMiete ? formatEventDateRange(config.von, config.bis) : null)

  const versandEvent = [...fulfillmentEvents]
    .reverse()
    .find((e) => e.to_status === "versand_beauftragt" || e.to_status === "versandt")

  const versandDatum =
    versandEvent != null
      ? formatDate(versandEvent.created_at)
      : formatPackingDeadline(getVersandDeadlineForPacking(quote))

  const anlieferungDatum = formatPackingDeadline(getAnlieferungDeadlineForPacking(quote))

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
    logoUrl: hasLogo && config.logoId ? `/api/konfigurator/logo/${config.logoId}` : null,
    lieferpaket: getLieferpaketLabel(normalizeLieferpaket(config)),
    station: station === "keine" ? null : station,
    stationModus: station === "keine" ? null : config.stationModus || config.modus,
    adresse: adresse || null,
    telefon: config.kontaktTelefon?.trim() || null,
    fulfillmentStatus: quote.fulfillment_status
      ? FULFILLMENT_STATUS_LABELS[quote.fulfillment_status]
      : null,
    versandDatum,
    anlieferungDatum,
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
