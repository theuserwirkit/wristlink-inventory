import "server-only"
import { headers } from "next/headers"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/**
 * Rate-Limiting mit optionalem Upstash Redis (Vercel KV-kompatibel).
 * Ohne UPSTASH_REDIS_REST_URL/TOKEN: In-Memory-Fallback pro Serverless-Instanz.
 */

type Bucket = {
  hits: number[]
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

const limiterCache = new Map<string, Ratelimit>()

function pruneIfNeeded() {
  if (buckets.size <= MAX_BUCKETS) return
  const oldestFirst = [...buckets.entries()].sort(
    (a, b) => (a[1].hits[a[1].hits.length - 1] ?? 0) - (b[1].hits[b[1].hits.length - 1] ?? 0),
  )
  for (const [key] of oldestFirst.slice(0, buckets.size - MAX_BUCKETS)) {
    buckets.delete(key)
  }
}

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

function checkRateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((ts) => now - ts < windowMs)

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0]
    buckets.set(key, bucket)
    return {
      success: false,
      limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    }
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  pruneIfNeeded()

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - bucket.hits.length),
    retryAfterSeconds: 0,
  }
}

let warnedNoUpstashInProduction = false

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === "production" && !warnedNoUpstashInProduction) {
      warnedNoUpstashInProduction = true
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN nicht gesetzt – Rate-Limits laufen im " +
          "In-Memory-Fallback pro Serverless-Instanz und sind auf Vercel effektiv umgehbar " +
          "(mehrere Instanzen/Cold-Starts). Für Produktion Upstash Redis konfigurieren.",
      )
    }
    return null
  }

  const cacheKey = `${limit}:${windowMs}`
  const cached = limiterCache.get(cacheKey)
  if (cached) return cached

  const redis = new Redis({ url, token })
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${Math.max(1, Math.round(windowMs / 1000))} s`),
    prefix: "wristlink:rl",
  })
  limiterCache.set(cacheKey, limiter)
  return limiter
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(limit, windowMs)
  if (upstash) {
    const result = await upstash.limit(key)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      retryAfterSeconds: result.success
        ? 0
        : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    }
  }
  return checkRateLimitMemory(key, limit, windowMs)
}

/**
 * Ermittelt die Client-IP für Rate-Limiting/Consent-Logging – zentrale Stelle,
 * die von allen Aufrufern (Login, PLZ-Unlock, Konfigurator-Submit/Distance/
 * Verify-Request, n8n-API-Routen, ...) genutzt wird.
 *
 * Der erste Eintrag eines client-kontrollierten `x-forwarded-for`-Headers ist
 * spoofbar (der Client kann beliebige IPs vorne an die Chain anhängen) und
 * darf daher NICHT ungeprüft vertraut werden. Reihenfolge:
 *
 * 1. `x-vercel-forwarded-for` – von Vercels Edge-Netzwerk gesetzt und bleibt
 *    auch bei nachgelagerten Rewrites/eigenen Proxies unverändert; laut
 *    Vercel-Doku die verlässlichste Quelle für die tatsächliche Client-IP.
 * 2. `x-real-ip` – falls von der Plattform/einem vorgeschalteten Trusted
 *    Proxy gesetzt.
 * 3. `x-forwarded-for` – konservativer Fallback: hier wird der LETZTE Eintrag
 *    der Chain verwendet statt des ersten, da ein Angreifer nur Einträge VOR
 *    dem vom (vertrauenswürdigeren) Edge/Proxy hinzugefügten Hop einschleusen
 *    kann, nicht dahinter.
 *
 * Ohne jeden dieser Header (z. B. lokale Entwicklung) wird `"unknown"`
 * zurückgegeben; das bildet dann einen eigenen (gemeinsam genutzten)
 * Rate-Limit-Bucket, was für lokale/Test-Umgebungen unkritisch ist.
 */
function extractClientIp(get: (name: string) => string | null): string {
  const vercelForwardedFor = get("x-vercel-forwarded-for")
  if (vercelForwardedFor) {
    const first = vercelForwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  const realIp = get("x-real-ip")
  if (realIp) {
    const trimmed = realIp.trim()
    if (trimmed) return trimmed
  }

  const forwardedFor = get("x-forwarded-for")
  if (forwardedFor) {
    const entries = forwardedFor
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
    const last = entries[entries.length - 1]
    if (last) return last
  }

  return "unknown"
}

export function getClientIp(request?: Request): string {
  const headerSource = request ? request.headers : null
  return extractClientIp((name) => (headerSource ? headerSource.get(name) : null))
}

export async function getClientIpFromHeaders(): Promise<string> {
  try {
    const headerList = await headers()
    return extractClientIp((name) => headerList.get(name))
  } catch {
    // headers() ist außerhalb eines Request-Kontexts nicht verfügbar
    return "unknown"
  }
}

const ONE_MINUTE_MS = 60 * 1000
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

export async function checkSubmitRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`konfigurator:submit:${ip}`, 5, ONE_HOUR_MS)
}

export async function checkDistanceRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`konfigurator:distance:${ip}`, 30, ONE_MINUTE_MS)
}

export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`auth:login:${ip}`, 10, 15 * ONE_MINUTE_MS)
}

/** B-02: IP-Limit für verify-request, zusätzlich zum bestehenden E-Mail-Limit in lib/actions/leads.ts. */
export async function checkVerifyRequestRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`konfigurator:verify-request:${ip}`, 10, ONE_HOUR_MS)
}

/**
 * B-08: Leichtes Rate-Limit für `/api/konfigurator/session` (Preis-/Verfügbarkeits-
 * Abfragen während der Konfiguration). Schützt vor exzessivem Polling/Scraping durch
 * einen einzelnen Client, ohne normale Konfigurator-Nutzung (mehrere Preis-/
 * Verfügbarkeitsabfragen pro Sitzung) einzuschränken.
 */
export async function checkKonfiguratorSessionRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`konfigurator:session:${ip}`, 60, ONE_MINUTE_MS)
}

/**
 * E-03: Rate-Limit für n8n-Bearer-Routen (availability/bookings/quote-requests).
 * Wird erst NACH erfolgreicher `verifyApiKey`-Prüfung angewendet (fail-closed:
 * ein ungültiger Key liefert weiterhin sofort 401, ohne dass ein Rate-Limit-Zähler
 * verbraucht wird). Key basiert auf der Client-IP, nicht auf dem Bearer-Token
 * selbst (kein Secret in Rate-Limit-Keys/Logs).
 */
export async function checkN8nApiRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`n8n:api:${ip}`, 90, ONE_MINUTE_MS)
}

export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  )
}
