import { NextRequest } from "next/server"
import { constructStripeEvent } from "@/lib/konfigurator/stripe"
import { processPaidQuote } from "@/lib/quotes-internal"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 })
  }

  let event
  try {
    event = constructStripeEvent(payload, signature)
  } catch (err) {
    console.error("Stripe webhook signature failed:", err)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const quoteId = session.metadata?.quote_request_id

    if (quoteId) {
      try {
        const result = await processPaidQuote(Number(quoteId), event.id)
        if (!("alreadyProcessed" in result) && result.success === false) {
          // Fachlicher Fehler (z. B. Quote nicht gefunden/ungültiger Status): geloggt,
          // aber weiterhin 200 an Stripe, da ein Retry das Ergebnis nicht ändern würde.
          console.error(`Stripe webhook: processPaidQuote failed for quote #${quoteId}:`, result.error)
        }
      } catch (err) {
        // B-09: Fehler (inkl. PK-Konflikt bei bereits verarbeitetem Event) hier abfangen,
        // damit Stripe kein unnötiges Retry auslöst; Ursache bleibt im Server-Log sichtbar.
        console.error(`Stripe webhook: processPaidQuote threw for quote #${quoteId}:`, err)
      }
    }
  }

  return Response.json({ received: true })
}
