import { NextRequest } from "next/server"
import { unauthorizedResponse, verifyApiKey } from "@/lib/api-auth"
import { checkProductAvailability } from "@/lib/actions/n8n-api"
import { availabilityRequestSchema, formatZodError } from "@/lib/api-schemas"
import { checkN8nApiRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorizedResponse()

  const rateLimit = await checkN8nApiRateLimit(getClientIp(request))
  if (!rateLimit.success) return rateLimitResponse(rateLimit)

  const params = request.nextUrl.searchParams
  const rawBody = {
    produkt: params.get("produkt") || "",
    modus: params.get("modus") || "",
    menge: Number(params.get("menge") || 0),
    von: params.get("von") || undefined,
    bis: params.get("bis") || undefined,
    missing_fields: params.getAll("missing_fields"),
  }

  const parsed = availabilityRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json(
      { error: `Ungültige Parameter: ${formatZodError(parsed.error)}` },
      { status: 400 },
    )
  }

  const result = await checkProductAvailability(parsed.data)
  return Response.json(result)
}

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorizedResponse()

  const rateLimit = await checkN8nApiRateLimit(getClientIp(request))
  if (!rateLimit.success) return rateLimitResponse(rateLimit)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Ungueltiger JSON-Body" }, { status: 400 })
  }

  const parsed = availabilityRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: `Ungültiger Body: ${formatZodError(parsed.error)}` },
      { status: 400 },
    )
  }

  const result = await checkProductAvailability(parsed.data)
  return Response.json(result)
}
