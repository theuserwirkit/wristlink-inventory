import { getDb } from "@/lib/db"
import { createN8nBooking } from "@/lib/actions/n8n-api"
import { createBookingInternal, getAvailabilityForGroupInternal } from "@/lib/actions/bookings"
import { getFulfillmentDueDate } from "@/lib/konfigurator/fulfillment-timing"
import { normalizeKanalanzahl } from "@/lib/konfigurator/kanalanzahl"
import {
  isWristlinkProdukt,
  resolveGroupsForProduct,
  type WristlinkProdukt,
} from "@/lib/product-mapping"
import { revalidatePath } from "next/cache"
import type { QuoteConfig, QuoteRequest } from "@/lib/konfigurator/types"

const BOOKING_REVALIDATE_PATHS = [
  "/warenverwaltung",
  "/warenverwaltung/buchungen",
  "/warenverwaltung/auftraege",
  "/kalender",
] as const

function revalidateBookingPaths() {
  revalidatePath("/")
  for (const path of BOOKING_REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

async function linkQuoteToBooking(quoteId: number, bookingId: number): Promise<void> {
  const sql = getDb()
  await sql`
    UPDATE quote_requests SET booking_id = ${bookingId}, updated_at = NOW()
    WHERE id = ${quoteId}
  `
}

async function findBestSaleAllocation(
  produkt: WristlinkProdukt,
  menge: number,
  kanalanzahl?: number,
): Promise<{ groupId: number; batchId: number } | null> {
  const groups = await resolveGroupsForProduct(produkt, kanalanzahl)
  if (groups.length === 0) return null

  const sql = getDb()
  let best: { groupId: number; batchId: number; verfuegbar: number } | null = null

  for (const group of groups) {
    const batches = await sql`
      SELECT DISTINCT batch_id
      FROM (
        SELECT bi.batch_id
        FROM booking_items bi
        WHERE bi.group_id = ${group.id} AND bi.batch_id IS NOT NULL
        UNION
        SELECT il.batch_id
        FROM inventory_lots il
        JOIN skus s ON s.id = il.sku_id
        WHERE s.group_id = ${group.id} AND il.batch_id IS NOT NULL
      ) AS batches
    `

    for (const row of batches) {
      const batchId = Number(row.batch_id)
      if (!Number.isFinite(batchId)) continue

      const availability = await getAvailabilityForGroupInternal(group.id, batchId)
      if (
        availability.verfuegbar >= menge &&
        (!best || availability.verfuegbar > best.verfuegbar)
      ) {
        best = { groupId: group.id, batchId, verfuegbar: availability.verfuegbar }
      }
    }
  }

  return best ? { groupId: best.groupId, batchId: best.batchId } : null
}

export async function createQuoteHoldBooking(
  quoteId: number,
  config: QuoteConfig,
  email?: string,
): Promise<{ success: boolean; bookingId?: number; error?: string }> {
  if (config.modus !== "miete" || !config.von) {
    return { success: true }
  }

  const result = await createN8nBooking({
    produkt: config.produkt,
    modus: config.modus,
    menge: config.menge,
    von: config.von,
    bis: config.bis || config.von,
    kunde_email: email,
    event: `Anfrage #${quoteId}`,
    status: "ANFRAGE",
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const bookingId = (result as { data?: { id: number } }).data?.id
  if (!bookingId) {
    return { success: false, error: "Buchung konnte nicht angelegt werden" }
  }

  revalidateBookingPaths()
  return { success: true, bookingId }
}

export async function confirmQuoteBooking(bookingId: number): Promise<void> {
  const sql = getDb()
  await sql`UPDATE bookings SET status = 'BESTAETIGT' WHERE id = ${bookingId}`
  revalidateBookingPaths()
}

export async function releaseQuoteBooking(bookingId: number | null | undefined): Promise<void> {
  if (!bookingId) return
  const sql = getDb()
  await sql`DELETE FROM bookings WHERE id = ${bookingId}`
  revalidateBookingPaths()
}

export async function finalizeQuoteBookingOnPayment(
  quoteId: number,
  quote: Pick<QuoteRequest, "booking_id" | "config_json" | "paid_at" | "submitted_at" | "fulfillment_status">,
  options?: {
    leadEmail?: string
    leadName?: string | null
    leadFirma?: string | null
  },
): Promise<{ success: boolean; bookingId?: number; error?: string }> {
  const config = quote.config_json
  let bookingId: number | undefined

  if (config.modus === "miete" && config.von) {
    if (quote.booking_id) {
      await confirmQuoteBooking(quote.booking_id)
      bookingId = quote.booking_id
    } else {
      const result = await createN8nBooking({
        produkt: config.produkt,
        modus: config.modus,
        menge: config.menge,
        von: config.von,
        bis: config.bis || config.von,
        kunde_email: options?.leadEmail,
        event: `Anfrage #${quoteId}`,
        status: "BESTAETIGT",
      })

      if (!result.success) {
        return { success: false, error: result.error || "Mietbuchung fehlgeschlagen" }
      }

      const newBookingId = (result as { data?: { id: number } }).data?.id
      if (!newBookingId) {
        return { success: false, error: "Mietbuchung konnte nicht angelegt werden" }
      }

      bookingId = newBookingId
      await linkQuoteToBooking(quoteId, newBookingId)
    }
  } else if (config.modus === "kauf") {
    const produkt = String(config.produkt || "").toLowerCase()
    if (!isWristlinkProdukt(produkt)) {
      return { success: false, error: `Unbekanntes Produkt: ${config.produkt}` }
    }

    const kanalanzahl =
      produkt === "armband" ? normalizeKanalanzahl(config.kanalanzahl) : undefined
    const allocation = await findBestSaleAllocation(produkt, config.menge, kanalanzahl)

    if (!allocation) {
      return { success: false, error: "Keine verfügbare Charge für Verkaufsbuchung gefunden" }
    }

    const dueDate = getFulfillmentDueDate(quote)
    const datumAusgabe = dueDate || (quote.paid_at ? new Date(quote.paid_at) : new Date())
    const customerName =
      config.kontaktFirma ||
      config.kontaktName ||
      options?.leadFirma ||
      options?.leadName ||
      options?.leadEmail

    const result = await createBookingInternal({
      bookingType: "VERKAUF",
      status: "BESTAETIGT",
      customerName: customerName || undefined,
      datumAusgabe,
      bemerkung: `Anfrage #${quoteId}`,
      items: [{
        groupId: allocation.groupId,
        batchId: allocation.batchId,
        anzahl: config.menge,
      }],
    })

    if (!result.success) {
      return { success: false, error: result.error || "Verkaufsbuchung fehlgeschlagen" }
    }

    const newBookingId = (result as { data?: { id: number } }).data?.id
    if (!newBookingId) {
      return { success: false, error: "Verkaufsbuchung konnte nicht angelegt werden" }
    }

    bookingId = newBookingId
    await linkQuoteToBooking(quoteId, newBookingId)
  }

  revalidateBookingPaths()
  return { success: true, bookingId }
}
