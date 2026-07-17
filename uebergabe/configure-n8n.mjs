#!/usr/bin/env node
/**
 * Konfiguriert den Wristlink-Workflow in n8n:
 * - Credentials anlegen (Wristlink API, optional Anthropic/Telegram)
 * - API-URLs hardcoden, Credential-Referenzen setzen
 * - PDF-Knoten umgehen (kein Endpoint vorhanden)
 *
 * Env aus braceled-konfigurator-warenverwaltung/.env.local + .env.production.local
 */
import { existsSync, readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const WRISTLINK_API_URL =
  process.env.WRISTLINK_API_URL || "https://braceled-led-armband.com"
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || "gVl5dVqvTN61D4Fc"

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
loadEnvFile(join(__dirname, "../braceled-konfigurator-warenverwaltung/.env.production.local"))

const baseUrl = (process.env.N8N_BASE_URL || "https://wirkungdigital.app.n8n.cloud").replace(
  /\/$/,
  "",
)
const apiKey = process.env.N8N_API_KEY
if (!apiKey) {
  console.error("N8N_API_KEY fehlt")
  process.exit(1)
}

const headers = {
  "X-N8N-API-KEY": apiKey,
  "Content-Type": "application/json",
}

async function api(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  return json
}

async function findOrCreateCredential(name, type, data) {
  const list = await api("GET", "/api/v1/credentials")
  const match = (list.data || []).find((c) => c.name === name && c.type === type)
  if (match) {
    console.log(`  Credential vorhanden: ${name} (${match.id})`)
    return match
  }
  const created = await api("POST", "/api/v1/credentials", { name, type, data })
  console.log(`  Credential erstellt: ${name} (${created.id})`)
  return created
}

function credRef(credential) {
  const typeMap = {
    httpHeaderAuth: "httpHeaderAuth",
    telegramApi: "telegramApi",
    gmailOAuth2: "gmailOAuth2",
    imap: "imap",
  }
  const type = typeMap[credential.type] || credential.type
  return { [type]: { id: credential.id, name: credential.name } }
}

function attachHeaderAuth(node, credential) {
  node.parameters.authentication = "genericCredentialType"
  node.parameters.genericAuthType = "httpHeaderAuth"
  node.credentials = credRef(credential)
  if (node.parameters.headerParameters?.parameters) {
    node.parameters.headerParameters.parameters =
      node.parameters.headerParameters.parameters.filter((p) => p.name !== "x-api-key")
  }
}

function replaceTriggerRefs(wf, fromName, toName) {
  for (const node of wf.nodes) {
    for (const key of Object.keys(node.parameters || {})) {
      const val = node.parameters[key]
      if (typeof val === "string" && val.includes(fromName)) {
        node.parameters[key] = val.replaceAll(fromName, toName)
      }
    }
  }
}

function patchWorkflow(wf, creds) {
  const { wristlink, anthropic, telegram, gmail, imap } = creds

  for (const node of wf.nodes) {
    if (node.name === "Verfuegbarkeit API") {
      node.parameters.url = `${WRISTLINK_API_URL}/api/availability`
      attachHeaderAuth(node, wristlink)
    }
    if (
      node.name === "Anfrage anlegen" ||
      node.name === "Freigabe API" ||
      node.name === "Ablehnung API"
    ) {
      if (node.name === "Anfrage anlegen") {
        node.parameters.url = `${WRISTLINK_API_URL}/api/quote-requests`
      }
      if (node.name === "Freigabe API") {
        node.parameters.url = `=${WRISTLINK_API_URL}/api/quote-requests/{{ $('Anfrage anlegen').first().json.quoteId }}/approve`
      }
      if (node.name === "Ablehnung API") {
        node.parameters.url = `=${WRISTLINK_API_URL}/api/quote-requests/{{ $('Anfrage anlegen').first().json.quoteId }}/reject`
      }
      attachHeaderAuth(node, wristlink)
    }
    if (node.name?.startsWith("KI:") && anthropic) {
      attachHeaderAuth(node, anthropic)
    }
    if (
      (node.name === "Gmail Trigger" || node.name === "Email Trigger (IMAP)") &&
      gmail
    ) {
      node.name = "Gmail Trigger"
      node.type = "n8n-nodes-base.gmailTrigger"
      node.typeVersion = 1.2
      node.parameters = {
        pollTimes: { item: [{ mode: "everyMinute" }] },
        simple: false,
        filters: {
          q: 'in:inbox -subject:"Ihr WIRKUNG Wristlink Angebot" -subject:"Rueckfrage zu Ihrer WIRKUNG Wristlink Anfrage"',
        },
      }
      node.credentials = credRef(gmail)
    } else if (
      (node.name === "Gmail Trigger" || node.name === "Email Trigger (IMAP)") &&
      imap
    ) {
      node.name = "Email Trigger (IMAP)"
      node.type = "n8n-nodes-base.emailReadImap"
      node.typeVersion = 2
      node.parameters = {
        mailbox: "INBOX",
        postProcessAction: "nothing",
        options: {},
      }
      node.credentials = credRef(imap)
    }
    if (gmail && (node.name === "Gmail senden" || node.name === "Rueckfrage-Entwurf")) {
      node.credentials = credRef(gmail)
    }
  }

  if (gmail) {
    const imapConn = wf.connections["Email Trigger (IMAP)"]
    const gmailConn = wf.connections["Gmail Trigger"]
    if (imapConn) {
      wf.connections["Gmail Trigger"] = imapConn
      delete wf.connections["Email Trigger (IMAP)"]
    } else if (!gmailConn) {
      throw new Error("Keine Trigger-Connection im Workflow gefunden")
    }
    replaceTriggerRefs(wf, "Email Trigger (IMAP)", "Gmail Trigger")
  } else if (imap) {
    const gmailConn = wf.connections["Gmail Trigger"]
    const imapConn = wf.connections["Email Trigger (IMAP)"]
    if (gmailConn) {
      wf.connections["Email Trigger (IMAP)"] = gmailConn
      delete wf.connections["Gmail Trigger"]
    }
    replaceTriggerRefs(wf, "Gmail Trigger", "Email Trigger (IMAP)")
  }

  return wf
}

const report = { ok: [], manual: [] }

try {
  console.log("1/4 Credentials …")
  const wristlinkKey = process.env.WRISTLINK_API_KEY
  if (!wristlinkKey) throw new Error("WRISTLINK_API_KEY fehlt in .env.production.local")

  const wristlink = await findOrCreateCredential("Wristlink API", "httpHeaderAuth", {
    name: "Authorization",
    value: `Bearer ${wristlinkKey}`,
  })
  report.ok.push("Wristlink API Credential")

  let anthropic = null
  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = await findOrCreateCredential("Anthropic API (Wristlink)", "httpHeaderAuth", {
      name: "x-api-key",
      value: process.env.ANTHROPIC_API_KEY,
    })
    report.ok.push("Anthropic Credential")
  } else {
    report.manual.push("ANTHROPIC_API_KEY in .env.local → erneut ausführen")
  }

  let telegram = null
  if (process.env.TELEGRAM_BOT_TOKEN) {
    telegram = await findOrCreateCredential("Telegram Wristlink Bot", "telegramApi", {
      accessToken: process.env.TELEGRAM_BOT_TOKEN,
    })
    report.ok.push("Telegram Credential")
  } else {
    report.manual.push("TELEGRAM_BOT_TOKEN in .env.local → erneut ausführen")
  }
  if (!process.env.TELEGRAM_CHAT_ID) {
    report.manual.push("Bot /start schreiben, TELEGRAM_CHAT_ID in .env.local, configure erneut")
  }
  report.manual.push("Gmail senden + Rueckfrage-Entwurf: Gmail OAuth in n8n verbinden")

  let gmail = null
  let imap = null
  const credList = await api("GET", "/api/v1/credentials")
  gmail = (credList.data || []).find((c) => c.type === "gmailOAuth2")
  imap = (credList.data || []).find((c) => c.type === "imap")
  if (gmail) {
    console.log(`  Gmail vorhanden: ${gmail.name} (${gmail.id})`)
    report.ok.push(`Eingang per Gmail: ${gmail.name}`)
  } else if (imap) {
    console.log(`  IMAP vorhanden: ${imap.name} (${imap.id})`)
    report.ok.push(`Eingang per IMAP: ${imap.name}`)
  } else {
    report.manual.push("Gmail Trigger: Gmail OAuth in n8n verbinden")
  }
  if (gmail) {
    report.manual = report.manual.filter(
      (m) => !m.includes("Gmail senden + Rueckfrage-Entwurf"),
    )
    report.ok.push("Gmail Versand + Entwürfe")
  }

  console.log("2/4 Workflow laden …")
  const wf = await api("GET", `/api/v1/workflows/${WORKFLOW_ID}`)

  console.log("3/4 Workflow patchen …")
  patchWorkflow(wf, { wristlink, anthropic, telegram, gmail, imap })

  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || { executionOrder: "v1" },
  }

  console.log("4/4 Workflow speichern …")
  const updated = await api("PUT", `/api/v1/workflows/${WORKFLOW_ID}`, payload)

  console.log("\n=== Fertig ===")
  console.log(`Workflow: ${baseUrl}/workflow/${updated.id}`)
  for (const x of report.ok) console.log(`  ✓ ${x}`)
  for (const x of report.manual) console.log(`  ○ Manuell: ${x}`)

  if (report.manual.length === 0) {
    console.log("\nAlle automatischen Schritte erledigt. Workflow kann aktiviert werden.")
  }
} catch (e) {
  console.error("Fehler:", e.message)
  process.exit(1)
}
