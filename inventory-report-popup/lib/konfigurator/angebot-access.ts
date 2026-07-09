import { createHash, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const ANGEBOT_ACCESS_COOKIE = "wristlink_angebot_access"
export const ANGEBOT_ACCESS_MAX_AGE = 60 * 60 * 24 * 30

function getSecret(): string {
  const secret = process.env.LEAD_SESSION_SECRET || process.env.WRISTLINK_PASSWORD
  if (!secret) throw new Error("LEAD_SESSION_SECRET or WRISTLINK_PASSWORD required")
  return secret
}

/** Deutsche PLZ (5 Ziffern) aus Freitext-Adresse extrahieren */
export function extractPlzFromAddress(address: string | undefined | null): string | null {
  if (!address?.trim()) return null
  const match = address.match(/\b(\d{5})\b/)
  return match?.[1] ?? null
}

export function normalizePlz(plz: string): string {
  return plz.replace(/\D/g, "").slice(0, 5)
}

export function verifyPlzInput(input: string, expected: string): boolean {
  const a = normalizePlz(input)
  const b = normalizePlz(expected)
  if (a.length !== 5 || b.length !== 5) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

function signAngebotToken(publicToken: string): string {
  const sig = createHash("sha256")
    .update(`${getSecret()}:angebot:${publicToken}`)
    .digest("hex")
    .slice(0, 32)
  return `${publicToken}:${sig}`
}

export function verifyAngebotAccessCookie(cookieValue: string, publicToken: string): boolean {
  const expected = signAngebotToken(publicToken)
  try {
    const a = Buffer.from(cookieValue)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function hasAngebotAccess(publicToken: string): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(ANGEBOT_ACCESS_COOKIE)
    if (!cookie?.value) return false
    return verifyAngebotAccessCookie(cookie.value, publicToken)
  } catch {
    return false
  }
}

export async function setAngebotAccess(publicToken: string) {
  const cookieStore = await cookies()
  cookieStore.set(ANGEBOT_ACCESS_COOKIE, signAngebotToken(publicToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ANGEBOT_ACCESS_MAX_AGE,
    path: "/angebot",
  })
}

export function angebotRequiresPlzGate(expectedPlz: string | null): boolean {
  return Boolean(expectedPlz)
}
