import { createHmac, timingSafeEqual } from "crypto"

export const SESSION_COOKIE_NAME = "wristlink_auth"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export function getPassword(): string {
  const pw = process.env["WRISTLINK_PASSWORD"]
  if (!pw) throw new Error("WRISTLINK_PASSWORD environment variable is not set")
  return pw
}

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

export function signToken(timestamp: number): string {
  return `${timestamp}:${signMessage(String(timestamp), getSessionSecret())}`
}

export function verifyToken(token: string): boolean {
  const parts = token.split(":")
  if (parts.length !== 2) return false
  const timestamp = parseInt(parts[0], 10)
  if (isNaN(timestamp)) return false
  const now = Math.floor(Date.now() / 1000)
  if (now - timestamp > SESSION_MAX_AGE) return false
  const expected = signToken(timestamp)
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function verifyPassword(password: string): boolean {
  return password === getPassword()
}
