import { NextRequest } from "next/server"
import { unauthorizedResponse, verifyApiKey } from "@/lib/api-auth"
import { approveQuoteRequest, getQuoteByIdInternal } from "@/lib/quotes-internal"

export const dynamic = "force-dynamic"

export async function POST(
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

  const result = await approveQuoteRequest(quoteId)
  if (!result.success) {
    return Response.json(result, { status: 422 })
  }

  const updated = await getQuoteByIdInternal(quoteId)
  return Response.json({
    success: true,
    quoteId,
    status: updated?.status,
    booking_id: updated?.booking_id,
  })
}
