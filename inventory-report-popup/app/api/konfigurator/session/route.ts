import { NextRequest } from "next/server"
import { z } from "zod"
import { getLeadSession } from "@/lib/konfigurator/lead-auth"
import { getVerifiedLead } from "@/lib/actions/leads"
import { checkKonfiguratorSessionRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"
import { checkProductAvailability } from "@/lib/actions/n8n-api"
import { checkStationAvailability } from "@/lib/konfigurator/station-availability"
import { checkGroupProgrammingAvailability } from "@/lib/konfigurator/group-allocation"
import { normalizeGruppenGroessen } from "@/lib/konfigurator/gruppen-config"
import { MAX_PHYSICAL_GROUPS, normalizeKanalanzahl } from "@/lib/konfigurator/kanalanzahl"
import { resolveKanalanzahlForConfig } from "@/lib/konfigurator/resolve-kanalanzahl"
import { rechnePreis } from "@/lib/pricing/preis-engine"
import type { QuoteConfig } from "@/lib/konfigurator/types"
import { quoteConfigSchema, formatZodError } from "@/lib/api-schemas"

const sessionBodySchema = z.object({
  action: z.string().max(50).optional(),
  config: quoteConfigSchema,
})

export async function GET(request: NextRequest) {
  const session = await getLeadSession()
  const lead = await getVerifiedLead()

  if (!session || !lead) {
    return Response.json({ verified: false }, { status: 401 })
  }

  return Response.json({
    verified: true,
    email: lead.email,
    name: lead.name,
    firma: lead.firma,
    telefon: lead.telefon,
    marketingConsent: lead.marketing_consent,
  })
}

export async function POST(request: NextRequest) {
  const lead = await getVerifiedLead()
  if (!lead) {
    return Response.json({ error: "Nicht verifiziert" }, { status: 401 })
  }

  // B-08: leichtes Rate-Limit gegen exzessives Polling der Preis-/Verfügbarkeits-Actions.
  const rateLimit = await checkKonfiguratorSessionRateLimit(getClientIp(request))
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  const parsed = sessionBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      { error: `Ungültige Konfiguration: ${formatZodError(parsed.error)}` },
      { status: 400 },
    )
  }

  const action = parsed.data.action
  const rawConfig = parsed.data.config as QuoteConfig

  if (action === "price") {
    const kanalanzahl =
      rawConfig.produkt === "armband" ? normalizeKanalanzahl(rawConfig.kanalanzahl) : undefined
    const config: QuoteConfig =
      kanalanzahl != null ? { ...rawConfig, kanalanzahl } : rawConfig
    const price = rechnePreis(config as Parameters<typeof rechnePreis>[0])
    return Response.json({ ...price, kanalanzahl })
  }

  const kanalanzahl =
    rawConfig.produkt === "armband" ? await resolveKanalanzahlForConfig(rawConfig) : undefined
  const config: QuoteConfig =
    kanalanzahl != null ? { ...rawConfig, kanalanzahl } : rawConfig

  if (action === "availability") {
    const result = await checkProductAvailability({
      produkt: config.produkt,
      modus: config.modus,
      menge: config.menge,
      von: config.von,
      bis: config.bis,
      kanalanzahl: config.kanalanzahl,
    })
    return Response.json({ ...result, kanalanzahl })
  }

  if (action === "station-availability") {
    const result = await checkStationAvailability({
      station: config.station,
      stationModus: config.station === "pro" ? "miete" : config.stationModus,
      kanalanzahl: config.kanalanzahl,
      von: config.von,
      bis: config.bis,
    })
    return Response.json({ ...result, kanalanzahl })
  }

  if (action === "group-availability") {
    if (!config.von || config.gruppen <= 0) {
      return Response.json({
        verfuegbar: true,
        slots: [],
        fehlendeSlots: [],
        inventory: [],
        physischeGruppen: 0,
        maxPhysischeGruppen: MAX_PHYSICAL_GROUPS,
        kanalanzahl,
      })
    }
    const result = await checkGroupProgrammingAvailability({
      von: config.von,
      bis: config.bis,
      kanalanzahl: config.kanalanzahl,
      gruppenGroessen: normalizeGruppenGroessen(config).slice(0, config.gruppen),
    })
    return Response.json({ ...result, kanalanzahl })
  }

  return Response.json({ error: "Unbekannte Aktion" }, { status: 400 })
}
