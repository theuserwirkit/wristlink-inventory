"use server"

import { getDb } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { cache } from "react"
import type {
  CreateBookingInput,
  BookingStatus,
  BookingType,
  StockItemRow,
  RentalRow,
  GroupRow,
  BatchRow,
  CustomerRow,
  BaseRow,
  BookingWithRelations,
} from "@/lib/types"
import { isAuthenticated } from "@/lib/auth"
import { computeStockFromItems } from "@/lib/utils/booking"
import { addWorkdays as addWorkdaysServer, addDays as addDaysServer, rangesOverlap } from "@/lib/utils/date"

// Guard für lesende Admin-Actions. Wirft, wenn keine gültige Admin-Session vorliegt.
async function ensureAuthed() {
  const authed = await isAuthenticated()
  if (!authed) throw new Error("Nicht authentifiziert")
}

export async function createBooking(input: CreateBookingInput) {
  const authed = await isAuthenticated()
  if (!authed) return { success: false, error: "Nicht authentifiziert" }
  return createBookingInternal(input)
}

export async function createBookingInternal(input: CreateBookingInput) {
  try {
    const sql = getDb()

    if (!input.items || input.items.length === 0) {
      const hasBaseItems = input.baseItems && input.baseItems.length > 0
      if (!hasBaseItems) {
        return { success: false, error: "Mindestens eine Leuchtgruppe oder Basis muss ausgewählt werden" }
      }
    }

    if (input.bookingType === "MIETE_RUECKGABE") {
      const rentedItems = await getRentedItemsByGroup(input.batchId)
      for (const item of input.items) {
        const rentedAmount = rentedItems.get(item.groupId) || 0
        const totalReturned = item.anzahl + (item.anzahlFehlt || 0)
        if (rentedAmount < totalReturned) {
          const groups = await sql`SELECT name FROM groups WHERE id = ${item.groupId}`
          return {
            success: false,
            error: `Nicht genügend vermietete Artikel für ${groups[0]?.name || "Gruppe"}. In Vermietung: ${rentedAmount}, Rückgabe angefordert: ${totalReturned}`,
          }
        }
      }
    }

    if (input.bookingType === "VERKAUF" || input.bookingType === "MIETE_AUSGABE") {
      for (const item of input.items) {
        const availability = await getAvailabilityForGroupInternal(item.groupId, item.batchId || input.batchId)
        if (availability.verfuegbar < item.anzahl) {
          const groups = await sql`SELECT name FROM groups WHERE id = ${item.groupId}`
          const batchId = item.batchId || input.batchId
          const batches = batchId ? await sql`SELECT code FROM batches WHERE id = ${batchId}` : []
          return {
            success: false,
            error: `Nicht genügend verfügbare Artikel für ${groups[0]?.name || "Gruppe"} mit Charge ${batches[0]?.code || ""}. Verfügbar: ${availability.verfuegbar}, Angefordert: ${item.anzahl}`,
          }
        }
      }
    }

    let customerId: number | null = null
    if (input.customerName) {
      const existing = await sql`SELECT id, name FROM customers WHERE LOWER(name) = LOWER(${input.customerName}) LIMIT 1`
      if (existing.length > 0) {
        customerId = existing[0].id
      } else {
        const newCustomer = await sql`INSERT INTO customers (name) VALUES (${input.customerName}) RETURNING id`
        customerId = newCustomer[0].id
      }
    }

    const bookings = await sql`
      INSERT INTO bookings (booking_type, status, customer_id, datum_ausgabe, datum_rueckgabe_geplant, datum_rueckgabe_ist, reference_rental_id, bemerkung)
      VALUES (${input.bookingType}, ${input.status || "BESTAETIGT"}, ${customerId}, ${input.datumAusgabe?.toISOString() || null}, ${input.datumRueckgabeGeplant?.toISOString() || null}, ${input.datumRueckgabeIst?.toISOString() || null}, ${input.referenceRentalId || null}, ${input.bemerkung || null})
      RETURNING *
    `
    const booking = bookings[0]

    for (const item of input.items) {
      let skuId: number | null = null
      const existingSku = await sql`SELECT id FROM skus WHERE item_type = 'LED_BAND' AND group_id = ${item.groupId} LIMIT 1`
      if (existingSku.length > 0) {
        skuId = existingSku[0].id
      } else {
        const newSku = await sql`INSERT INTO skus (item_type, group_id) VALUES ('LED_BAND', ${item.groupId}) RETURNING id`
        skuId = newSku[0].id
      }

      let lotId: number | null = null
      const batchIdToUse = item.batchId || input.batchId

      if (batchIdToUse) {
        const existingLot = await sql`SELECT id, menge FROM inventory_lots WHERE sku_id = ${skuId} AND batch_id = ${batchIdToUse} LIMIT 1`
        if (existingLot.length > 0) {
          lotId = existingLot[0].id
          if (input.bookingType === "ZUGANG") {
            await sql`UPDATE inventory_lots SET menge = ${existingLot[0].menge + item.anzahl} WHERE id = ${lotId}`
          } else if (input.bookingType === "VERKAUF") {
            await sql`UPDATE inventory_lots SET menge = ${existingLot[0].menge - item.anzahl} WHERE id = ${lotId}`
          } else if (input.bookingType === "MIETE_RUECKGABE") {
            await sql`UPDATE inventory_lots SET menge = ${existingLot[0].menge + item.anzahl} WHERE id = ${lotId}`
          }
        } else if (input.bookingType === "ZUGANG") {
          const newLot = await sql`INSERT INTO inventory_lots (sku_id, batch_id, menge) VALUES (${skuId}, ${batchIdToUse}, ${item.anzahl}) RETURNING id`
          lotId = newLot[0].id
        }
      }

      const anzahlFehlt = (item.anzahlFehlt !== undefined && item.anzahlFehlt > 0) ? item.anzahlFehlt : 0
      await sql`
        INSERT INTO booking_items (booking_id, group_id, sku_id, lot_id, batch_id, anzahl, anzahl_fehlt)
        VALUES (${booking.id}, ${item.groupId}, ${skuId}, ${lotId}, ${batchIdToUse}, ${item.anzahl}, ${anzahlFehlt})
      `
    }

    // Handle base items
    if (input.baseItems && input.baseItems.length > 0) {
      for (const baseItem of input.baseItems) {
        const anzahlFehlt = (baseItem.anzahlFehlt !== undefined && baseItem.anzahlFehlt > 0) ? baseItem.anzahlFehlt : 0
        await sql`
          INSERT INTO booking_items (booking_id, base_id, anzahl_basen, anzahl, anzahl_fehlt)
          VALUES (${booking.id}, ${baseItem.baseId}, ${baseItem.anzahl}, ${baseItem.anzahl}, ${anzahlFehlt})
        `
      }
    }

    revalidatePath("/")
    revalidatePath("/admin")
    return { success: true, data: booking }
  } catch (error) {
    return { success: false, error: "Fehler beim Erstellen der Buchung" }
  }
}

export async function updateBookingStatus(bookingId: number, status: BookingStatus) {
  try {
  const authed = await isAuthenticated()
  if (!authed) return { success: false, error: "Nicht authentifiziert" }

  const sql = getDb()
    await sql`UPDATE bookings SET status = ${status} WHERE id = ${bookingId}`
    revalidatePath("/")
    revalidatePath("/admin")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Fehler beim Aktualisieren des Status" }
  }
}

export async function getAvailabilityForGroup(groupId: number, batchId?: number) {
  await ensureAuthed()
  return getAvailabilityForGroupInternal(groupId, batchId)
}

async function getAvailabilityForGroupInternal(groupId: number, batchId?: number) {
  const sql = getDb()

  let items
  if (batchId) {
    items = await sql`
      SELECT bi.anzahl, bi.anzahl_fehlt, bi.batch_id, b.booking_type
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
      WHERE bi.group_id = ${groupId} AND bi.batch_id = ${batchId}
    `
  } else {
    items = await sql`
      SELECT bi.anzahl, bi.anzahl_fehlt, bi.batch_id, b.booking_type
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
      WHERE bi.group_id = ${groupId}
    `
  }

  if (!items || items.length === 0) {
    return { verfuegbar: 0, inVermietung: 0, gesamtsumme: 0 }
  }

  let totalZugang = 0, totalVerkauft = 0, totalRented = 0, totalReturned = 0, totalDefekt = 0

  for (const item of items) {
    const anzahl = item.anzahl || 0
    switch (item.booking_type) {
      case "ZUGANG": totalZugang += anzahl; break
      case "VERKAUF": totalVerkauft += anzahl; break
      case "MIETE_AUSGABE": totalRented += anzahl; break
      case "MIETE_RUECKGABE":
        totalReturned += anzahl
        totalDefekt += item.anzahl_fehlt || 0
        break
    }
  }

  const totalStock = totalZugang - totalVerkauft - totalDefekt
  const inVermietung = totalRented - (totalReturned + totalDefekt)
  const verfuegbar = totalStock - inVermietung
  const gesamtsumme = verfuegbar + inVermietung

  return { verfuegbar, inVermietung, gesamtsumme }
}

export async function getBookings(filters?: {
  startDate?: Date
  endDate?: Date
  bookingType?: BookingType
  groupId?: number
  customerId?: number
  searchTerm?: string
  limit?: number
}) {
  await ensureAuthed()
  const sql = getDb()
  const limit = Math.min(Math.max(Math.floor(filters?.limit ?? 200), 1), 1000)

  const bookings = await sql`
    SELECT b.*,
      c.id as customer_id_ref, c.name as customer_name
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    ORDER BY b.created_at DESC
    LIMIT ${limit}
  `

  if (!bookings.length) return []
  const bookingIds = bookings.map((booking: any) => Number(booking.id))

  const allItems = await sql`
    SELECT bi.*, g.id as group_id_ref, g.name as group_name,
      ba.id as batch_id_ref, ba.code as batch_code, ba.funktionsumfang as batch_funktionsumfang,
      ba.lieferant as batch_lieferant, ba.lieferdatum as batch_lieferdatum,
      bases.id as base_id_ref, bases.bezeichnung as base_bezeichnung, bases.hersteller as base_hersteller,
      bases.kanalanzahl as base_kanalanzahl
    FROM booking_items bi
    LEFT JOIN groups g ON g.id = bi.group_id
    LEFT JOIN batches ba ON ba.id = bi.batch_id
    LEFT JOIN bases ON bases.id = bi.base_id
    WHERE bi.booking_id = ANY(${bookingIds})
  `

  const itemsByBooking = new Map<number, any[]>()
  for (const item of allItems) {
    if (!itemsByBooking.has(item.booking_id)) {
      itemsByBooking.set(item.booking_id, [])
    }
    itemsByBooking.get(item.booking_id)!.push({
      id: item.id,
      group_id: item.group_id,
      anzahl: item.anzahl,
      anzahl_fehlt: item.anzahl_fehlt,
      anzahl_basen: item.anzahl_basen,
      batch_id: item.batch_id,
      base_id: item.base_id,
      group: item.group_id_ref ? { id: item.group_id_ref, name: item.group_name } : null,
      batch: item.batch_id_ref ? {
        id: item.batch_id_ref, code: item.batch_code,
        funktionsumfang: item.batch_funktionsumfang,
        lieferant: item.batch_lieferant, lieferdatum: item.batch_lieferdatum
      } : null,
      base: item.base_id_ref ? {
        id: item.base_id_ref, bezeichnung: item.base_bezeichnung,
        hersteller: item.base_hersteller, kanalanzahl: item.base_kanalanzahl,
      } : null,
    })
  }

  return bookings.map((b: any) => ({
    ...b,
    customer: b.customer_name ? { id: b.customer_id_ref, name: b.customer_name } : null,
    items: itemsByBooking.get(b.id) || [],
  }))
}

export async function getStats(filters?: { groupId?: number }) {
  await ensureAuthed()
  const sql = getDb()

  const groups = await sql`SELECT id, name FROM groups ORDER BY name ASC`
  if (!groups || groups.length === 0) return []

  let items
  if (filters?.groupId) {
    items = await sql`
      SELECT bi.group_id, bi.anzahl, bi.anzahl_fehlt, b.booking_type
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
      WHERE bi.group_id = ${filters.groupId}
    `
  } else {
    items = await sql`
      SELECT bi.group_id, bi.anzahl, bi.anzahl_fehlt, b.booking_type
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
    `
  }

  const itemsByGroup = new Map<number, any[]>()
  for (const item of items || []) {
    if (!itemsByGroup.has(item.group_id)) {
      itemsByGroup.set(item.group_id, [])
    }
    itemsByGroup.get(item.group_id)!.push(item)
  }

  return groups.map((group: any) => {
    const groupItems = itemsByGroup.get(group.id) || []
    let totalStock = 0, totalSold = 0, totalRented = 0, totalReturned = 0, totalDefekt = 0

    for (const item of groupItems) {
      const anzahl = item.anzahl || 0
      switch (item.booking_type) {
        case "ZUGANG": totalStock += anzahl; break
        case "VERKAUF": totalSold += anzahl; break
        case "MIETE_AUSGABE": totalRented += anzahl; break
        case "MIETE_RUECKGABE":
          totalReturned += anzahl
          totalDefekt += item.anzahl_fehlt || 0
          break
      }
    }

    const inVermietung = totalRented - (totalReturned + totalDefekt)
    const gesamtsumme = totalStock - totalSold - totalDefekt
    const verfuegbar = gesamtsumme - inVermietung

    return {
      groupId: group.id, groupName: group.name,
      verfuegbar, inVermietung, gesamtsumme, verkauft: totalSold, defekt: totalDefekt,
    }
  })
}

export async function getGroups(): Promise<GroupRow[]> {
  await ensureAuthed()
  const sql = getDb()
  return (await sql`SELECT * FROM groups ORDER BY name ASC`) as unknown as GroupRow[]
}

export async function getBatches(): Promise<BatchRow[]> {
  await ensureAuthed()
  const sql = getDb()
  return (await sql`SELECT * FROM batches ORDER BY lieferdatum DESC`) as unknown as BatchRow[]
}

export async function getCustomers(limit = 500): Promise<CustomerRow[]> {
  await ensureAuthed()
  const sql = getDb()
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 2000)
  return (await sql`SELECT * FROM customers ORDER BY name ASC LIMIT ${safeLimit}`) as unknown as CustomerRow[]
}

export async function getBases(limit = 500): Promise<BaseRow[]> {
  await ensureAuthed()
  const sql = getDb()
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 2000)
  return (await sql`
    SELECT b.*, ba.code as batch_code, ba.funktionsumfang as batch_funktionsumfang
    FROM bases b
    LEFT JOIN batches ba ON ba.id = b.batch_id
    ORDER BY b.bezeichnung ASC
    LIMIT ${safeLimit}
  `) as unknown as BaseRow[]
}

export async function getBasesByBatch(batchId: number) {
  const sql = getDb()
  return await sql`
    SELECT b.*, ba.code as batch_code
    FROM bases b
    LEFT JOIN batches ba ON ba.id = b.batch_id
    WHERE b.batch_id = ${batchId} OR b.batch_id IS NULL
    ORDER BY b.bezeichnung ASC
  `
}

export async function getBaseAvailability(baseId: number) {
  const sql = getDb()

  const items = await sql`
    SELECT bi.anzahl_basen, bi.anzahl, bi.anzahl_fehlt, b.booking_type
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE bi.base_id = ${baseId}
  `

  let totalZugang = 0, totalVerkauft = 0, totalRented = 0, totalReturned = 0, totalDefekt = 0

  for (const item of items || []) {
    const anzahl = item.anzahl_basen != null ? item.anzahl_basen : (item.anzahl || 0)
    switch (item.booking_type) {
      case "ZUGANG": totalZugang += anzahl; break
      case "VERKAUF": totalVerkauft += anzahl; break
      case "MIETE_AUSGABE": totalRented += anzahl; break
      case "MIETE_RUECKGABE":
        totalReturned += anzahl
        totalDefekt += item.anzahl_fehlt || 0
        break
    }
  }

  const bookedStock = totalZugang - totalVerkauft - totalDefekt
  // Jeder Basis-Datensatz steht für ein physisches Gerät; ohne ZUGANG-Buchung gilt 1 Stück.
  const totalStock = bookedStock > 0 ? bookedStock : 1
  const inVermietung = totalRented - (totalReturned + totalDefekt)
  const verfuegbar = totalStock - inVermietung

  return { verfuegbar, inVermietung, gesamtsumme: totalStock }
}

// ─── Date-range-based availability ─────────────────────────────────────────
// Computes how many items are available considering Vorlauf/Nachlauf and other bookings in the period.

export const getBufferSettings = cache(async (): Promise<{ departureBufferDays: number; returnBufferDays: number }> => {
  const sql = getDb()
  const rows = await sql`SELECT key, value FROM system_settings WHERE key IN ('departure_buffer_days', 'return_buffer_days')`
  let departureBufferDays = 6
  let returnBufferDays = 5
  for (const row of rows) {
    if (row.key === "departure_buffer_days") departureBufferDays = parseInt(row.value) || 6
    if (row.key === "return_buffer_days") returnBufferDays = parseInt(row.value) || 5
  }
  return { departureBufferDays, returnBufferDays }
})

type GroupBatchAvailability = {
  groupId: number
  batchId: number
  verfuegbar: number
  inVermietung: number
  gesamtsumme: number
}

export async function getAvailabilityForGroupBatchesByDateRange(
  groupIds: number[],
  ausgabedatum: Date,
  rueckgabedatum: Date,
): Promise<GroupBatchAvailability[]> {
  const normalizedGroupIds = Array.from(new Set(groupIds.filter((id) => Number.isFinite(id))))
  if (normalizedGroupIds.length === 0) return []

  const sql = getDb()
  const { departureBufferDays, returnBufferDays } = await getBufferSettings()
  const newFrom = addWorkdaysServer(ausgabedatum, -departureBufferDays)
  const newTo = addDaysServer(rueckgabedatum, returnBufferDays)

  const pairs = await sql`
    SELECT DISTINCT group_id, batch_id
    FROM (
      SELECT bi.group_id, bi.batch_id
      FROM booking_items bi
      WHERE bi.group_id = ANY(${normalizedGroupIds}) AND bi.batch_id IS NOT NULL
      UNION
      SELECT s.group_id, il.batch_id
      FROM inventory_lots il
      JOIN skus s ON s.id = il.sku_id
      WHERE s.group_id = ANY(${normalizedGroupIds}) AND il.batch_id IS NOT NULL
    ) AS gb
    ORDER BY group_id ASC, batch_id ASC
  `
  if (!pairs.length) return []

  const batchIds = Array.from(
    new Set(pairs.map((row) => Number(row.batch_id))),
  )

  const stockRows = await sql`
    SELECT bi.group_id, bi.batch_id, b.booking_type, bi.anzahl, bi.anzahl_fehlt
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE bi.group_id = ANY(${normalizedGroupIds})
      AND bi.batch_id = ANY(${batchIds})
  `

  const stockByPair = new Map<string, number>()
  for (const row of stockRows) {
    const key = `${row.group_id}:${row.batch_id}`
    const current = stockByPair.get(key) || 0
    const anzahl = row.anzahl || 0
    const anzahlFehlt = row.anzahl_fehlt || 0
    if (row.booking_type === "ZUGANG") {
      stockByPair.set(key, current + anzahl)
    } else if (row.booking_type === "VERKAUF") {
      stockByPair.set(key, current - anzahl)
    } else if (row.booking_type === "MIETE_RUECKGABE") {
      stockByPair.set(key, current - anzahlFehlt)
    } else if (!stockByPair.has(key)) {
      stockByPair.set(key, current)
    }
  }

  const rentals = await sql`
    SELECT b.id, bi.group_id, bi.batch_id, b.datum_ausgabe, b.datum_rueckgabe_geplant, bi.anzahl
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE bi.group_id = ANY(${normalizedGroupIds})
      AND bi.batch_id = ANY(${batchIds})
      AND b.booking_type = 'MIETE_AUSGABE'
  `

  const rentalIds = rentals.map((row) => Number(row.id))
  const returnsByRental = new Set<number>()
  if (rentalIds.length > 0) {
    const returns = await sql`
      SELECT DISTINCT reference_rental_id
      FROM bookings
      WHERE booking_type = 'MIETE_RUECKGABE'
        AND reference_rental_id = ANY(${rentalIds})
    `
    for (const row of returns) {
      returnsByRental.add(row.reference_rental_id)
    }
  }

  const blockedByPair = new Map<string, number>()
  for (const rental of rentals) {
    if (returnsByRental.has(rental.id) || !rental.datum_ausgabe) continue
    const rentalStart = new Date(rental.datum_ausgabe)
    const rentalEnd = rental.datum_rueckgabe_geplant
      ? new Date(rental.datum_rueckgabe_geplant)
      : addDaysServer(rentalStart, 3)
    const rentalFrom = addWorkdaysServer(rentalStart, -departureBufferDays)
    const rentalTo = addDaysServer(rentalEnd, returnBufferDays)
    if (!rangesOverlap(newFrom, newTo, rentalFrom, rentalTo)) continue
    const key = `${rental.group_id}:${rental.batch_id}`
    blockedByPair.set(key, (blockedByPair.get(key) || 0) + (rental.anzahl || 0))
  }

  return pairs.map((pair) => {
    const groupId = Number(pair.group_id)
    const batchId = Number(pair.batch_id)
    const key = `${groupId}:${batchId}`
    const gesamtsumme = Math.max(0, stockByPair.get(key) || 0)
    const inVermietung = blockedByPair.get(key) || 0
    return {
      groupId,
      batchId,
      verfuegbar: Math.max(0, gesamtsumme - inVermietung),
      inVermietung,
      gesamtsumme,
    }
  })
}

// Shared helper to compute blocked rentals in a period
async function computeBlockedRentals(
  sql: ReturnType<typeof getDb>,
  rentals: Array<Record<string, any>>,
  newFrom: Date,
  newTo: Date,
  departureBufferDays: number,
  returnBufferDays: number,
  mode: "bands" | "bases" = "bands",
): Promise<{ blocked: number; returnsByRental: Map<number, boolean> }> {
  const rentalIds = rentals.map((r) => r.id as number)
  const returnsByRental = new Map<number, boolean>()

  if (rentalIds.length > 0) {
    const returns = await sql`
      SELECT DISTINCT reference_rental_id
      FROM bookings
      WHERE booking_type = 'MIETE_RUECKGABE' AND reference_rental_id = ANY(${rentalIds})
    `
    for (const r of returns) {
      returnsByRental.set(r.reference_rental_id, true)
    }
  }

  let blocked = 0
  for (const rental of rentals) {
    if (returnsByRental.has(rental.id)) continue
    if (!rental.datum_ausgabe) continue

    const rentalStart = new Date(rental.datum_ausgabe)
    const rentalEnd = rental.datum_rueckgabe_geplant
      ? new Date(rental.datum_rueckgabe_geplant)
      : addDaysServer(rentalStart, 3)

    const rentalFrom = addWorkdaysServer(rentalStart, -departureBufferDays)
    const rentalTo = addDaysServer(rentalEnd, returnBufferDays)

    if (rangesOverlap(newFrom, newTo, rentalFrom, rentalTo)) {
      const anzahl = mode === "bases"
        ? (rental.anzahl_basen != null ? rental.anzahl_basen : (rental.anzahl || 0))
        : (rental.anzahl || 0)
      blocked += anzahl
    }
  }

  return { blocked, returnsByRental }
}

export async function getAvailabilityForGroupByDateRange(
  groupId: number,
  batchId: number,
  ausgabedatum: Date,
  rueckgabedatum: Date,
) {
  const rows = await getAvailabilityForGroupBatchesByDateRange([groupId], ausgabedatum, rueckgabedatum)
  const row = rows.find((entry) => entry.groupId === groupId && entry.batchId === batchId)
  const totalStock = row?.gesamtsumme || 0
  const blockedInPeriod = row?.inVermietung || 0
  const verfuegbar = row?.verfuegbar || 0

  return {
    verfuegbar,
    inVermietung: blockedInPeriod,
    gesamtsumme: totalStock,
  }
}

export async function getBaseAvailabilityByDateRange(
  baseId: number,
  ausgabedatum: Date,
  rueckgabedatum: Date,
) {
  const sql = getDb()
  const { departureBufferDays, returnBufferDays } = await getBufferSettings()

  const newFrom = addWorkdaysServer(ausgabedatum, -departureBufferDays)
  const newTo = addDaysServer(rueckgabedatum, returnBufferDays)

  // Total stock for this base
  const stockItems = await sql`
    SELECT bi.anzahl_basen, bi.anzahl, bi.anzahl_fehlt, b.booking_type
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE bi.base_id = ${baseId}
  `

  const { totalStock: bookedStock } = computeStockFromItems((stockItems || []) as Parameters<typeof computeStockFromItems>[0], "bases")
  const totalStock = bookedStock > 0 ? bookedStock : 1

  // Get active rentals overlapping with our window
  const rentals = await sql`
    SELECT b.id, b.datum_ausgabe, b.datum_rueckgabe_geplant,
      bi.anzahl_basen, bi.anzahl
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE bi.base_id = ${baseId}
      AND b.booking_type = 'MIETE_AUSGABE'
  `

  const { blocked: blockedInPeriod } = await computeBlockedRentals(
    sql, rentals, newFrom, newTo, departureBufferDays, returnBufferDays, "bases",
  )

  const verfuegbar = Math.max(0, totalStock - blockedInPeriod)

  return {
    verfuegbar,
    inVermietung: blockedInPeriod,
    gesamtsumme: totalStock,
  }
}

export async function getBaseTotalStats() {
  const sql = getDb()

  const items = await sql`
    SELECT bi.anzahl_basen, bi.anzahl_fehlt, b.booking_type
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE bi.base_id IS NOT NULL AND bi.anzahl_basen > 0
  `

  let totalZugang = 0, totalVerkauft = 0, totalRented = 0, totalReturned = 0, totalDefekt = 0

  for (const item of items || []) {
    const anzahl = item.anzahl_basen || 0
    if (item.booking_type === "ZUGANG") totalZugang += anzahl
    else if (item.booking_type === "VERKAUF") totalVerkauft += anzahl
    else if (item.booking_type === "MIETE_AUSGABE") totalRented += anzahl
    else if (item.booking_type === "MIETE_RUECKGABE") {
      totalReturned += anzahl
      totalDefekt += item.anzahl_fehlt || 0
    }
  }

  const totalStock = totalZugang - totalVerkauft - totalDefekt
  const inVermietung = totalRented - (totalReturned + totalDefekt)
  const verfuegbar = totalStock - inVermietung

  return { totalStock, verfuegbar, inVermietung, verkauft: totalVerkauft, defekt: totalDefekt }
}

export async function getBaseStats() {
  await ensureAuthed()
  const sql = getDb()

  const bases = await sql`SELECT * FROM bases ORDER BY bezeichnung ASC`
  if (!bases || bases.length === 0) return []

  const items = await sql`
    SELECT bi.base_id, bi.anzahl_basen, bi.anzahl, bi.anzahl_fehlt, b.booking_type
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE bi.base_id IS NOT NULL
  `

  const itemsByBase = new Map<number, any[]>()
  for (const item of items || []) {
    if (!itemsByBase.has(item.base_id)) itemsByBase.set(item.base_id, [])
    itemsByBase.get(item.base_id)!.push(item)
  }

  return bases.map((base: any) => {
    const baseItems = itemsByBase.get(base.id) || []
    let totalZugang = 0, totalVerkauft = 0, totalRented = 0, totalReturned = 0, totalDefekt = 0

    for (const item of baseItems) {
      // Use anzahl_basen if set, fall back to anzahl (the amount stored in both columns)
      const anzahl = item.anzahl_basen != null ? item.anzahl_basen : (item.anzahl || 0)
      switch (item.booking_type) {
        case "ZUGANG": totalZugang += anzahl; break
        case "VERKAUF": totalVerkauft += anzahl; break
        case "MIETE_AUSGABE": totalRented += anzahl; break
        case "MIETE_RUECKGABE":
          totalReturned += anzahl
          totalDefekt += item.anzahl_fehlt || 0
          break
      }
    }

    const inVermietung = totalRented - (totalReturned + totalDefekt)
    const bookedStock = totalZugang - totalVerkauft - totalDefekt
    const gesamtsumme = bookedStock > 0 ? bookedStock : 1
    const verfuegbar = gesamtsumme - inVermietung

    return {
      baseId: base.id, bezeichnung: base.bezeichnung, hersteller: base.hersteller,
      verfuegbar, inVermietung, gesamtsumme, verkauft: totalVerkauft, defekt: totalDefekt,
    }
  })
}

export async function getOpenRentals() {
  await ensureAuthed()
  const sql = getDb()
  const rentals = await sql`
    SELECT b.id, c.name as customer_name, b.bemerkung, b.status,
      b.datum_ausgabe, b.datum_rueckgabe_geplant
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.booking_type = 'MIETE_AUSGABE'
      AND NOT EXISTS (
        SELECT 1 FROM bookings r
        WHERE r.booking_type = 'MIETE_RUECKGABE'
          AND r.reference_rental_id = b.id
      )
    ORDER BY b.datum_rueckgabe_geplant ASC NULLS LAST
  `
  return rentals.map((r: any) => ({
    id: r.id,
    customerName: r.customer_name,
    bemerkung: r.bemerkung,
    status: r.status,
    datumAusgabe: r.datum_ausgabe,
    datumRueckgabePlan: r.datum_rueckgabe_geplant,
  }))
}

export async function getInventoryLots(limit = 500): Promise<Array<Record<string, unknown> & { id: number }>> {
  await ensureAuthed()
  const sql = getDb()
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 2000)
  return (await sql`
    SELECT il.*, g.id as group_id_ref, g.name as group_name,
      ba.id as batch_id_ref, ba.code as batch_code, ba.funktionsumfang as batch_funktionsumfang,
      ba.lieferdatum as batch_lieferdatum
    FROM inventory_lots il
    LEFT JOIN skus s ON s.id = il.sku_id
    LEFT JOIN groups g ON g.id = s.group_id
    LEFT JOIN batches ba ON ba.id = il.batch_id
    ORDER BY il.created_at DESC
    LIMIT ${safeLimit}
  `) as Array<Record<string, unknown> & { id: number }>
}

export async function getRentedItemsByGroup(batchId?: number) {
  const sql = getDb()

  let items
  if (batchId) {
    items = await sql`
      SELECT bi.group_id, bi.anzahl, bi.anzahl_fehlt, b.booking_type
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
      WHERE bi.batch_id = ${batchId}
    `
  } else {
    items = await sql`
      SELECT bi.group_id, bi.anzahl, bi.anzahl_fehlt, b.booking_type
      FROM booking_items bi
      JOIN bookings b ON b.id = bi.booking_id
    `
  }

  const rentedByGroup = new Map<number, number>()
  for (const item of items || []) {
    const groupId = item.group_id
    const anzahl = item.anzahl || 0
    const anzahlFehlt = item.anzahl_fehlt || 0
    if (item.booking_type === "MIETE_AUSGABE") {
      rentedByGroup.set(groupId, (rentedByGroup.get(groupId) || 0) + anzahl)
    } else if (item.booking_type === "MIETE_RUECKGABE") {
      rentedByGroup.set(groupId, Math.max(0, (rentedByGroup.get(groupId) || 0) - anzahl - anzahlFehlt))
    }
  }
  return rentedByGroup
}

export async function getTotalStats() {
  const sql = getDb()

  const items = await sql`
    SELECT bi.anzahl, bi.anzahl_fehlt, b.booking_type
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
  `

  if (!items || items.length === 0) {
    return { totalStock: 0, verfuegbar: 0, verkauft: 0, inVermietung: 0, totalDefekt: 0, vermietungsquote: 0 }
  }

  let totalZugang = 0, totalVerkauft = 0, totalRented = 0, totalReturned = 0, totalDefekt = 0

  for (const item of items) {
    const anzahl = item.anzahl || 0
    if (item.booking_type === "ZUGANG") totalZugang += anzahl
    else if (item.booking_type === "VERKAUF") totalVerkauft += anzahl
    else if (item.booking_type === "MIETE_AUSGABE") totalRented += anzahl
    else if (item.booking_type === "MIETE_RUECKGABE") {
      totalReturned += anzahl
      totalDefekt += item.anzahl_fehlt || 0
    }
  }

  const totalStock = totalZugang - totalVerkauft - totalDefekt
  const inVermietung = totalRented - (totalReturned + totalDefekt)
  const verfuegbar = totalStock - inVermietung
  const vermietungsquote = totalStock > 0 ? (inVermietung / totalStock) * 100 : 0

  return { totalStock, verfuegbar, verkauft: totalVerkauft, inVermietung, totalDefekt, vermietungsquote }
}

export async function exportBookingsToCSV() {
  const bookings = await getBookings()

  if (!bookings || bookings.length === 0) return ""

  const headers = ["Datum", "Buchungstyp", "Kunde", "Leuchtgruppe", "Charge", "Anzahl Baender", "Basis", "Anzahl Basen", "Defekt/Verloren", "Bemerkung"]
  const rows: string[][] = [headers]

  for (const booking of bookings) {
    const datum = new Date(booking.created_at).toLocaleDateString("de-DE")
    const buchungstyp = booking.booking_type
    const kunde = (booking as any).customer?.name || "-"
    const bemerkung = booking.bemerkung || "-"
    const items = (booking as any).items || []

    if (items.length === 0) {
      rows.push([datum, buchungstyp, kunde, "-", "-", "0", "-", "0", "0", bemerkung])
    } else {
      for (const item of items) {
        rows.push([datum, buchungstyp, kunde, item.group?.name || "-", item.batch?.code || "-", (item.anzahl || 0).toString(), item.base?.bezeichnung || "-", (item.anzahl_basen || 0).toString(), (item.anzahl_fehlt || 0).toString(), bemerkung])
      }
    }
  }

  const csvContent = rows.map((row) =>
    row.map((cell) => {
      const cellStr = cell.toString()
      if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(",")
  ).join("\n")

  return "\uFEFF" + csvContent
}

export async function getCalendarData() {
  await ensureAuthed()
  const sql = getDb()

  // Get all MIETE_AUSGABE bookings with their items
  const rentals = await sql`
    SELECT b.id, b.booking_type, b.status, b.datum_ausgabe, b.datum_rueckgabe_geplant, b.datum_rueckgabe_ist,
      b.reference_rental_id, b.bemerkung,
      c.name as customer_name
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.booking_type = 'MIETE_AUSGABE'
    ORDER BY b.datum_ausgabe ASC
  `

  // Get return bookings to know which rentals are actually returned
  const returns = await sql`
    SELECT b.id, b.reference_rental_id, b.datum_rueckgabe_ist, b.created_at,
      bi.group_id, bi.anzahl, bi.anzahl_fehlt, bi.base_id, bi.anzahl_basen
    FROM bookings b
    JOIN booking_items bi ON bi.booking_id = b.id
    WHERE b.booking_type = 'MIETE_RUECKGABE' AND b.reference_rental_id IS NOT NULL
  `

  // Build a map of returned amounts per rental
  const returnsByRental = new Map<number, { returnedAt: Date | null; bandItems: any[]; baseItems: any[] }>()
  for (const r of returns) {
    if (!returnsByRental.has(r.reference_rental_id)) {
      returnsByRental.set(r.reference_rental_id, { returnedAt: r.datum_rueckgabe_ist || r.created_at, bandItems: [], baseItems: [] })
    }
    const entry = returnsByRental.get(r.reference_rental_id)!
    if (r.group_id) entry.bandItems.push(r)
    if (r.base_id) entry.baseItems.push(r)
  }

  // Get rental items (bands and bases)
  const rentalItems = await sql`
    SELECT bi.booking_id, bi.group_id, bi.anzahl, bi.anzahl_fehlt, bi.base_id, bi.anzahl_basen,
      g.name as group_name,
      bs.bezeichnung as base_bezeichnung
    FROM booking_items bi
    LEFT JOIN groups g ON g.id = bi.group_id
    LEFT JOIN bases bs ON bs.id = bi.base_id
    WHERE bi.booking_id IN (
      SELECT id FROM bookings WHERE booking_type = 'MIETE_AUSGABE'
    )
  `

  const itemsByRental = new Map<number, any[]>()
  for (const item of rentalItems) {
    if (!itemsByRental.has(item.booking_id)) itemsByRental.set(item.booking_id, [])
    itemsByRental.get(item.booking_id)!.push(item)
  }

  // Total stock (LED bands per group, bases per base)
  const bandStock = await sql`
    SELECT bi.group_id, g.name as group_name,
      SUM(CASE WHEN b.booking_type = 'ZUGANG' THEN bi.anzahl ELSE 0 END) as total_zugang,
      SUM(CASE WHEN b.booking_type = 'VERKAUF' THEN bi.anzahl ELSE 0 END) as total_verkauft,
      SUM(CASE WHEN b.booking_type = 'MIETE_RUECKGABE' THEN bi.anzahl_fehlt ELSE 0 END) as total_defekt
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    JOIN groups g ON g.id = bi.group_id
    WHERE bi.group_id IS NOT NULL
    GROUP BY bi.group_id, g.name
    ORDER BY g.name ASC
  `

  const baseStock = await sql`
    SELECT bi.base_id, bs.bezeichnung as base_bezeichnung,
      SUM(CASE WHEN b.booking_type = 'ZUGANG' THEN bi.anzahl_basen ELSE 0 END) as total_zugang,
      SUM(CASE WHEN b.booking_type = 'VERKAUF' THEN bi.anzahl_basen ELSE 0 END) as total_verkauft,
      SUM(CASE WHEN b.booking_type = 'MIETE_RUECKGABE' THEN bi.anzahl_fehlt ELSE 0 END) as total_defekt
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    JOIN bases bs ON bs.id = bi.base_id
    WHERE bi.base_id IS NOT NULL AND bi.anzahl_basen > 0
    GROUP BY bi.base_id, bs.bezeichnung
    ORDER BY bs.bezeichnung ASC
  `

  const rentalEvents = rentals.map((rental: any) => {
    const items = itemsByRental.get(rental.id) || []
    const returnInfo = returnsByRental.get(rental.id)
    const isReturned = !!returnInfo

    const bands = items.filter((i: any) => i.group_id).map((i: any) => ({
      groupId: i.group_id,
      groupName: i.group_name,
      anzahl: i.anzahl || 0,
    }))

    const bases = items.filter((i: any) => i.base_id).map((i: any) => ({
      baseId: i.base_id,
      baseBezeichnung: i.base_bezeichnung,
      anzahl: i.anzahl_basen || 0,
    }))

    return {
      id: rental.id,
      customerName: rental.customer_name || "Unbekannt",
      bemerkung: rental.bemerkung,
      status: rental.status || "BESTAETIGT",
      datumAusgabe: rental.datum_ausgabe,
      datumRueckgabePlan: rental.datum_rueckgabe_geplant,
      datumRueckgabeIst: returnInfo?.returnedAt || null,
      isReturned,
      bands,
      bases,
    }
  })

  return {
    rentalEvents,
    bandStock: bandStock.map((s: any) => ({
      groupId: s.group_id,
      groupName: s.group_name,
      totalStock: Math.max(0, (s.total_zugang || 0) - (s.total_verkauft || 0) - (s.total_defekt || 0)),
    })),
    baseStock: baseStock.map((s: any) => ({
      baseId: s.base_id,
      baseBezeichnung: s.base_bezeichnung,
      totalStock: Math.max(0, (s.total_zugang || 0) - (s.total_verkauft || 0) - (s.total_defekt || 0)),
    })),
  }
}

export async function getBookingById(bookingId: number): Promise<BookingWithRelations | null> {
  await ensureAuthed()
  const sql = getDb()

  const bookings = await sql`
    SELECT b.*, c.id as customer_id_ref, c.name as customer_name
    FROM bookings b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.id = ${bookingId}
  `

  if (bookings.length === 0) return null

  const items = await sql`
    SELECT bi.*, g.id as group_id_ref, g.name as group_name,
      ba.id as batch_id_ref, ba.code as batch_code, ba.funktionsumfang as batch_funktionsumfang,
      ba.lieferant as batch_lieferant, ba.lieferdatum as batch_lieferdatum,
      bases.id as base_id_ref, bases.bezeichnung as base_bezeichnung, bases.hersteller as base_hersteller,
      bases.kanalanzahl as base_kanalanzahl
    FROM booking_items bi
    LEFT JOIN groups g ON g.id = bi.group_id
    LEFT JOIN batches ba ON ba.id = bi.batch_id
    LEFT JOIN bases ON bases.id = bi.base_id
    WHERE bi.booking_id = ${bookingId}
  `

  const booking = bookings[0]
  return {
    ...booking,
    customer: booking.customer_name ? { id: booking.customer_id_ref, name: booking.customer_name } : null,
    items: items.map((item: any) => ({
      id: item.id, group_id: item.group_id, anzahl: item.anzahl, anzahl_fehlt: item.anzahl_fehlt,
      anzahl_basen: item.anzahl_basen, batch_id: item.batch_id, base_id: item.base_id,
      group: item.group_id_ref ? { id: item.group_id_ref, name: item.group_name } : null,
      batch: item.batch_id_ref ? { id: item.batch_id_ref, code: item.batch_code, funktionsumfang: item.batch_funktionsumfang, lieferant: item.batch_lieferant, lieferdatum: item.batch_lieferdatum } : null,
      base: item.base_id_ref ? { id: item.base_id_ref, bezeichnung: item.base_bezeichnung, hersteller: item.base_hersteller, kanalanzahl: item.base_kanalanzahl } : null,
    })),
  } as BookingWithRelations
}

export async function getRemainingRentalAmounts(rentalBookingId: number) {
  const sql = getDb()

  const rentalItems = await sql`SELECT group_id, anzahl FROM booking_items WHERE booking_id = ${rentalBookingId}`
  if (!rentalItems || rentalItems.length === 0) return new Map<number, number>()

  const returns = await sql`
    SELECT bi.group_id, bi.anzahl, bi.anzahl_fehlt
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE b.reference_rental_id = ${rentalBookingId} AND b.booking_type = 'MIETE_RUECKGABE'
  `

  const remainingByGroup = new Map<number, number>()
  for (const item of rentalItems) {
    remainingByGroup.set(item.group_id, item.anzahl || 0)
  }

  for (const item of returns || []) {
    const returned = (item.anzahl || 0) + (item.anzahl_fehlt || 0)
    const current = remainingByGroup.get(item.group_id) || 0
    remainingByGroup.set(item.group_id, Math.max(0, current - returned))
  }

  return remainingByGroup
}
