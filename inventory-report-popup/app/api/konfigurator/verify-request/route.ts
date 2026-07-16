import { NextRequest } from "next/server"
import { requestEmailVerification } from "@/lib/actions/leads"
import { checkVerifyRequestRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = await checkVerifyRequestRateLimit(ip)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  let body: {
    email?: string
    marketingConsent?: boolean
    b2bConfirmed?: boolean
    name?: string
    firma?: string
    telefon?: string
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  const email = body.email?.trim()
  if (!email) {
    return Response.json({ error: "E-Mail erforderlich" }, { status: 400 })
  }

  const result = await requestEmailVerification(
    email,
    Boolean(body.marketingConsent),
    ip,
    {
      name: body.name,
      firma: body.firma,
      telefon: body.telefon,
    },
    Boolean(body.b2bConfirmed),
  )
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  return Response.json({ success: true })
}
