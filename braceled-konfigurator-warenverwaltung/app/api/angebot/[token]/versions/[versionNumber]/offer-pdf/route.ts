import { NextRequest } from "next/server"
import { hasAngebotAccess } from "@/lib/konfigurator/angebot-access"
import { getVersionOfferPdfByPublicToken } from "@/lib/konfigurator/quote-versions"
import { sanitizeFilename } from "@/lib/utils/sanitize-filename"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; versionNumber: string }> },
) {
  const { token, versionNumber: versionRaw } = await params
  const versionNumber = Number(versionRaw)
  if (!Number.isFinite(versionNumber) || versionNumber < 1) {
    return Response.json({ error: "Ungültige Version" }, { status: 400 })
  }
  if (!(await hasAngebotAccess(token))) {
    return Response.json({ error: "Zugang erforderlich" }, { status: 401 })
  }
  try {
    const pdf = await getVersionOfferPdfByPublicToken(token, versionNumber)
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
    console.error("public version offer-pdf failed:", error)
    return Response.json({ error: "PDF konnte nicht geladen werden" }, { status: 500 })
  }
}
