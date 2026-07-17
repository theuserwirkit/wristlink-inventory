#!/usr/bin/env npx tsx
/**
 * Prüft URL-Handling in allen typischen Kunden-Mail-Szenarien.
 */
import { readFileSync } from "fs"
import { join } from "path"
import { buildEmailBodies, normalizeBrokenUrls } from "../lib/konfigurator/email-html"
import { buildQuoteTemplateVars, renderTemplateText } from "../lib/konfigurator/email-template-render"
import type { QuoteRequest } from "../lib/konfigurator/types"

const STRIPE_URL = "https://checkout.stripe.com/c/pay/cs_test_abc123"

const sampleQuote = {
  id: 7,
  public_token: "ff466ac2-2483-4ba6-a130-437c20e36a7f",
  stripe_payment_link_url: STRIPE_URL,
  price_snapshot_json: { gesamt_netto: 3169, gesamt_brutto: 3771.11 },
  config_json: {
    kontaktName: "Max",
    menge: 500,
    von: "2026-07-20",
    bis: "2026-07-21",
    technikerAdresse: "Berlin, Messehalle 3",
    produkt: "armband",
    modus: "miete",
    druck: false,
    gruppen: 1,
    station: "eco",
    stationModus: "miete",
    lieferzeit: "regulaer",
    land: "DE",
  },
} as unknown as QuoteRequest

const TEMPLATE_KEYS_WITH_STATUS = [
  "quote_approved_stripe",
  "quote_approved_manual",
  "quote_paid",
  "fulfillment_vorbereitet",
  "fulfillment_bedruckt",
  "fulfillment_verpackt",
  "fulfillment_versand_beauftragt",
  "fulfillment_versandt",
  "fulfillment_ruecksendung_angekommen",
  "fulfillment_zurueckgepackt",
]

function loadTemplateBody(templateKey: string): string {
  const file = join(__dirname, "migration", "17-email-templates-angebot.sql")
  const sql = readFileSync(file, "utf8")
  const marker = `WHERE template_key = '${templateKey}'`
  if (sql.includes(marker)) {
    const chunk = sql.split(marker)[0]
    const bodyMatch = chunk.match(/body = '([\s\S]*)',\s+updated_at/s)
    if (bodyMatch) return bodyMatch[1].replace(/''/g, "'")
  }
  const fallback = join(__dirname, "migration", "15-email-templates-du.sql")
  const fallbackSql = readFileSync(fallback, "utf8")
  const parts = fallbackSql.split(marker)
  if (parts.length < 2) throw new Error(`Template ${templateKey} nicht gefunden`)
  const chunk = parts[0]
  const bodyMatch = chunk.match(/body = '([\s\S]*)',\s+updated_at/s)
  if (!bodyMatch) throw new Error(`Body für ${templateKey} nicht gefunden`)
  return bodyMatch[1].replace(/''/g, "'")
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function checkBodies(label: string, text: string, statusUrl: string) {
  const broken = `Status:\n${statusUrl.split("/angebot")[0]}\n/angebot/${sampleQuote.public_token}`
  const normalized = normalizeBrokenUrls(broken)
  assert(normalized.includes(statusUrl), `${label}: normalizeBrokenUrls schlägt fehl`)

  const { text: plain, html } = buildEmailBodies(text)
  assert(
    plain.includes(`<${statusUrl}>`) || plain.includes(statusUrl),
    `${label}: Status-URL fehlt im Plain-Text`,
  )
  assert(html.includes(`href="${statusUrl}"`), `${label}: Status-URL fehlt im HTML-href`)
  assert(html.includes("Angebot und Status öffnen"), `${label}: HTML-Linktext für Status fehlt`)
  if (text.includes(STRIPE_URL)) {
    assert(html.includes("Jetzt online bezahlen"), `${label}: Stripe-Linktext fehlt`)
  }
}

let failed = 0
const vars = buildQuoteTemplateVars(sampleQuote, "kunde@example.com")

for (const key of TEMPLATE_KEYS_WITH_STATUS) {
  try {
    const body = renderTemplateText(loadTemplateBody(key), vars)
    checkBodies(key, body, vars.status_url)
    console.log(`OK  ${key}`)
  } catch (error) {
    failed++
    console.error(`FAIL ${key}:`, error instanceof Error ? error.message : error)
  }
}

try {
  const submitted = `Status und Angebot:\n${vars.status_url}`
  checkBodies("customer_submitted", submitted, vars.status_url)
  console.log("OK  customer_submitted")
} catch (error) {
  failed++
  console.error("FAIL customer_submitted:", error instanceof Error ? error.message : error)
}

if (failed > 0) {
  console.error(`\n${failed} Prüfung(en) fehlgeschlagen`)
  process.exit(1)
}

console.log("\nAlle E-Mail-URL-Prüfungen bestanden.")
