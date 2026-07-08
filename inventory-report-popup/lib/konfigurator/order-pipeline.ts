import {
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STEPS,
  getActiveFulfillmentSteps,
  getNextFulfillmentStep,
  isFulfillmentComplete,
} from "@/lib/konfigurator/fulfillment-status"
import type { FulfillmentStatus, QuoteRequest, QuoteStatus } from "@/lib/konfigurator/types"

export type OrderPipelineStepKey =
  | "freigabe"
  | "geldeingang"
  | FulfillmentStatus

export type OrderPipelineStep = {
  key: OrderPipelineStepKey
  label: string
}

export function getOrderPipelineSteps(hasDruck: boolean): OrderPipelineStep[] {
  const fulfillmentSteps = getActiveFulfillmentSteps(hasDruck)
  return [
    { key: "freigabe", label: "Freigabe" },
    { key: "geldeingang", label: "Geldeingang" },
    ...fulfillmentSteps.map((key) => ({
      key,
      label: FULFILLMENT_STATUS_LABELS[key],
    })),
  ]
}

function fulfillmentIndex(
  status: FulfillmentStatus | null | undefined,
  hasDruck: boolean,
): number {
  if (!status) return -1
  return getActiveFulfillmentSteps(hasDruck).indexOf(status)
}

export function getOrderPipelinePhase(
  quote: Pick<QuoteRequest, "status" | "fulfillment_status">,
  hasDruck: boolean,
): OrderPipelineStepKey | null {
  if (["rejected", "expired", "cancelled"].includes(quote.status)) return null
  if (quote.status === "draft" || quote.status === "submitted") return "freigabe"
  if (quote.status === "approved" || quote.status === "payment_pending") return "geldeingang"
  if (quote.status === "paid") {
    if (!quote.fulfillment_status) return "angenommen"
    const next = getNextFulfillmentStep(quote.fulfillment_status, hasDruck)
    if (next) return next
    if (isFulfillmentComplete(quote.fulfillment_status, hasDruck)) return null
    return quote.fulfillment_status
  }
  return null
}

export function getOrderPipelineProgressIndex(
  quote: Pick<QuoteRequest, "status" | "fulfillment_status">,
  hasDruck: boolean,
): number {
  const steps = getOrderPipelineSteps(hasDruck)
  const phase = getOrderPipelinePhase(quote, hasDruck)

  if (quote.status === "submitted") return 0
  if (quote.status === "approved" || quote.status === "payment_pending") return 1
  if (quote.status === "paid") {
    const fulfillmentIdx = fulfillmentIndex(quote.fulfillment_status, hasDruck)
    if (fulfillmentIdx < 0) return 2
    const stepKey = getActiveFulfillmentSteps(hasDruck)[fulfillmentIdx]
    const idx = steps.findIndex((s) => s.key === stepKey)
    return idx >= 0 ? idx : 2
  }
  if (phase) {
    const idx = steps.findIndex((s) => s.key === phase)
    return idx >= 0 ? idx : 0
  }
  return steps.length - 1
}

export function isOrderPipelineComplete(
  quote: Pick<QuoteRequest, "status" | "fulfillment_status">,
  hasDruck: boolean,
): boolean {
  return quote.status === "paid" && isFulfillmentComplete(quote.fulfillment_status, hasDruck)
}

export function isPreFulfillmentStatus(status: QuoteStatus): boolean {
  return ["submitted", "approved", "payment_pending"].includes(status)
}

export { FULFILLMENT_STEPS }
