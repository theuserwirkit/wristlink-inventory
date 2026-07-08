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

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

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

export function getClientIp(request?: Request): string {
  const headerSource = request ? request.headers : null

  const get = (name: string): string | null =>
    headerSource ? headerSource.get(name) : null

  const forwardedFor = get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  const realIp = get("x-real-ip")
  if (realIp) return realIp.trim()

  return "unknown"
}

export async function getClientIpFromHeaders(): Promise<string> {
  try {
    const headerList = await headers()
    const forwardedFor = headerList.get("x-forwarded-for")
    if (forwardedFor) {
      const first = forwardedFor.split(",")[0]?.trim()
      if (first) return first
    }
    const realIp = headerList.get("x-real-ip")
    if (realIp) return realIp.trim()
  } catch {
    // headers() ist außerhalb eines Request-Kontexts nicht verfügbar
  }
  return "unknown"
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
