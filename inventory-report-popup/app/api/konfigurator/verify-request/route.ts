import { NextRequest } from "next/server"
import { requestEmailVerification } from "@/lib/actions/leads"

export async function POST(request: NextRequest) {
  let body: {
    email?: string
    marketingConsent?: boolean
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

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined

  const result = await requestEmailVerification(
    email,
    Boolean(body.marketingConsent),
    ip,
    {
      name: body.name,
      firma: body.firma,
      telefon: body.telefon,
    },
  )
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  return Response.json({ success: true })
}
