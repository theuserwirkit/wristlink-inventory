#!/usr/bin/env node
/**
 * Registriert den Telegram-Webhook für Freigabe-Buttons.
 *
 * Env: TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL (oder APP_URL), optional TELEGRAM_WEBHOOK_SECRET
 */
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "../.env.local")

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, "")
    }
  }
}

const token = process.env.TELEGRAM_BOT_TOKEN
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

if (!token) {
  console.error("FEHLER: TELEGRAM_BOT_TOKEN fehlt")
  process.exit(1)
}
if (!appUrl) {
  console.error("FEHLER: NEXT_PUBLIC_APP_URL oder APP_URL fehlt")
  process.exit(1)
}

const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`
const secret = process.env.TELEGRAM_WEBHOOK_SECRET

const body = { url: webhookUrl, allowed_updates: ["callback_query"] }
if (secret) body.secret_token = secret

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

const data = await res.json()
if (!data.ok) {
  console.error("setWebhook fehlgeschlagen:", data)
  process.exit(1)
}

const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
const info = await infoRes.json()
console.log("Webhook registriert:", webhookUrl)
console.log("Status:", JSON.stringify(info.result, null, 2))
