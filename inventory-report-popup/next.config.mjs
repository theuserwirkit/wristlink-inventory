const isDev = process.env.NODE_ENV === "development"

if (
  process.env.NODE_ENV === "production" &&
  process.env.KONFIGURATOR_TESTMODE_ENABLED === "true"
) {
  throw new Error(
    "KONFIGURATOR_TESTMODE_ENABLED darf in Production nicht true sein. Bitte in Vercel deaktivieren oder entfernen.",
  )
}

const contentSecurityPolicy = [
  "default-src 'self'",
  // Dev: unsafe-eval für Next.js HMR; Prod: ohne eval
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  isDev
    ? "connect-src 'self' https://api.stripe.com ws: wss:"
    : "connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com",
  "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
].join("; ")

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
