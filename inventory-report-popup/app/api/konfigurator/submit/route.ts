import { NextRequest } from "next/server"
import { z } from "zod"
import { submitQuoteRequest } from "@/lib/actions/quotes"
import type { QuoteConfig } from "@/lib/konfigurator/types"
import { resolveKanalanzahlForConfig } from "@/lib/konfigurator/resolve-kanalanzahl"
import { checkSubmitRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"
import { quoteConfigSchema, formatZodError } from "@/lib/api-schemas"

const submitBodySchema = z.object({ config: quoteConfigSchema })

export async function POST(request: NextRequest) {
  const rateLimit = await checkSubmitRateLimit(getClientIp(request))
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  const parsed = submitBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      { error: `Ungültige Konfiguration: ${formatZodError(parsed.error)}` },
      { status: 400 },
    )
  }

  const rawConfig = parsed.data.config as QuoteConfig

  const kanalanzahlSchonGesetzt =
    rawConfig.kanalanzahl === 40 || rawConfig.kanalanzahl === 80
  const kanalanzahl =
    rawConfig.produkt === "armband"
      ? kanalanzahlSchonGesetzt
        ? rawConfig.kanalanzahl
        : await resolveKanalanzahlForConfig(rawConfig)
      : undefined
  const config: QuoteConfig =
    kanalanzahl != null ? { ...rawConfig, kanalanzahl } : rawConfig

  const result = await submitQuoteRequest(config, { skipAvailabilityCheck: true })
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  return Response.json({ success: true, publicToken: result.publicToken })
}
