import { createHash, randomBytes, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const LEAD_SESSION_COOKIE = "wristlink_lead_session"
export const LEAD_SESSION_MAX_AGE = 60 * 60 * 24 * 7

function getLeadSecret(): string {
  const secret = process.env.LEAD_SESSION_SECRET || process.env.WRISTLINK_PASSWORD
  if (!secret) throw new Error("LEAD_SESSION_SECRET or WRISTLINK_PASSWORD required")
  return secret
}

function signLeadPayload(leadId: number, email: string): string {
  const payload = `${leadId}:${email.toLowerCase()}`
  const sig = createHash("sha256").update(`${getLeadSecret()}:${payload}`).digest("hex")
  return `${payload}:${sig}`
}

export function verifyLeadToken(token: string): { leadId: number; email: string } | null {
  const parts = token.split(":")
  if (parts.length !== 3) return null
  const leadId = parseInt(parts[0], 10)
  const email = parts[1]
  const sig = parts[2]
  if (!Number.isFinite(leadId) || !email || !sig) return null

  const expected = signLeadPayload(leadId, email).split(":")[2]
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return { leadId, email }
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

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}
