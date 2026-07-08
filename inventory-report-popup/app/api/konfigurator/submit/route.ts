import { NextRequest } from "next/server"
import { submitQuoteRequest } from "@/lib/actions/quotes"
import type { QuoteConfig } from "@/lib/konfigurator/types"
import { resolveKanalanzahlForConfig } from "@/lib/konfigurator/resolve-kanalanzahl"
import { checkSubmitRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const rateLimit = await checkSubmitRateLimit(getClientIp(request))
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  let body: { config?: QuoteConfig }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  if (!body.config) {
    return Response.json({ error: "Konfiguration fehlt" }, { status: 400 })
  }

  const kanalanzahlSchonGesetzt =
    body.config.kanalanzahl === 40 || body.config.kanalanzahl === 80
  const kanalanzahl =
    body.config.produkt === "armband"
      ? kanalanzahlSchonGesetzt
        ? body.config.kanalanzahl
        : await resolveKanalanzahlForConfig(body.config)
      : undefined
  const config: QuoteConfig =
    kanalanzahl != null ? { ...body.config, kanalanzahl } : body.config

  const result = await submitQuoteRequest(config, { skipAvailabilityCheck: true })
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  return Response.json({ success: true, publicToken: result.publicToken })
}
