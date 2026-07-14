import { daysUntilEvent } from "@/lib/konfigurator/availability-stress"
import { isFulfillmentComplete } from "@/lib/konfigurator/fulfillment-status"
import {
  LIEFERPAKET_OPTIONS,
  normalizeFlexRueckgabe,
  normalizeLieferpaket,
  werktageToCalendarDays,
} from "@/lib/konfigurator/lieferpaket"
import { normalizeLieferart } from "@/lib/konfigurator/product-info"
import type { QuoteConfig, QuoteRequest } from "@/lib/konfigurator/types"
import { addDays, subtractWorkdays } from "@/lib/utils/date"

/** @deprecated Nur noch für ältere Fulfillment-Fälligkeit – Packlisten nutzen Werktage */
export const ANLIEFERUNG_TAGE_VOR_EVENT = 2

/** Standard: Anlieferung X Werktage vor Event */
export const PACKING_ANLIEFERUNG_WERKTAGE_STANDARD = 2
/** Flex: frühere Anlieferung laut Lieferpaket */
export const PACKING_ANLIEFERUNG_WERKTAGE_FLEX = 5
/** Kurierfahrt (Eil/Overnight): knapper Anlieferungstermin */
export const PACKING_ANLIEFERUNG_WERKTAGE_KURIER = 1

/** UPS/TNT-Standard: Kalendertage Versandlaufzeit vor Anlieferung */
export const PACKING_VERSAND_TRANSIT_KALENDERTAGE = 3
/** Flex: zusätzlicher Puffer auf der Versandseite */
export const PACKING_VERSAND_TRANSIT_FLEX_EXTRA = 2
/** Kurierfahrt: kurze Laufzeit */
export const PACKING_VERSAND_TRANSIT_KURIER = 1

export type PackingDeliveryMode = "standard" | "flex" | "kurier"

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
  return addDays(date, days)
}

function minTageForConfig(config: QuoteConfig): number {
  const paket = normalizeLieferpaket(config)
  const opt = LIEFERPAKET_OPTIONS.find((o) => o.value === paket)
  return opt?.minTage ?? werktageToCalendarDays(20)
}

export function isKurierfahrt(config: QuoteConfig): boolean {
  return (
    normalizeLieferpaket(config) === "eil" || normalizeLieferart(config) === "overnight"
  )
}

export function resolvePackingDeliveryMode(config: QuoteConfig): PackingDeliveryMode {
  if (isKurierfahrt(config)) return "kurier"
  if (normalizeFlexRueckgabe(config)) return "flex"
  return "standard"
}

function anlieferungWerktageForMode(mode: PackingDeliveryMode): number {
  switch (mode) {
    case "kurier":
      return PACKING_ANLIEFERUNG_WERKTAGE_KURIER
    case "flex":
      return PACKING_ANLIEFERUNG_WERKTAGE_FLEX
    default:
      return PACKING_ANLIEFERUNG_WERKTAGE_STANDARD
  }
}

function versandTransitKalendertageForMode(mode: PackingDeliveryMode): number {
  switch (mode) {
    case "kurier":
      return PACKING_VERSAND_TRANSIT_KURIER
    case "flex":
      return PACKING_VERSAND_TRANSIT_KALENDERTAGE + PACKING_VERSAND_TRANSIT_FLEX_EXTRA
    default:
      return PACKING_VERSAND_TRANSIT_KALENDERTAGE
  }
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

/** Spätestes Anlieferdatum beim Kunden (Werktage vor Event, Flex/Kurier separat). */
export function getAnlieferungDeadlineForPacking(quote: TimingQuote): Date | null {
  const config = quote.config_json
  const mode = resolvePackingDeliveryMode(config)

  if (config.von) {
    const eventDate = parseDateOnly(config.von)
    return subtractWorkdays(eventDate, anlieferungWerktageForMode(mode))
  }

  const anchorIso = quote.paid_at || quote.submitted_at
  if (!anchorIso) return null

  const anchor = parseDateOnly(anchorIso)
  if (mode === "kurier") {
    return addCalendarDays(anchor, 2)
  }

  return addCalendarDays(anchor, minTageForConfig(config))
}

/** Spätestes Versanddatum aus dem Lager (Kalendertage Transit vor Anlieferung). */
export function getVersandDeadlineForPacking(quote: TimingQuote): Date | null {
  const anlieferung = getAnlieferungDeadlineForPacking(quote)
  if (!anlieferung) return null

  const mode = resolvePackingDeliveryMode(quote.config_json)
  return addCalendarDays(anlieferung, -versandTransitKalendertageForMode(mode))
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
