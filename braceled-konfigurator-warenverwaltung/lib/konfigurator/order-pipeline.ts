import {
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STEPS,
  getActiveFulfillmentSteps,
  getNextFulfillmentStep,
  isFulfillmentComplete,
} from "@/lib/konfigurator/fulfillment-status"
import type { FulfillmentStatus, QuoteRequest, QuoteStatus } from "@/lib/konfigurator/types"

export type WarehousePipelineStepKey = "material_zuweisen" | "unterlagen_drucken"

export type OrderPipelineStepKey =
  | "freigabe"
  | "geldeingang"
  | FulfillmentStatus
  | WarehousePipelineStepKey

export type OrderPipelineStep = {
  key: OrderPipelineStepKey
  label: string
}

export type WarehousePipelineContext = {
  allocationComplete: boolean
  packingDocsPrinted: boolean
}

export function getOrderPipelineSteps(hasDruck: boolean): OrderPipelineStep[] {
  const fulfillmentSteps = getActiveFulfillmentSteps(hasDruck)
  const verpacktIdx = fulfillmentSteps.indexOf("verpackt")
  const beforeVerpackt = fulfillmentSteps.slice(0, verpacktIdx)
  const fromVerpackt = fulfillmentSteps.slice(verpacktIdx)

  return [
    { key: "freigabe", label: "Freigabe" },
    { key: "geldeingang", label: "Geldeingang" },
    ...beforeVerpackt.map((key) => ({
      key,
      label: FULFILLMENT_STATUS_LABELS[key],
    })),
    { key: "material_zuweisen", label: "Material zuweisen" },
    { key: "unterlagen_drucken", label: "Lagerunterlagen drucken" },
    ...fromVerpackt.map((key) => ({
      key,
      label: FULFILLMENT_STATUS_LABELS[key],
    })),
  ]
}

export function isWarehousePipelineStep(
  key: OrderPipelineStepKey | null,
): key is WarehousePipelineStepKey {
  return key === "material_zuweisen" || key === "unterlagen_drucken"
}

function fulfillmentIndex(
  status: FulfillmentStatus | null | undefined,
  hasDruck: boolean,
): number {
  if (!status) return -1
  return getActiveFulfillmentSteps(hasDruck).indexOf(status)
}

export function getOrderPipelinePhase(
  quote: Pick<QuoteRequest, "status" | "fulfillment_status" | "packing_docs_printed_at">,
  hasDruck: boolean,
  warehouse: WarehousePipelineContext,
): OrderPipelineStepKey | null {
  if (["rejected", "expired", "cancelled"].includes(quote.status)) return null
  if (quote.status === "draft" || quote.status === "submitted") return "freigabe"
  if (quote.status === "approved" || quote.status === "payment_pending") return "geldeingang"

  if (quote.status === "paid") {
    const fulfillmentSteps = getActiveFulfillmentSteps(hasDruck)
    const vorbereitetIdx = fulfillmentSteps.indexOf("vorbereitet")
    const verpacktIdx = fulfillmentSteps.indexOf("verpackt")
    const currentIdx = fulfillmentIndex(quote.fulfillment_status, hasDruck)

    if (currentIdx < vorbereitetIdx) {
      if (!quote.fulfillment_status) return "angenommen"
      const next = getNextFulfillmentStep(quote.fulfillment_status, hasDruck)
      if (next) return next
      return quote.fulfillment_status
    }

    if (currentIdx < verpacktIdx) {
      if (!warehouse.allocationComplete) return "material_zuweisen"
      if (!warehouse.packingDocsPrinted) return "unterlagen_drucken"
      return "verpackt"
    }

    if (isFulfillmentComplete(quote.fulfillment_status, hasDruck)) return null
    const next = getNextFulfillmentStep(quote.fulfillment_status, hasDruck)
    if (next) return next
    return quote.fulfillment_status
  }

  return null
}

export function getOrderPipelineProgressIndex(
  quote: Pick<QuoteRequest, "status" | "fulfillment_status" | "packing_docs_printed_at">,
  hasDruck: boolean,
  warehouse: WarehousePipelineContext,
): number {
  const steps = getOrderPipelineSteps(hasDruck)
  const phase = getOrderPipelinePhase(quote, hasDruck, warehouse)

  if (quote.status === "submitted") return 0
  if (quote.status === "approved" || quote.status === "payment_pending") return 1

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
