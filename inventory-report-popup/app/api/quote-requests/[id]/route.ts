import { NextRequest } from "next/server"
import { unauthorizedResponse, verifyApiKey } from "@/lib/api-auth"
import { getQuoteByIdInternal } from "@/lib/quotes-internal"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyApiKey(request)) return unauthorizedResponse()

  const { id } = await params
  const quoteId = Number(id)
  if (!Number.isFinite(quoteId)) {
    return Response.json({ error: "Ungültige ID" }, { status: 400 })
  }

  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) {
    return Response.json({ error: "Anfrage nicht gefunden" }, { status: 404 })
  }

  return Response.json({
    id: quote.id,
    status: quote.status,
    source: quote.source,
    booking_id: quote.booking_id,
    lead_email: quote.lead_email,
    external_ref: quote.external_ref,
    submitted_at: quote.submitted_at,
    approved_at: quote.approved_at,
    paid_at: quote.paid_at,
    cancelled_at: quote.cancelled_at,
    expires_at: quote.expires_at,
    config: quote.config_json,
    price_snapshot: quote.price_snapshot_json,
    notes: quote.notes,
  })
}
