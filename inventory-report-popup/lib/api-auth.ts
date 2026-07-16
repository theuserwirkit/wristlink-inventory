import "server-only"

import { timingSafeEqual } from "crypto"
import type { NextRequest } from "next/server"

function getApiKey(): string {
  const key = process.env.WRISTLINK_API_KEY
  if (!key) {
    throw new Error("WRISTLINK_API_KEY environment variable is not set")
  }
  return key
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  return header.slice(7).trim() || null
}

export function verifyApiKey(request: NextRequest): boolean {
  try {
    const token = extractBearerToken(request)
    if (!token) return false
    return safeCompare(token, getApiKey())
  } catch {
    return false
  }
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
