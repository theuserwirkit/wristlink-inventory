import { NextRequest } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { bypassEmailVerificationForTestmode } from "@/lib/actions/leads"

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8")
  const bBuf = Buffer.from(b, "utf8")
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * Testmode-Zugriff prüfen (fail-closed):
 * - Nicht-Production: immer erlaubt.
 * - Production: nur wenn KONFIGURATOR_TESTMODE_ENABLED=true UND ein gültiger
 *   Header `x-testmode-secret` mit KONFIGURATOR_TESTMODE_SECRET übereinstimmt.
 */
function isRequestAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true

  if (process.env.KONFIGURATOR_TESTMODE_ENABLED !== "true") return false

  const secret = process.env.KONFIGURATOR_TESTMODE_SECRET
  const header = request.headers.get("x-testmode-secret")
  if (!secret || !header) return false
  return safeEqual(header, secret)
}

export async function POST(request: NextRequest) {
  if (!isRequestAuthorized(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { email?: string } = {}
  try {
    body = await request.json()
  } catch {
    // leerer Body ist ok – Default-E-Mail wird verwendet
  }

  const result = await bypassEmailVerificationForTestmode(body.email)
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  return Response.json({ success: true })
}
