import { NextRequest } from "next/server"
import { unauthorizedResponse, verifyApiKey } from "@/lib/api-auth"
import { getQuoteByIdInternal, rejectQuoteRequest } from "@/lib/quotes-internal"
import type { RejectionReasonId } from "@/lib/konfigurator/rejection-reasons"

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

  let body: { reason_id?: RejectionReasonId } = {}
  try {
    body = await request.json()
  } catch {
    // leerer Body ist ok
  }

  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) {
    return Response.json({ error: "Anfrage nicht gefunden" }, { status: 404 })
  }

  const result = await rejectQuoteRequest(quoteId, body.reason_id || "nicht_lieferbar")
  if (!result.success) {
    return Response.json(result, { status: 422 })
  }

  return Response.json({ success: true, quoteId, status: "rejected" })
}
