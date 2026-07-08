import { berechneFahrKm } from "@/lib/konfigurator/distance"
import { checkDistanceRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const rateLimit = await checkDistanceRateLimit(getClientIp(request))
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  let body: { adresse?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  const adresse = body.adresse?.trim()
  if (!adresse) {
    return Response.json({ error: "Adresse erforderlich" }, { status: 400 })
  }

  try {
    const result = await berechneFahrKm(adresse)
    if (!result) {
      return Response.json({ error: "Adresse konnte nicht gefunden werden" }, { status: 404 })
    }
    return Response.json(result)
  } catch {
    return Response.json({ error: "Entfernungsberechnung fehlgeschlagen" }, { status: 502 })
  }
}
