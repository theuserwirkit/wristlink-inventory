import "server-only"

import Stripe from "stripe"
import { getAppBaseUrl } from "@/lib/konfigurator/lead-auth"
import { getLieferpaketLabel, normalizeLieferpaket } from "@/lib/konfigurator/lieferpaket"
import {
  modusAnzeige,
  PRODUKT_ANZEIGE,
  STATION_OPTIONS,
} from "@/lib/konfigurator/product-info"
import { getStripeChargeAmount } from "@/lib/pricing/display"
import type { QuoteConfig, QuoteRequest } from "@/lib/konfigurator/types"

const STRIPE_NAME_MAX = 250
const STRIPE_DESCRIPTION_MAX = 500

export type StripeCheckoutCustomer = {
  name?: string | null
  firma?: string | null
}

function truncateStripeText(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function formatGermanDate(iso: string): string {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}.${month}.${year}`
}

function formatEventDate(config: QuoteConfig): string {
  if (!config.von) return "–"
  const von = formatGermanDate(config.von)
  if (config.bis && config.bis !== config.von) {
    return `${von} – ${formatGermanDate(config.bis)}`
  }
  return von
}

function resolveCustomerLabel(
  config: QuoteConfig,
  customer?: StripeCheckoutCustomer,
): string {
  const firma = config.kontaktFirma?.trim() || customer?.firma?.trim()
  const name = config.kontaktName?.trim() || customer?.name?.trim()
  if (firma && name) return `${firma} (${name})`
  if (firma) return firma
  if (name) return name
  return "–"
}

function formatInklLeistungen(config: QuoteConfig): string {
  const parts: string[] = []

  const station = config.station || "keine"
  if (station === "keine") {
    parts.push("ohne Basis")
  } else {
    const stationLabel =
      STATION_OPTIONS.find((option) => option.value === station)?.label ?? station
    parts.push(stationLabel)
  }

  if (config.druck) {
    parts.push(config.druckArt === "vollflaechig" ? "Vollflächendruck" : "Druck")
  } else {
    parts.push("ohne Druck")
  }

  parts.push(config.techniker ? "Techniker" : "ohne Techniker")

  const lieferpaket = normalizeLieferpaket(config)
  parts.push(
    lieferpaket === "regulaer" ? "reguläre Lieferung" : getLieferpaketLabel(lieferpaket),
  )

  return `inkl. ${parts.join(" · ")}`
}

/** Lesbare Produktzeilen für Stripe Checkout und Rechnung */
export function buildStripeCheckoutLabels(
  quote: QuoteRequest,
  customer?: StripeCheckoutCustomer,
): { name: string; description: string } {
  const config = quote.config_json
  const produkt = PRODUKT_ANZEIGE[config.produkt] ?? config.produkt
  const customerLabel = resolveCustomerLabel(config, customer)

  const description = truncateStripeText(
    [
      `Angebot #${quote.id}`,
      `Kunde: ${customerLabel}`,
      `${config.menge.toLocaleString("de-DE")}× ${produkt} (${modusAnzeige(config.modus)})`,
      formatInklLeistungen(config),
      `Eventdatum: ${formatEventDate(config)}`,
    ].join("\n"),
    STRIPE_DESCRIPTION_MAX,
  )

  const name = truncateStripeText(
    customerLabel !== "–"
      ? `WIRKUNG Wristlink · Angebot #${quote.id} · ${customerLabel}`
      : `WIRKUNG Wristlink · Angebot #${quote.id}`,
    STRIPE_NAME_MAX,
  )

  return { name, description }
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY nicht gesetzt")
  return new Stripe(key, { apiVersion: "2026-06-24.dahlia" })
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export async function createCheckoutSessionForQuote(
  quote: QuoteRequest,
  customerEmail: string,
  customer?: StripeCheckoutCustomer,
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe()
  const price = quote.price_snapshot_json as { gesamt_netto?: number; gesamt_brutto?: number }
  const amountCents = Math.round(getStripeChargeAmount({ gesamt_brutto: price.gesamt_brutto || 0 }) * 100)

  if (amountCents <= 0) {
    throw new Error("Ungültiger Betrag für Stripe")
  }

  const { name, description } = buildStripeCheckoutLabels(quote, customer)
  const baseUrl = getAppBaseUrl()
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    tax_id_collection: { enabled: true },
    invoice_creation: { enabled: true },
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name,
            description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      quote_request_id: String(quote.id),
      public_token: quote.public_token,
    },
    success_url: `${baseUrl}/angebot/${quote.public_token}?paid=1`,
    cancel_url: `${baseUrl}/angebot/${quote.public_token}?cancelled=1`,
  })

  if (!session.url) {
    throw new Error("Stripe Checkout URL fehlt")
  }

  return { sessionId: session.id, url: session.url }
}

export function constructStripeEvent(payload: string, signature: string): Stripe.Event {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET nicht gesetzt")
  return stripe.webhooks.constructEvent(payload, signature, secret)
}
