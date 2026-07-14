import { NextRequest } from "next/server"
import { unauthorizedResponse, verifyApiKey } from "@/lib/api-auth"
import { createExternalQuoteRequest, type ExternalQuoteInput } from "@/lib/quotes-internal"
import type { QuoteConfig } from "@/lib/konfigurator/types"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorizedResponse()

  let body: ExternalQuoteInput
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  if (!body.email || !body.config?.produkt || !body.config?.modus || !body.config?.menge) {
    return Response.json(
      { error: "Pflichtfelder: email, config.produkt, config.modus, config.menge" },
      { status: 400 },
    )
  }

  const config: QuoteConfig = {
    produkt: body.config.produkt,
    modus: body.config.modus,
    menge: Number(body.config.menge),
    druck: Boolean(body.config.druck),
    gruppen: Number(body.config.gruppen) || 1,
    station: body.config.station || "keine",
    stationModus: body.config.stationModus || body.config.modus,
    lieferzeit: body.config.lieferzeit || "standard",
    land: body.config.land || "DE",
    von: body.config.von,
    bis: body.config.bis,
    szenario: body.config.szenario,
    variante: body.config.variante,
    probedruckOption: body.config.probedruckOption || "none",
    probedruck: body.config.probedruck,
    lieferpaket: body.config.lieferpaket || "regulaer",
    flexRueckgabe: body.config.flexRueckgabe,
    lieferart: body.config.lieferart,
    flex: body.config.flex,
    techniker: body.config.techniker,
    technikerTage: body.config.technikerTage,
    technikerAdresse: body.config.technikerAdresse,
    technikerKm: body.config.technikerKm,
  }

  const result = await createExternalQuoteRequest({
    email: body.email,
    config,
    price_snapshot: body.price_snapshot,
    external_ref: body.external_ref,
    notes: body.notes,
    skip_notifications: body.skip_notifications,
  })

  if (!result.success) {
    return Response.json(result, { status: 422 })
  }

  return Response.json(
    {
      success: true,
      quoteId: result.quoteId,
      adminUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ""}/warenverwaltung/auftraege/${result.quoteId}`,
    },
    { status: 201 },
  )
}
