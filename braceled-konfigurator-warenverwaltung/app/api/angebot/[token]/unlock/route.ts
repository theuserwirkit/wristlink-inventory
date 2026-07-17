import { NextRequest } from "next/server"
import { getQuoteByPublicToken } from "@/lib/actions/quotes"
import { setAngebotAccess } from "@/lib/konfigurator/angebot-access"
import { verifyPlzInput } from "@/lib/konfigurator/plz"
import { getQuoteAccessPlz } from "@/lib/konfigurator/kontakt-adresse"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`angebot:unlock:${ip}:${token}`, 10, 15 * 60 * 1000)
  if (!rateLimit.success) return rateLimitResponse(rateLimit)

  const quote = await getQuoteByPublicToken(token)
  if (!quote) {
    return Response.json({ error: "Anfrage nicht gefunden" }, { status: 404 })
  }

  const expectedPlz = getQuoteAccessPlz(quote.config_json)
  if (!expectedPlz) {
    await setAngebotAccess(token)
    return Response.json({ success: true })
  }

  let body: { plz?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  const plz = body.plz?.trim()
  if (!plz || !verifyPlzInput(plz, expectedPlz)) {
    return Response.json(
      { error: "Die Postleitzahl stimmt nicht mit Ihrer Firmenadresse überein." },
      { status: 403 },
    )
  }

  await setAngebotAccess(token)
  return Response.json({ success: true })
}
