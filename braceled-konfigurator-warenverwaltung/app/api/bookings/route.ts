import { NextRequest } from "next/server"
import { unauthorizedResponse, verifyApiKey } from "@/lib/api-auth"
import { createN8nBooking } from "@/lib/actions/n8n-api"
import { bookingRequestSchema, formatZodError } from "@/lib/api-schemas"
import { checkN8nApiRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

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

  const parsed = bookingRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: `Ungültiger Body: ${formatZodError(parsed.error)}` },
      { status: 400 },
    )
  }

  const result = await createN8nBooking(parsed.data)
  if (!result.success) {
    return Response.json(result, { status: 422 })
  }

  return Response.json(result, { status: 201 })
}
