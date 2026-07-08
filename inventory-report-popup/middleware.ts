import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_MAX_AGE = 60 * 60 * 24 * 7

// Edge runtime: HMAC-SHA256 über Web Crypto (SubtleCrypto).
// Muss dasselbe Ergebnis liefern wie createHmac in lib/auth.ts (Node runtime).
function getSessionSecret(): string | null {
  return process.env["WRISTLINK_SESSION_SECRET"] || process.env["WRISTLINK_PASSWORD"] || null
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message))
  const bytes = new Uint8Array(signature)
  let hex = ""
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0")
  }
  return hex
}

async function verifyTokenInMiddleware(token: string): Promise<boolean> {
  const secret = getSessionSecret()
  if (!secret) return false
  const parts = token.split(":")
  if (parts.length !== 2) return false
  const timestamp = parseInt(parts[0], 10)
  if (isNaN(timestamp)) return false
  const now = Math.floor(Date.now() / 1000)
  if (now - timestamp > SESSION_MAX_AGE) return false

  const expected = `${timestamp}:${await hmacSha256Hex(String(timestamp), secret)}`
  if (token.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/landingpage" || pathname.startsWith("/landingpage/")) {
    const target = pathname.replace(/^\/landingpage/, "") || "/"
    return NextResponse.redirect(new URL(target, request.url), 308)
  }

  const authCookie = request.cookies.get("wristlink_auth")
  const isAuthenticated = authCookie?.value ? await verifyTokenInMiddleware(authCookie.value) : false

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/konfigurator") ||
    pathname.startsWith("/angebot/") ||
    pathname === "/impressum" ||
    pathname === "/datenschutz"

  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/warenverwaltung", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images).*)"],
}
