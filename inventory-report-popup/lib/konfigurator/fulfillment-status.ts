import type { FulfillmentStatus } from "@/lib/konfigurator/types"

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  angenommen: "Angenommen",
  vorbereitet: "Vorbereitet",
  bedruckt: "Bedruckt",
  verpackt: "Verpackt",
  versand_beauftragt: "Versand beauftragt",
  versandt: "Versandt",
  ruecksendung_angekommen: "Rücksendung angekommen",
  zurueckgepackt: "Zurückgepackt",
}

export const FULFILLMENT_STEPS: FulfillmentStatus[] = [
  "angenommen",
  "vorbereitet",
  "bedruckt",
  "verpackt",
  "versand_beauftragt",
  "versandt",
  "ruecksendung_angekommen",
  "zurueckgepackt",
]

export function fulfillmentTemplateKey(status: FulfillmentStatus): string {
  return `fulfillment_${status}`
}

export function getActiveFulfillmentSteps(hasDruck: boolean): FulfillmentStatus[] {
  if (hasDruck) return FULFILLMENT_STEPS
  return FULFILLMENT_STEPS.filter((s) => s !== "bedruckt")
}

export function getNextFulfillmentStep(
  current: FulfillmentStatus | null | undefined,
  hasDruck: boolean,
): FulfillmentStatus | null {
  const steps = getActiveFulfillmentSteps(hasDruck)
  if (!current) return steps[0] ?? null
  const idx = steps.indexOf(current)
  if (idx < 0 || idx >= steps.length - 1) return null
  return steps[idx + 1]
}

export function isFulfillmentComplete(
  current: FulfillmentStatus | null | undefined,
  hasDruck: boolean,
): boolean {
  const steps = getActiveFulfillmentSteps(hasDruck)
  if (!current) return false
  return current === steps[steps.length - 1]
}
