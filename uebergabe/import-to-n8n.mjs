#!/usr/bin/env node
/**
 * Importiert wristlink-n8n-workflow.json in n8n via REST API.
 *
 * Env:
 *   N8N_BASE_URL  – z.B. https://wirkungdigital.app.n8n.cloud
 *   N8N_API_KEY   – Settings → n8n API → Create API Key
 */
import { existsSync, readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    let val = trimmed.slice(eq + 1)
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(join(__dirname, "../braceled-konfigurator-warenverwaltung/.env.local"))
const baseUrl = (process.env.N8N_BASE_URL || "https://wirkungdigital.app.n8n.cloud").replace(/\/$/, "")
const apiKey = process.env.N8N_API_KEY

if (!apiKey) {
  console.error("N8N_API_KEY fehlt. In n8n: Settings → n8n API → Create API Key")
  process.exit(1)
}

const raw = JSON.parse(readFileSync(join(__dirname, "wristlink-n8n-workflow.json"), "utf8"))

const payload = {
  name: raw.name,
  nodes: raw.nodes,
  connections: raw.connections,
  settings: raw.settings || { executionOrder: "v1" },
}

const existingRes = await fetch(`${baseUrl}/api/v1/workflows?name=${encodeURIComponent(payload.name)}`, {
  headers: { "X-N8N-API-KEY": apiKey },
})
const existing = await existingRes.json()
const match = (existing.data || []).find((w) => w.name === payload.name)

let res
if (match) {
  console.log(`Workflow existiert (${match.id}) – aktualisiere…`)
  res = await fetch(`${baseUrl}/api/v1/workflows/${match.id}`, {
    method: "PUT",
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
} else {
  console.log("Erstelle neuen Workflow…")
  res = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: "POST",
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

const body = await res.json()
if (!res.ok) {
  console.error("Import fehlgeschlagen:", res.status, JSON.stringify(body, null, 2))
  process.exit(1)
}

console.log("OK – Workflow importiert:")
console.log(`  ID:   ${body.id}`)
console.log(`  Name: ${body.name}`)
console.log(`  URL:  ${baseUrl}/workflow/${body.id}`)
