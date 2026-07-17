"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { getQuoteByIdInternal } from "@/lib/quotes-internal"
import { isSevdeskConfigured } from "@/lib/konfigurator/sevdesk"
import { createSevdeskOfferForQuote } from "@/lib/konfigurator/sevdesk-offer"

async function saveSevdeskOfferToQuote(
  quoteId: number,
  offer: Awaited<ReturnType<typeof createSevdeskOfferForQuote>>,
): Promise<void> {
  const sql = getDb()
  await sql`
    UPDATE quote_requests SET
      sevdesk_order_id = ${offer.orderId},
      sevdesk_order_number = ${offer.orderNumber},
      offer_pdf_filename = ${offer.pdfFilename},
      offer_pdf_data = ${offer.pdfBuffer},
      offer_pdf_mime_type = 'application/pdf',
      updated_at = NOW()
    WHERE id = ${quoteId}
  `
}

async function buildSevdeskOfferForQuoteId(
  quoteId: number,
  options?: { allowExisting?: boolean },
): Promise<
  | { success: true; orderNumber: string }
  | { success: false; error: string }
> {
  await requireRole(["ADMIN"])

  if (!isSevdeskConfigured()) {
    return { success: false, error: "SEVDESK_API_TOKEN nicht gesetzt" }
  }

  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return { success: false, error: "Anfrage nicht gefunden" }

  if (quote.sevdesk_order_id && !options?.allowExisting) {
    return {
      success: false,
      error: `Angebot existiert bereits (${quote.sevdesk_order_number || quote.sevdesk_order_id})`,
    }
  }

  try {
    const offer = await createSevdeskOfferForQuote(quote)
    await saveSevdeskOfferToQuote(quoteId, offer)
    revalidatePath(`/warenverwaltung/auftraege/${quoteId}`)
    return { success: true, orderNumber: offer.orderNumber }
  } catch (error) {
    const message = error instanceof Error ? error.message : "sevDesk Fehler"
    return { success: false, error: message }
  }
}

export async function createQuoteSevdeskOffer(
  quoteId: number,
): Promise<{ success: boolean; error?: string; orderNumber?: string }> {
  return buildSevdeskOfferForQuoteId(quoteId)
}

export async function recreateQuoteSevdeskOffer(
  quoteId: number,
): Promise<{ success: boolean; error?: string; orderNumber?: string }> {
  return buildSevdeskOfferForQuoteId(quoteId, { allowExisting: true })
}
