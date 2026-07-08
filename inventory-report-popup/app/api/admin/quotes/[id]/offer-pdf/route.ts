import { NextRequest } from "next/server"
import { getQuoteOfferPdf } from "@/lib/actions/quote-offer-pdf"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const quoteId = Number(id)
  if (!Number.isFinite(quoteId)) {
    return new Response("Ungültige Anfrage", { status: 400 })
  }

  const pdf = await getQuoteOfferPdf(quoteId)
  if (!pdf) {
    return new Response("Kein PDF vorhanden", { status: 404 })
  }

  return new Response(new Uint8Array(pdf.data), {
    headers: {
      "Content-Type": pdf.mimeType,
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
