import { NextRequest } from "next/server"
import { getQuoteOfferPdf } from "@/lib/actions/quote-offer-pdf"
import { getUser, canAdmin } from "@/lib/auth"
import { sanitizeFilename } from "@/lib/utils/sanitize-filename"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const quoteId = Number(id)
  if (!Number.isFinite(quoteId)) {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const user = await getUser()
  if (!user) {
    return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
  }
  if (!(await canAdmin(user))) {
    return Response.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  try {
    const pdf = await getQuoteOfferPdf(quoteId)
    if (!pdf) {
      return Response.json({ error: "Kein PDF vorhanden" }, { status: 404 })
    }

    return new Response(new Uint8Array(pdf.data), {
      headers: {
        "Content-Type": pdf.mimeType,
        "Content-Disposition": `inline; filename="${sanitizeFilename(pdf.filename, "angebot.pdf")}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("offer-pdf route failed:", error)
    return Response.json({ error: "PDF konnte nicht geladen werden" }, { status: 500 })
  }
}
