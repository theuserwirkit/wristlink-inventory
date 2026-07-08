import { getDb } from "@/lib/db"
import { createN8nBooking } from "@/lib/actions/n8n-api"
import { revalidatePath } from "next/cache"
import type { QuoteConfig } from "@/lib/konfigurator/types"

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

  revalidatePath("/")
  revalidatePath("/kalender")
  return { success: true, bookingId }
}

export async function confirmQuoteBooking(bookingId: number): Promise<void> {
  const sql = getDb()
  await sql`UPDATE bookings SET status = 'BESTAETIGT' WHERE id = ${bookingId}`
  revalidatePath("/")
  revalidatePath("/kalender")
}

export async function releaseQuoteBooking(bookingId: number | null | undefined): Promise<void> {
  if (!bookingId) return
  const sql = getDb()
  await sql`DELETE FROM bookings WHERE id = ${bookingId}`
  revalidatePath("/")
  revalidatePath("/kalender")
}
