"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderPipelineStepper } from "@/components/admin/order-pipeline-stepper"
import { QuoteApprovalActions } from "@/components/admin/quote-approval-actions"
import { QuotePaymentActions } from "@/components/admin/quote-payment-actions"
import { QuoteFulfillmentWorkflow } from "@/components/admin/quote-fulfillment-workflow"
import {
  getOrderPipelinePhase,
  getOrderPipelineProgressIndex,
  getOrderPipelineSteps,
  isOrderPipelineComplete,
} from "@/lib/konfigurator/order-pipeline"
import type { QuoteFulfillmentEvent, QuoteRequest } from "@/lib/konfigurator/types"

function buildOrderContext(quote: QuoteRequest): string {
  const config = quote.config_json
  const parts: string[] = [`${config.menge}× ${config.produkt}`, config.modus]
  if (config.modus === "miete" && config.von) {
    parts.push(`${config.von} – ${config.bis || config.von}`)
  }
  parts.push(config.druck ? "mit Druck" : "ohne Druck")
  if (config.szenario) parts.push(config.szenario)
  return parts.join(" · ")
}

export function QuoteOrderWorkflow({
  quote,
  leadEmail,
  events,
  stripeConfigured,
}: {
  quote: QuoteRequest
  leadEmail: string
  events: QuoteFulfillmentEvent[]
  stripeConfigured: boolean
}) {
  if (["rejected", "expired", "cancelled", "draft"].includes(quote.status)) {
    return null
  }

  const hasDruck = Boolean(quote.config_json.druck)
  const steps = getOrderPipelineSteps(hasDruck)
  const currentIndex = getOrderPipelineProgressIndex(quote, hasDruck)
  const phase = getOrderPipelinePhase(quote, hasDruck)
  const complete = isOrderPipelineComplete(quote, hasDruck)
  const orderContext = buildOrderContext(quote)

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle>Auftragsabwicklung</CardTitle>
          <span className="text-sm text-muted-foreground">{leadEmail}</span>
        </div>
        <p className="text-sm text-muted-foreground">{orderContext}</p>
        {phase && !complete && (
          <p className="text-xs text-muted-foreground">
            Aktueller Schritt: {steps[currentIndex]?.label ?? phase}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <OrderPipelineStepper steps={steps} currentIndex={currentIndex} />

        {quote.status === "submitted" && (
          <QuoteApprovalActions
            quoteId={quote.id}
            status={quote.status}
            source={quote.source}
            stripeConfigured={stripeConfigured}
            offerPdfFilename={quote.offer_pdf_filename}
            embedded
          />
        )}

        {(quote.status === "approved" || quote.status === "payment_pending") && (
          <>
            <QuotePaymentActions
              quoteId={quote.id}
              status={quote.status}
              stripePaymentLinkUrl={quote.stripe_payment_link_url}
              offerPdfFilename={quote.offer_pdf_filename}
              embedded
            />
            <QuoteApprovalActions
              quoteId={quote.id}
              status={quote.status}
              source={quote.source}
              stripeConfigured={stripeConfigured}
              offerPdfFilename={quote.offer_pdf_filename}
              embedded
            />
          </>
        )}

        {quote.status === "paid" && leadEmail && (
          <QuoteFulfillmentWorkflow
            quote={quote}
            leadEmail={leadEmail}
            events={events}
            embedded
          />
        )}
      </CardContent>
    </Card>
  )
}
