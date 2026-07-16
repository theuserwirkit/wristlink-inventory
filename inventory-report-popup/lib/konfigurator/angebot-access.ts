import { createHash, createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const ANGEBOT_ACCESS_COOKIE = "wristlink_angebot_access"
export const ANGEBOT_ACCESS_MAX_AGE = 60 * 60 * 24 * 30

// A-06: einmaliger Hinweis pro Prozess, siehe lib/auth-core.ts.
let warnedAngebotSecretFallbackInProduction = false

function getSecret(): string {
  const dedicated = process.env.LEAD_SESSION_SECRET
  const secret = dedicated || process.env.WRISTLINK_PASSWORD
  if (!secret) throw new Error("LEAD_SESSION_SECRET or WRISTLINK_PASSWORD required")
  if (!dedicated && process.env.NODE_ENV === "production" && !warnedAngebotSecretFallbackInProduction) {
    warnedAngebotSecretFallbackInProduction = true
    console.warn(
      "[angebot-access] LEAD_SESSION_SECRET ist nicht gesetzt – Angebots-Zugriffstoken " +
        "fallen auf WRISTLINK_PASSWORD zurück und teilen sich damit ein Secret mit " +
        "weiteren Zwecken. Empfehlung: eigenes LEAD_SESSION_SECRET setzen.",
    )
  }
  return secret
}

function signAngebotToken(publicToken: string): string {
  const sig = createHmac("sha256", getSecret())
    .update(`angebot:${publicToken}`)
    .digest("hex")
    .slice(0, 32)
  return `${publicToken}:${sig}`
}

/**
 * Legacy-Signatur (SHA256(secret+":angebot:"+token)) vor der Umstellung auf HMAC
 * (B-03/A-05). Nur für die Übergangsphase zur Verifikation bestehender Cookies –
 * beim Setzen neuer Cookies wird nur noch signAngebotToken (HMAC) verwendet.
 */
function signAngebotTokenLegacy(publicToken: string): string {
  const sig = createHash("sha256")
    .update(`${getSecret()}:angebot:${publicToken}`)
    .digest("hex")
    .slice(0, 32)
  return `${publicToken}:${sig}`
}

function timingSafeMatch(value: string, expected: string): boolean {
  try {
    const a = Buffer.from(value)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function verifyAngebotAccessCookie(cookieValue: string, publicToken: string): boolean {
  if (timingSafeMatch(cookieValue, signAngebotToken(publicToken))) return true
  // Übergangsphase B-03/A-05: alte SHA256-Cookies weiterhin akzeptieren, bis sie
  // natürlich auslaufen (ANGEBOT_ACCESS_MAX_AGE). Neue Cookies nutzen nur noch HMAC.
  return timingSafeMatch(cookieValue, signAngebotTokenLegacy(publicToken))
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
