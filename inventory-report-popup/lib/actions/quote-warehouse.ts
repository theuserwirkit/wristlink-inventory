"use server"

import { revalidatePath } from "next/cache"
import { getDb } from "@/lib/db"
import { isAuthenticated } from "@/lib/auth"
import {
  getBookingById,
  getAvailabilityForGroupInternal,
  getRemainingRentalAmounts,
  getBaseAvailability,
  getBaseAvailabilityByDateRange,
} from "@/lib/actions/bookings"
import { getQuoteByIdInternal } from "@/lib/quotes-internal"
import { normalizeKanalanzahl } from "@/lib/konfigurator/kanalanzahl"
import {
  suggestBandAllocation,
  type BandAllocationLine,
  type BandBatchPool,
} from "@/lib/konfigurator/band-allocation"
import { isWristlinkProdukt, resolveGroupsForProduct } from "@/lib/product-mapping"
import type { FulfillmentStatus, QuoteConfig, QuoteStatus } from "@/lib/konfigurator/types"
import type { BookingWithRelations } from "@/lib/types"

async function ensureAuthed() {
  const authed = await isAuthenticated()
  if (!authed) throw new Error("Nicht authentifiziert")
}

const ACTIVE_QUOTE_STATUSES: QuoteStatus[] = [
  "submitted",
  "payment_pending",
  "approved",
  "paid",
]

export type QuoteStationInfo = {
  station: string
  stationModus: string
  gruppen: number
  baenderProGruppe: number
}

export type QuoteWarehouseBaseOption = {
  id: number
  bezeichnung: string
  hersteller: string
  kanalanzahl: number
  seriennummer: string | null
  verfuegbar: number
}

export type QuoteWarehouseData = {
  quoteId: number
  modus: string
  menge: number
  bookingId: number | null
  returnBookingId: number | null
  primaryBooking: BookingWithRelations | null
  returnBooking: BookingWithRelations | null
  remainingByGroup: Record<number, number>
  stationInfo: QuoteStationInfo | null
  availableBases: QuoteWarehouseBaseOption[]
  bandBatchPools: BandBatchPool[]
}

function resolveKanalanzahlForBases(config: QuoteConfig): number {
  return config.produkt === "armband" ? normalizeKanalanzahl(config.kanalanzahl) : 1
}

function resolveDefaultBaseAnzahl(config: QuoteConfig): number {
  const station = String(config.station || "keine").toLowerCase()
  if (station === "pro") return config.gruppen ?? 1
  return 1
}

async function loadAvailableBases(
  station: string,
  kanalanzahl: number,
): Promise<QuoteWarehouseBaseOption[]> {
  const sql = getDb()
  const stationTyp = station.toLowerCase()
  const rows = await sql`
    SELECT id, bezeichnung, hersteller, kanalanzahl, seriennummer
    FROM bases
    WHERE station_typ = ${stationTyp}
      AND kanalanzahl = ${kanalanzahl}
    ORDER BY bezeichnung ASC
  `

  return Promise.all(
    rows.map(async (row) => {
      const availability = await getBaseAvailability(Number(row.id))
      return {
        id: Number(row.id),
        bezeichnung: String(row.bezeichnung),
        hersteller: String(row.hersteller ?? ""),
        kanalanzahl: Number(row.kanalanzahl),
        seriennummer: row.seriennummer ? String(row.seriennummer) : null,
        verfuegbar: availability.verfuegbar,
      }
    }),
  )
}

export async function getQuoteWarehouseData(quoteId: number): Promise<QuoteWarehouseData> {
  await ensureAuthed()

  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) throw new Error("Anfrage nicht gefunden")

  const config = quote.config_json
  const [primaryBooking, returnBooking] = await Promise.all([
    quote.booking_id ? getBookingById(quote.booking_id) : Promise.resolve(null),
    quote.return_booking_id ? getBookingById(quote.return_booking_id) : Promise.resolve(null),
  ])

  const remainingByGroup: Record<number, number> = {}
  if (quote.booking_id && config.modus === "miete") {
    const remaining = await getRemainingRentalAmounts(quote.booking_id)
    for (const [groupId, amount] of remaining) {
      remainingByGroup[groupId] = amount
    }
  }

  const stationInfo: QuoteStationInfo | null =
    config.station && config.station !== "keine"
      ? {
          station: config.station,
          stationModus: config.stationModus || config.modus,
          gruppen: config.gruppen ?? 0,
          baenderProGruppe: config.baenderProGruppe ?? 0,
        }
      : null

  const availableBases = stationInfo
    ? await loadAvailableBases(stationInfo.station, resolveKanalanzahlForBases(config))
    : []

  const bandBatchPools = await loadBandBatchPools(quote, primaryBooking)

  return {
    quoteId: quote.id,
    modus: config.modus,
    menge: config.menge,
    bookingId: quote.booking_id,
    returnBookingId: quote.return_booking_id,
    primaryBooking,
    returnBooking,
    remainingByGroup,
    stationInfo,
    availableBases,
    bandBatchPools,
  }
}

const ALLOCATION_REQUIRED_ERROR =
  "Bitte zuerst Leuchtgruppe und Charge im Lager-Panel zuweisen."

const BOOKING_REQUIRED_ERROR =
  "Bitte zuerst Reservierung/Buchung anlegen (Zahlung oder Miet-Hold)."

const BASE_ALLOCATION_REQUIRED_ERROR =
  "Bitte Basis-Station im Lager-Panel zuweisen."

function fulfillmentStepRequiresBooking(targetStep: FulfillmentStatus): boolean {
  return targetStep === "vorbereitet"
}

function fulfillmentStepRequiresFullAllocation(targetStep: FulfillmentStatus): boolean {
  return (
    targetStep === "verpackt" ||
    targetStep === "bedruckt" ||
    targetStep === "versand_beauftragt" ||
    targetStep === "versandt"
  )
}

export async function isQuoteBaseAllocationComplete(quoteId: number): Promise<boolean> {
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return false

  const config = quote.config_json
  const station = String(config.station || "keine").toLowerCase()
  if (!config.station || station === "keine") return true
  if (!quote.booking_id) return false

  const booking = await getBookingById(quote.booking_id)
  if (!booking) return false

  const baseItems = booking.items.filter((item) => item.base_id != null)
  return baseItems.some((item) => (item.anzahl_basen ?? item.anzahl ?? 0) >= 1)
}

export async function isQuoteAllocationComplete(quoteId: number): Promise<boolean> {
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote?.booking_id) return false

  const booking = await getBookingById(quote.booking_id)
  if (!booking) return false

  const bandItems = booking.items.filter((item) => item.group_id != null)
  if (bandItems.length === 0) return false

  const allAssigned = bandItems.every((item) => item.group_id != null && item.batch_id != null)
  if (!allAssigned) return false

  const assignedTotal = bandItems.reduce((sum, item) => sum + (item.anzahl || 0), 0)
  return assignedTotal === quote.config_json.menge
}

export async function isQuoteWarehouseReadyForPrint(quoteId: number): Promise<boolean> {
  const [bandComplete, baseComplete] = await Promise.all([
    isQuoteAllocationComplete(quoteId),
    isQuoteBaseAllocationComplete(quoteId),
  ])
  return bandComplete && baseComplete
}

export async function validateWarehouseForFulfillmentStep(
  quoteId: number,
  targetStep: FulfillmentStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (fulfillmentStepRequiresBooking(targetStep)) {
    const quote = await getQuoteByIdInternal(quoteId)
    if (!quote?.booking_id) {
      return { ok: false, error: BOOKING_REQUIRED_ERROR }
    }
  }

  if (fulfillmentStepRequiresFullAllocation(targetStep)) {
    const [bandComplete, baseComplete] = await Promise.all([
      isQuoteAllocationComplete(quoteId),
      isQuoteBaseAllocationComplete(quoteId),
    ])

    if (!baseComplete) {
      return { ok: false, error: BASE_ALLOCATION_REQUIRED_ERROR }
    }
    if (!bandComplete) {
      return { ok: false, error: ALLOCATION_REQUIRED_ERROR }
    }
  }

  return { ok: true }
}

export async function getWarehouseFulfillmentBlockMessage(
  quoteId: number,
  nextStep: FulfillmentStatus | null,
): Promise<string | null> {
  await ensureAuthed()
  if (!nextStep) return null

  if (fulfillmentStepRequiresBooking(nextStep)) {
    const quote = await getQuoteByIdInternal(quoteId)
    if (!quote?.booking_id) return BOOKING_REQUIRED_ERROR
  }

  if (fulfillmentStepRequiresFullAllocation(nextStep)) {
    const [bandComplete, baseComplete] = await Promise.all([
      isQuoteAllocationComplete(quoteId),
      isQuoteBaseAllocationComplete(quoteId),
    ])

    if (!baseComplete) return BASE_ALLOCATION_REQUIRED_ERROR
    if (!bandComplete) return ALLOCATION_REQUIRED_ERROR
  }

  return null
}

async function resolveSkuId(sql: ReturnType<typeof getDb>, groupId: number): Promise<number> {
  const existingSku = await sql`
    SELECT id FROM skus WHERE item_type = 'LED_BAND' AND group_id = ${groupId} LIMIT 1
  `
  if (existingSku.length > 0) return existingSku[0].id

  const newSku = await sql`
    INSERT INTO skus (item_type, group_id) VALUES ('LED_BAND', ${groupId}) RETURNING id
  `
  return newSku[0].id
}

async function resolveLotId(
  sql: ReturnType<typeof getDb>,
  skuId: number,
  batchId: number,
): Promise<number | null> {
  const existingLot = await sql`
    SELECT id FROM inventory_lots WHERE sku_id = ${skuId} AND batch_id = ${batchId} LIMIT 1
  `
  return existingLot.length > 0 ? existingLot[0].id : null
}

async function loadBandBatchPools(
  quote: Awaited<ReturnType<typeof getQuoteByIdInternal>>,
  primaryBooking: BookingWithRelations | null,
): Promise<BandBatchPool[]> {
  if (!quote) return []

  const config = quote.config_json
  const produkt = String(config.produkt || "").toLowerCase()
  if (!isWristlinkProdukt(produkt)) return []

  const kanalanzahl =
    produkt === "armband" ? normalizeKanalanzahl(config.kanalanzahl) : undefined
  const groups = await resolveGroupsForProduct(produkt, kanalanzahl)
  if (groups.length === 0) return []

  const sql = getDb()
  const groupIds = groups.map((group) => group.id)
  const pairs = await sql`
    SELECT DISTINCT group_id, batch_id
    FROM (
      SELECT bi.group_id, bi.batch_id
      FROM booking_items bi
      WHERE bi.group_id = ANY(${groupIds}) AND bi.batch_id IS NOT NULL
      UNION
      SELECT s.group_id, il.batch_id
      FROM inventory_lots il
      JOIN skus s ON s.id = il.sku_id
      WHERE s.group_id = ANY(${groupIds}) AND il.batch_id IS NOT NULL
    ) AS gb
    ORDER BY group_id ASC, batch_id ASC
  `

  const bandItems =
    primaryBooking?.items.filter((item) => item.group_id != null && item.batch_id != null) ?? []
  const ownByPair = new Map<string, number>()
  for (const item of bandItems) {
    const key = `${item.group_id}:${item.batch_id}`
    ownByPair.set(key, (ownByPair.get(key) || 0) + (item.anzahl || 0))
  }

  const pools: BandBatchPool[] = []
  for (const pair of pairs) {
    const groupId = Number(pair.group_id)
    const batchId = Number(pair.batch_id)
    const group = groups.find((entry) => entry.id === groupId)
    if (!group) continue

    const batchRows = await sql`SELECT code FROM batches WHERE id = ${batchId} LIMIT 1`
    const availability = await getAvailabilityForGroupInternal(groupId, batchId)
    const key = `${groupId}:${batchId}`
    const ownQty = ownByPair.get(key) || 0

    pools.push({
      groupId,
      groupName: group.name,
      batchId,
      batchCode: String(batchRows[0]?.code ?? `#${batchId}`),
      verfuegbar: availability.verfuegbar + ownQty,
      gesamtsumme: availability.gesamtsumme + ownQty,
      inVermietung: availability.inVermietung,
    })
  }

  return pools.sort((a, b) => b.verfuegbar - a.verfuegbar)
}

export async function getQuoteBandAllocationSuggestion(
  quoteId: number,
): Promise<BandAllocationLine[]> {
  await ensureAuthed()
  const data = await getQuoteWarehouseData(quoteId)
  return suggestBandAllocation(data.menge, data.bandBatchPools)
}

async function checkBaseAvailabilityForBooking(
  baseId: number,
  neededAnzahl: number,
  booking: BookingWithRelations,
  existingBaseItem: BookingWithRelations["items"][number] | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sameBase = existingBaseItem?.base_id === baseId
  const currentAnzahl = existingBaseItem
    ? (existingBaseItem.anzahl_basen ?? existingBaseItem.anzahl ?? 0)
    : 0

  if (booking.booking_type === "MIETE_AUSGABE") {
    const ausgabe = booking.datum_ausgabe ? new Date(booking.datum_ausgabe) : null
    const rueckgabe = booking.datum_rueckgabe_geplant
      ? new Date(booking.datum_rueckgabe_geplant)
      : ausgabe
    if (!ausgabe) {
      return { ok: false, error: "Ausgabedatum fehlt für Verfügbarkeitsprüfung" }
    }

    const availability = await getBaseAvailabilityByDateRange(baseId, ausgabe, rueckgabe || ausgabe)
    const effective = sameBase ? availability.verfuegbar + currentAnzahl : availability.verfuegbar
    if (effective < neededAnzahl) {
      return {
        ok: false,
        error: `Nicht genügend verfügbar. Verfügbar: ${effective}, benötigt: ${neededAnzahl}`,
      }
    }
    return { ok: true }
  }

  const availability = await getBaseAvailability(baseId)
  const effective = sameBase ? availability.verfuegbar + currentAnzahl : availability.verfuegbar
  if (effective < neededAnzahl) {
    return {
      ok: false,
      error: `Nicht genügend verfügbar. Verfügbar: ${effective}, benötigt: ${neededAnzahl}`,
    }
  }

  return { ok: true }
}

export async function updateQuoteBookingBaseAllocation(
  quoteId: number,
  input: { baseId: number; anzahl?: number },
): Promise<{ success: boolean; error?: string }> {
  try {
    const authed = await isAuthenticated()
    if (!authed) return { success: false, error: "Nicht authentifiziert" }

    const quote = await getQuoteByIdInternal(quoteId)
    if (!quote) return { success: false, error: "Anfrage nicht gefunden" }
    if (!quote.booking_id) {
      return { success: false, error: "Keine Buchung mit dieser Anfrage verknüpft" }
    }
    if (!ACTIVE_QUOTE_STATUSES.includes(quote.status)) {
      return { success: false, error: `Zuweisung bei Status ${quote.status} nicht erlaubt` }
    }

    const booking = await getBookingById(quote.booking_id)
    if (!booking) return { success: false, error: "Buchung nicht gefunden" }
    if (booking.booking_type !== "MIETE_AUSGABE" && booking.booking_type !== "VERKAUF") {
      return { success: false, error: "Zuweisung nur für Miet- oder Verkaufsbuchungen möglich" }
    }

    const config = quote.config_json
    const anzahl = input.anzahl ?? resolveDefaultBaseAnzahl(config)
    const baseItems = booking.items.filter((item) => item.base_id != null)
    const existingBaseItem = baseItems[0] ?? null
    const currentAnzahl = existingBaseItem
      ? (existingBaseItem.anzahl_basen ?? existingBaseItem.anzahl ?? 0)
      : 0
    const sameAllocation =
      existingBaseItem?.base_id === input.baseId && currentAnzahl === anzahl

    if (!sameAllocation) {
      const availabilityCheck = await checkBaseAvailabilityForBooking(
        input.baseId,
        anzahl,
        booking,
        existingBaseItem,
      )
      if (!availabilityCheck.ok) return { success: false, error: availabilityCheck.error }
    }

    const sql = getDb()

    const baseRow = await sql`
      SELECT seriennummer FROM bases WHERE id = ${input.baseId} LIMIT 1
    `
    const seriennummer = baseRow[0]?.seriennummer
      ? String(baseRow[0].seriennummer).trim()
      : ""
    if (!seriennummer) {
      return {
        success: false,
        error: "Basis hat keine Seriennummer. Bitte unter Admin eine eindeutige Seriennummer pflegen.",
      }
    }

    if (existingBaseItem) {
      await sql`
        UPDATE booking_items
        SET base_id = ${input.baseId},
            anzahl_basen = ${anzahl},
            anzahl = ${anzahl}
        WHERE id = ${existingBaseItem.id}
      `
    } else {
      await sql`
        INSERT INTO booking_items (booking_id, base_id, anzahl_basen, anzahl, anzahl_fehlt)
        VALUES (${quote.booking_id}, ${input.baseId}, ${anzahl}, ${anzahl}, 0)
      `
    }

    revalidatePath(`/warenverwaltung/auftraege/${quoteId}`)
    revalidatePath("/warenverwaltung/buchungen")
    revalidatePath("/kalender")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("updateQuoteBookingBaseAllocation failed:", error)
    const message = error instanceof Error ? error.message : "Unbekannter Fehler"
    return { success: false, error: `Fehler beim Aktualisieren der Basis-Zuweisung: ${message}` }
  }
}

async function effectiveBandAvailability(
  groupId: number,
  batchId: number,
  booking: BookingWithRelations,
  bandItems: BookingWithRelations["items"],
): Promise<number> {
  const availability = await getAvailabilityForGroupInternal(groupId, batchId)
  const ownQty = bandItems
    .filter((item) => item.group_id === groupId && item.batch_id === batchId)
    .reduce((sum, item) => sum + (item.anzahl || 0), 0)
  return availability.verfuegbar + ownQty
}

export async function saveQuoteBandAllocations(
  quoteId: number,
  allocations: Array<{ groupId: number; batchId: number; anzahl: number }>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const authed = await isAuthenticated()
    if (!authed) return { success: false, error: "Nicht authentifiziert" }

    const quote = await getQuoteByIdInternal(quoteId)
    if (!quote) return { success: false, error: "Anfrage nicht gefunden" }
    if (!quote.booking_id) {
      return { success: false, error: "Keine Buchung mit dieser Anfrage verknüpft" }
    }
    if (!ACTIVE_QUOTE_STATUSES.includes(quote.status)) {
      return { success: false, error: `Zuweisung bei Status ${quote.status} nicht erlaubt` }
    }

    const requiredMenge = quote.config_json.menge
    const normalized = allocations
      .map((row) => ({
        groupId: Number(row.groupId),
        batchId: Number(row.batchId),
        anzahl: Number(row.anzahl),
      }))
      .filter((row) => row.anzahl > 0)

    if (normalized.length === 0) {
      return { success: false, error: "Mindestens eine Zuweisungszeile erforderlich" }
    }

    const total = normalized.reduce((sum, row) => sum + row.anzahl, 0)
    if (total !== requiredMenge) {
      return {
        success: false,
        error: `Summe (${total}) muss exakt der Auftragsmenge (${requiredMenge}) entsprechen`,
      }
    }

    const booking = await getBookingById(quote.booking_id)
    if (!booking) return { success: false, error: "Buchung nicht gefunden" }
    if (booking.booking_type !== "MIETE_AUSGABE" && booking.booking_type !== "VERKAUF") {
      return { success: false, error: "Zuweisung nur für Miet- oder Verkaufsbuchungen möglich" }
    }

    const bandItems = booking.items.filter((item) => item.group_id != null)
    for (const row of normalized) {
      const effective = await effectiveBandAvailability(
        row.groupId,
        row.batchId,
        booking,
        bandItems,
      )
      if (effective < row.anzahl) {
        const groupRows = await getDb()`SELECT name FROM groups WHERE id = ${row.groupId} LIMIT 1`
        const batchRows = await getDb()`SELECT code FROM batches WHERE id = ${row.batchId} LIMIT 1`
        return {
          success: false,
          error: `Nicht genügend verfügbar für ${groupRows[0]?.name ?? "Gruppe"} / ${batchRows[0]?.code ?? "Charge"}. Verfügbar: ${effective}, benötigt: ${row.anzahl}`,
        }
      }
    }

    const sql = getDb()
    const bandItemIds = bandItems.map((item) => item.id)
    if (bandItemIds.length > 0) {
      await sql`DELETE FROM booking_items WHERE id = ANY(${bandItemIds})`
    }

    for (const row of normalized) {
      const skuId = await resolveSkuId(sql, row.groupId)
      const lotId = await resolveLotId(sql, skuId, row.batchId)
      await sql`
        INSERT INTO booking_items (booking_id, group_id, sku_id, lot_id, batch_id, anzahl, anzahl_fehlt)
        VALUES (${quote.booking_id}, ${row.groupId}, ${skuId}, ${lotId}, ${row.batchId}, ${row.anzahl}, 0)
      `
    }

    revalidatePath(`/warenverwaltung/auftraege/${quoteId}`)
    revalidatePath("/warenverwaltung/buchungen")
    revalidatePath("/kalender")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("saveQuoteBandAllocations failed:", error)
    const message = error instanceof Error ? error.message : "Unbekannter Fehler"
    return { success: false, error: `Fehler beim Speichern der Zuweisung: ${message}` }
  }
}

export async function updateQuoteBookingAllocation(
  quoteId: number,
  input: { groupId: number; batchId: number; bookingItemId?: number },
): Promise<{ success: boolean; error?: string }> {
  try {
    const authed = await isAuthenticated()
    if (!authed) return { success: false, error: "Nicht authentifiziert" }

    const quote = await getQuoteByIdInternal(quoteId)
    if (!quote) return { success: false, error: "Anfrage nicht gefunden" }
    if (!quote.booking_id) {
      return { success: false, error: "Keine Buchung mit dieser Anfrage verknüpft" }
    }
    if (!ACTIVE_QUOTE_STATUSES.includes(quote.status)) {
      return { success: false, error: `Zuweisung bei Status ${quote.status} nicht erlaubt` }
    }

    const booking = await getBookingById(quote.booking_id)
    if (!booking) return { success: false, error: "Buchung nicht gefunden" }
    if (booking.booking_type !== "MIETE_AUSGABE" && booking.booking_type !== "VERKAUF") {
      return { success: false, error: "Zuweisung nur für Miet- oder Verkaufsbuchungen möglich" }
    }

    const bandItems = booking.items.filter((item) => item.group_id != null)
    const targetItem = input.bookingItemId
      ? bandItems.find((item) => item.id === input.bookingItemId)
      : bandItems[0]
    if (!targetItem) {
      return { success: false, error: "Kein Leuchtgruppen-Position in der Buchung gefunden" }
    }

    const sameAllocation =
      targetItem.group_id === input.groupId && targetItem.batch_id === input.batchId
    if (!sameAllocation) {
      const effective = await effectiveBandAvailability(
        input.groupId,
        input.batchId,
        booking,
        bandItems,
      )
      if (effective < targetItem.anzahl) {
        return {
          success: false,
          error: `Nicht genügend verfügbar. Verfügbar: ${effective}, benötigt: ${targetItem.anzahl}`,
        }
      }
    }

    const sql = getDb()
    const newSkuId = await resolveSkuId(sql, input.groupId)
    const newLotId = await resolveLotId(sql, newSkuId, input.batchId)

    await sql`
      UPDATE booking_items
      SET group_id = ${input.groupId},
          batch_id = ${input.batchId},
          sku_id = ${newSkuId},
          lot_id = ${newLotId}
      WHERE id = ${targetItem.id}
    `

    revalidatePath(`/warenverwaltung/auftraege/${quoteId}`)
    revalidatePath("/warenverwaltung/buchungen")
    revalidatePath("/kalender")
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("updateQuoteBookingAllocation failed:", error)
    const message = error instanceof Error ? error.message : "Unbekannter Fehler"
    return { success: false, error: `Fehler beim Aktualisieren der Zuweisung: ${message}` }
  }
}
