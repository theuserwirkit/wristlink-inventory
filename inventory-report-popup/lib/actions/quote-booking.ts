"use server"

import { getDb } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import {
  createQuoteHoldBooking,
  finalizeQuoteBookingOnPayment,
  linkQuoteToBooking,
  revalidateBookingPaths,
} from "@/lib/actions/quote-booking-internal"

// Client-erreichbar (u.a. components/admin/quote-warehouse-panel.tsx) → Admin-Auth erforderlich.
// Die eigentliche, nicht-Session-gebundene Buchungslogik lebt in
// lib/actions/quote-booking-internal.ts und wird u.a. vom öffentlichen Angebots-Flow
// (Anfrage anlegen) sowie vom Stripe-Webhook (Zahlungseingang) direkt genutzt.
export async function ensureQuoteBooking(
  quoteId: number,
): Promise<{ success: boolean; error?: string; bookingId?: number }> {
  await requireRole(["ADMIN"])

  const { getQuoteByIdInternal } = await import("@/lib/quotes-internal")
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return { success: false, error: "Anfrage nicht gefunden" }

  if (quote.booking_id) {
    return { success: true, bookingId: quote.booking_id }
  }

  const sql = getDb()
  const leadRows = await sql`
    SELECT email, name, firma FROM leads WHERE id = ${quote.lead_id} LIMIT 1
  `
  const lead = leadRows[0] as
    | { email: string; name: string | null; firma: string | null }
    | undefined

  const creatableStatuses = ["paid", "approved", "payment_pending", "submitted"]
  if (!creatableStatuses.includes(quote.status)) {
    return {
      success: false,
      error: `Buchung kann bei Status „${quote.status}“ nicht angelegt werden`,
    }
  }

  if (quote.status === "paid") {
    return finalizeQuoteBookingOnPayment(quoteId, quote, {
      leadEmail: lead?.email,
      leadName: lead?.name,
      leadFirma: lead?.firma,
    })
  }

  if (quote.config_json.modus === "miete" && quote.config_json.von) {
    const hold = await createQuoteHoldBooking(quoteId, quote.config_json, lead?.email)
    if (!hold.success) {
      return { success: false, error: hold.error || "Reservierung fehlgeschlagen" }
    }
    if (hold.bookingId) {
      await linkQuoteToBooking(quoteId, hold.bookingId)
    }
    revalidateBookingPaths()
    return { success: true, bookingId: hold.bookingId }
  }

  return {
    success: false,
    error: "Für Kauf-Anfragen wird die Buchung erst bei Zahlung angelegt",
  }
}
