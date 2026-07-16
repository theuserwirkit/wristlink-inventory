import { createHash, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const ANGEBOT_ACCESS_COOKIE = "wristlink_angebot_access"
export const ANGEBOT_ACCESS_MAX_AGE = 60 * 60 * 24 * 30

function getSecret(): string {
  const secret = process.env.LEAD_SESSION_SECRET || process.env.WRISTLINK_PASSWORD
  if (!secret) throw new Error("LEAD_SESSION_SECRET or WRISTLINK_PASSWORD required")
  return secret
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
    path: "/", // nötig für Konfigurator-Edit und Update-API
  })
}

export function angebotRequiresPlzGate(expectedPlz: string | null): boolean {
  return Boolean(expectedPlz)
}
