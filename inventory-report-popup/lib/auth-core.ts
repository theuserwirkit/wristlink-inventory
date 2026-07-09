import { createHmac, timingSafeEqual } from "crypto"

export const SESSION_COOKIE_NAME = "wristlink_auth"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export function getSessionSecret(): string {
  const secret =
    process.env["WRISTLINK_SESSION_SECRET"] || process.env["WRISTLINK_PASSWORD"]
  if (!secret) {
    throw new Error("WRISTLINK_SESSION_SECRET or WRISTLINK_PASSWORD environment variable is not set")
  }
  return secret
}

function signMessage(message: string, secret: string): string {
  return createHmac("sha256", secret).update(message).digest("hex")
}

export function signToken(userId: number, timestamp: number): string {
  const payload = `${userId}:${timestamp}`
  return `${payload}:${signMessage(payload, getSessionSecret())}`
}

export function parseToken(token: string): { userId: number; timestamp: number } | null {
  const parts = token.split(":")
  if (parts.length !== 3) return null
  const userId = parseInt(parts[0], 10)
  const timestamp = parseInt(parts[1], 10)
  if (isNaN(userId) || isNaN(timestamp) || userId <= 0) return null
  return { userId, timestamp }
}

export function verifyToken(token: string): { userId: number } | null {
  const parsed = parseToken(token)
  if (!parsed) return null

  const now = Math.floor(Date.now() / 1000)
  if (now - parsed.timestamp > SESSION_MAX_AGE) return null

  const expected = signToken(parsed.userId, parsed.timestamp)
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null
    return { userId: parsed.userId }
  } catch {
    return null
  }
}
