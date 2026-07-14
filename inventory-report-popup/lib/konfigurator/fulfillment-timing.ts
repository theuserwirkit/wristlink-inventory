import { daysUntilEvent } from "@/lib/konfigurator/availability-stress"
import { isFulfillmentComplete } from "@/lib/konfigurator/fulfillment-status"
import {
  LIEFERPAKET_OPTIONS,
  normalizeLieferpaket,
  werktageToCalendarDays,
} from "@/lib/konfigurator/lieferpaket"
import type { QuoteConfig, QuoteRequest } from "@/lib/konfigurator/types"

/** Anlieferung bis 2 Kalendertage vor Event (UPS/TNT) */
export const ANLIEFERUNG_TAGE_VOR_EVENT = 2

export type FulfillmentTimingUrgency = "overdue" | "due_today" | "due_soon" | "ok" | "unknown"

export type FulfillmentTiming = {
  dueDate: Date | null
  daysUntilDue: number | null
  urgency: FulfillmentTimingUrgency
  label: string
  detail: string | null
}

type TimingQuote = Pick<QuoteRequest, "config_json" | "paid_at" | "submitted_at" | "fulfillment_status">

function parseDateOnly(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`)
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function minTageForConfig(config: QuoteConfig): number {
  const paket = normalizeLieferpaket(config)
  const opt = LIEFERPAKET_OPTIONS.find((o) => o.value === paket)
  return opt?.minTage ?? werktageToCalendarDays(20)
}

export function getFulfillmentDueDate(quote: TimingQuote): Date | null {
  const config = quote.config_json
  const paket = normalizeLieferpaket(config)
  const fulfillmentStatus = quote.fulfillment_status

  if (config.von && fulfillmentStatus && ["versandt", "ruecksendung_angekommen"].includes(fulfillmentStatus)) {
    const eventEnd = config.bis || config.von
    const returnDue = addCalendarDays(parseDateOnly(eventEnd), werktageToCalendarDays(3))
    return returnDue
  }

  if (config.von && paket !== "eil") {
    return addCalendarDays(parseDateOnly(config.von), -ANLIEFERUNG_TAGE_VOR_EVENT)
  }

  const anchorIso = quote.paid_at || quote.submitted_at
  if (!anchorIso) return null

  const anchor = parseDateOnly(anchorIso)
  if (paket === "eil") {
    return addCalendarDays(anchor, 2)
  }

  return addCalendarDays(anchor, minTageForConfig(config))
}

export function getFulfillmentTiming(quote: TimingQuote, from = new Date()): FulfillmentTiming {
  const dueDate = getFulfillmentDueDate(quote)
  if (!dueDate) {
    return {
      dueDate: null,
      daysUntilDue: null,
      urgency: "unknown",
      label: "Kein Termin",
      detail: null,
    }
  }

  const fromNorm = parseDateOnly(from.toISOString())
  const daysUntilDue = Math.ceil((dueDate.getTime() - fromNorm.getTime()) / (1000 * 60 * 60 * 24))

  let urgency: FulfillmentTimingUrgency
  let label: string

  if (daysUntilDue < 0) {
    urgency = "overdue"
    const overdueDays = Math.abs(daysUntilDue)
    label =
      overdueDays === 1
        ? "Überfällig seit 1 Tag"
        : `Überfällig seit ${overdueDays} Tagen`
  } else if (daysUntilDue === 0) {
    urgency = "due_today"
    label = "Heute fällig"
  } else if (daysUntilDue <= 3) {
    urgency = "due_soon"
    label = daysUntilDue === 1 ? "Fällig morgen" : `Fällig in ${daysUntilDue} Tagen`
  } else {
    urgency = "ok"
    label = `Fällig in ${daysUntilDue} Tagen`
  }

  const config = quote.config_json
  const paket = normalizeLieferpaket(config)
  let detail: string | null = null

  if (config.von) {
    const eventLabel = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parseDateOnly(config.von))

    if (quote.fulfillment_status && ["versandt", "ruecksendung_angekommen"].includes(quote.fulfillment_status)) {
      detail = `Rücksendung bis ${formatDeDate(dueDate)} (Eventende ${eventLabel})`
    } else if (paket === "eil") {
      detail = `Eilauftrag · Event ${eventLabel}`
    } else {
      detail = `Anlieferung bis ${formatDeDate(dueDate)} (Event ${eventLabel})`
    }
  } else {
    detail = `Zieltermin ${formatDeDate(dueDate)}`
  }

  return { dueDate, daysUntilDue, urgency, label, detail }
}

function formatDeDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

/** Kalendertage UPS/TNT-Transit (DE) vor Anlieferung beim Kunden */
export const VERSAND_TRANSIT_KALENDERTAGE = 1

/** Spätestes Anlieferdatum beim Kunden (unabhängig vom Fulfillment-Status). */
export function getAnlieferungDeadlineForPacking(quote: TimingQuote): Date | null {
  const config = quote.config_json
  const paket = normalizeLieferpaket(config)

  if (config.von && paket !== "eil") {
    return addCalendarDays(parseDateOnly(config.von), -ANLIEFERUNG_TAGE_VOR_EVENT)
  }

  const anchorIso = quote.paid_at || quote.submitted_at
  if (!anchorIso) return null

  const anchor = parseDateOnly(anchorIso)
  if (paket === "eil") {
    return addCalendarDays(anchor, 2)
  }

  return addCalendarDays(anchor, minTageForConfig(config))
}

/** Spätestes Versanddatum aus dem Lager (Transit vor Anlieferung). */
export function getVersandDeadlineForPacking(quote: TimingQuote): Date | null {
  const anlieferung = getAnlieferungDeadlineForPacking(quote)
  if (!anlieferung) return null

  const paket = normalizeLieferpaket(quote.config_json)
  const transitDays = paket === "eil" ? 1 : VERSAND_TRANSIT_KALENDERTAGE
  return addCalendarDays(anlieferung, -transitDays)
}

export function formatPackingDeadline(date: Date | null): string | null {
  return date ? formatDeDate(date) : null
}

export function isFulfillmentWorkOpen(
  quote: Pick<QuoteRequest, "status" | "fulfillment_status" | "config_json">,
): boolean {
  if (quote.status !== "paid") return false
  const hasDruck = Boolean(quote.config_json.druck)
  return !isFulfillmentComplete(quote.fulfillment_status, hasDruck)
}

export function compareFulfillmentUrgency(
  a: TimingQuote,
  b: TimingQuote,
  from = new Date(),
): number {
  const timingA = getFulfillmentTiming(a, from)
  const timingB = getFulfillmentTiming(b, from)

  const daysA = timingA.daysUntilDue ?? Number.POSITIVE_INFINITY
  const daysB = timingB.daysUntilDue ?? Number.POSITIVE_INFINITY
  if (daysA !== daysB) return daysA - daysB

  const eventA = a.config_json.von ? daysUntilEvent(a.config_json.von, from) : Number.POSITIVE_INFINITY
  const eventB = b.config_json.von ? daysUntilEvent(b.config_json.von, from) : Number.POSITIVE_INFINITY
  if (eventA !== eventB) return eventA - eventB

  const paidA = a.paid_at ? new Date(a.paid_at).getTime() : Number.POSITIVE_INFINITY
  const paidB = b.paid_at ? new Date(b.paid_at).getTime() : Number.POSITIVE_INFINITY
  return paidA - paidB
}
