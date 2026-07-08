import Stripe from "stripe"
import { getAppBaseUrl } from "@/lib/konfigurator/lead-auth"
import { getStripeChargeAmount } from "@/lib/pricing/display"
import type { QuoteRequest } from "@/lib/konfigurator/types"

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
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe()
  const price = quote.price_snapshot_json as { gesamt_netto?: number; gesamt_brutto?: number }
  const amountCents = Math.round(getStripeChargeAmount({ gesamt_brutto: price.gesamt_brutto || 0 }) * 100)

  if (amountCents <= 0) {
    throw new Error("Ungültiger Betrag für Stripe")
  }

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
            name: `WIRKUNG Wristlink Angebot #${quote.id}`,
            description: `Netto ${(price.gesamt_netto || 0).toFixed(2)} EUR zzgl. MwSt. – Anfrage ${quote.public_token}`,
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
