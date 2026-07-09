import { getKonfiguratorLogoById, getKonfiguratorLogoForLead } from "@/lib/actions/konfigurator-logos"
import { getVerifiedLead } from "@/lib/actions/leads"
import { requireRole } from "@/lib/auth"

/** Erlaubt nur alphanumerische Zeichen, Punkt und Bindestrich – verhindert Header-/Pfad-Injection. */
function sanitizeFilename(filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9.\-]/g, "_")
  return sanitized || "logo"
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const download = new URL(request.url).searchParams.get("download") === "1"

  const lead = await getVerifiedLead()
  let logo = lead ? await getKonfiguratorLogoForLead(id) : null

  if (!logo) {
    try {
      await requireRole(["ADMIN"])
      logo = await getKonfiguratorLogoById(id)
    } catch {
      return new Response("Nicht gefunden", { status: 404 })
    }
  }

  if (!logo) {
    return new Response("Nicht gefunden", { status: 404 })
  }

  const disposition = download ? "attachment" : "inline"

  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.mimeType,
      "Content-Disposition": `${disposition}; filename="${sanitizeFilename(logo.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
