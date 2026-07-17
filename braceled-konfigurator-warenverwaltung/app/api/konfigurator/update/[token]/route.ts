import { NextRequest } from "next/server"
import { z } from "zod"
import { checkProductAvailability } from "@/lib/actions/n8n-api"
import { updateQuoteByPublicToken } from "@/lib/quotes-internal"
import { getQuoteByPublicToken } from "@/lib/actions/quotes"
import { hasAngebotAccess } from "@/lib/konfigurator/angebot-access"
import { canCustomerEditQuoteStatus } from "@/lib/konfigurator/quote-status"
import { mergeCustomerEditConfig } from "@/lib/konfigurator/quote-customer-edit"
import type { AvailabilityStressLevel } from "@/lib/konfigurator/availability-stress"
import type { QuoteConfig } from "@/lib/konfigurator/types"
import { resolveKanalanzahlForConfig } from "@/lib/konfigurator/resolve-kanalanzahl"
import { checkSubmitRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"
import { quoteConfigSchema, formatZodError } from "@/lib/api-schemas"

const updateBodySchema = z.object({ config: quoteConfigSchema })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const rateLimit = await checkSubmitRateLimit(getClientIp(request))
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const allowed = await hasAngebotAccess(token)
  if (!allowed) {
    return Response.json({ error: "Zugang erforderlich" }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  const parsed = updateBodySchema.safeParse(rawBody)
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

  const quote = await getQuoteByPublicToken(token)
  if (!quote) {
    return Response.json({ error: "Anfrage nicht gefunden" }, { status: 404 })
  }
  if (!canCustomerEditQuoteStatus(quote.status)) {
    return Response.json(
      { error: "Änderung in diesem Status nicht möglich" },
      { status: 409 },
    )
  }

  // Ampel muss auf dem server-gemergten Config berechnet werden: von/bis/produkt/modus/
  // kanalanzahl sind Locked-Felder und dürfen nicht aus dem (potenziell manipulierten)
  // Client-Body kommen (Spec: Verfügbarkeitsprüfung darf nicht auf ungeprüften Werten laufen).
  const merged = mergeCustomerEditConfig(quote.config_json, config)

  // Availability-Ampel darf die Kundenänderung nicht blockieren (Spec): schlägt die
  // Prüfung fehl, wird konservativ mit "yellow" ohne Label weitergemacht.
  let availabilityLevel: AvailabilityStressLevel = "yellow"
  let availabilityLabel: string | null = null
  try {
    const availability = await checkProductAvailability({
      produkt: merged.produkt,
      modus: merged.modus,
      menge: merged.menge,
      von: merged.von,
      bis: merged.bis || merged.von,
      kanalanzahl: merged.kanalanzahl,
    })
    availabilityLevel = availability.stressLevel
    availabilityLabel = availability.stressLabel ?? null
  } catch {
    availabilityLevel = "yellow"
    availabilityLabel = null
  }

  const result = await updateQuoteByPublicToken({
    publicToken: token,
    incomingConfig: config,
    availabilityLevel,
    availabilityLabel,
  })

  if (!result.success) {
    const error = result.error || "Änderung fehlgeschlagen"
    const status = error.includes("Status")
      ? 409
      : error.includes("nicht gefunden")
        ? 404
        : 400
    return Response.json({ error }, { status })
  }

  return Response.json({ success: true, publicToken: token })
}
