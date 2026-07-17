import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const LEAD_SESSION_COOKIE = "wristlink_lead_session"
export const LEAD_SESSION_MAX_AGE = 60 * 60 * 24 * 7

// A-06: einmaliger Hinweis pro Prozess, siehe lib/auth-core.ts.
let warnedLeadSecretFallbackInProduction = false

function getLeadSecret(): string {
  const dedicated = process.env.LEAD_SESSION_SECRET
  const secret = dedicated || process.env.WRISTLINK_PASSWORD
  if (!secret) throw new Error("LEAD_SESSION_SECRET or WRISTLINK_PASSWORD required")
  if (!dedicated && process.env.NODE_ENV === "production" && !warnedLeadSecretFallbackInProduction) {
    warnedLeadSecretFallbackInProduction = true
    console.warn(
      "[lead-auth] LEAD_SESSION_SECRET ist nicht gesetzt – Lead-Sessions fallen auf " +
        "WRISTLINK_PASSWORD zurück und teilen sich damit ein Secret mit weiteren Zwecken. " +
        "Empfehlung: eigenes LEAD_SESSION_SECRET setzen.",
    )
  }
  return secret
}

function signLeadPayload(leadId: number, email: string): string {
  const payload = `${leadId}:${email.toLowerCase()}`
  const sig = createHmac("sha256", getLeadSecret()).update(payload).digest("hex")
  return `${payload}:${sig}`
}

/**
 * Legacy-Signatur (SHA256(secret+":"+payload)) vor der Umstellung auf HMAC (B-03/A-05).
 * Nur für die Übergangsphase zur Verifikation bestehender Cookies – wird beim Setzen
 * neuer Sessions nicht mehr verwendet (siehe signLeadPayload).
 */
function signLeadPayloadLegacy(leadId: number, email: string): string {
  const payload = `${leadId}:${email.toLowerCase()}`
  const sig = createHash("sha256").update(`${getLeadSecret()}:${payload}`).digest("hex")
  return `${payload}:${sig}`
}

function timingSafeMatch(sig: string, expected: string): boolean {
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function verifyLeadToken(token: string): { leadId: number; email: string } | null {
  const parts = token.split(":")
  if (parts.length !== 3) return null
  const leadId = parseInt(parts[0], 10)
  const email = parts[1]
  const sig = parts[2]
  if (!Number.isFinite(leadId) || !email || !sig) return null

  const expectedHmac = signLeadPayload(leadId, email).split(":")[2]
  if (timingSafeMatch(sig, expectedHmac)) {
    return { leadId, email }
  }

  // Übergangsphase B-03/A-05: alte SHA256-Cookies weiterhin akzeptieren, bis sie
  // natürlich auslaufen (LEAD_SESSION_MAX_AGE). Neue Cookies nutzen nur noch HMAC.
  const expectedLegacy = signLeadPayloadLegacy(leadId, email).split(":")[2]
  if (timingSafeMatch(sig, expectedLegacy)) {
    return { leadId, email }
  }

  return null
}

export async function setLeadSession(leadId: number, email: string) {
  const token = signLeadPayload(leadId, email)
  const cookieStore = await cookies()
  cookieStore.set(LEAD_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: LEAD_SESSION_MAX_AGE,
    path: "/",
  })
}

export async function getLeadSession(): Promise<{ leadId: number; email: string } | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(LEAD_SESSION_COOKIE)
    if (!cookie?.value) return null
    return verifyLeadToken(cookie.value)
  } catch {
    return null
  }
}

export async function clearLeadSession() {
  const cookieStore = await cookies()
  cookieStore.delete(LEAD_SESSION_COOKIE)
}

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex")
}

const PRODUCTION_APP_URL = "https://braceled-led-armband.com"

export function getAppBaseUrl(): string {
  const normalize = (value: string) => value.trim().replace(/\/$/, "")
  if (process.env.NEXT_PUBLIC_APP_URL) return normalize(process.env.NEXT_PUBLIC_APP_URL)
  if (process.env.APP_URL) return normalize(process.env.APP_URL)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.trim()}`
  if (process.env.NODE_ENV === "production") return PRODUCTION_APP_URL
  return "http://localhost:3000"
}
