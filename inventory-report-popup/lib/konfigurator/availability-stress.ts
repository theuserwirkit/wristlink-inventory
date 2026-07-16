export type AvailabilityStressLevel = "green" | "yellow" | "red"

export type AvailabilityStress = {
  stressLevel: AvailabilityStressLevel
  stressScore: number
  stressLabel: string
}

export const LONG_LEAD_MONTHS = 4
export const SHORT_LEAD_WEEKS = 3
export const SHORT_LEAD_DAYS = SHORT_LEAD_WEEKS * 7
/** Unterhalb dieser Tage bis zum Event: Lieferhinweis im Konfigurator */
export const SHORT_DELIVERY_WARNING_DAYS = 14

export function monthsUntilEvent(eventDateIso: string, from = new Date()): number {
  const target = new Date(`${eventDateIso.slice(0, 10)}T12:00:00`)
  const months =
    (target.getFullYear() - from.getFullYear()) * 12 + (target.getMonth() - from.getMonth())
  const dayFraction = (target.getDate() - from.getDate()) / 30
  return months + dayFraction
}

export function daysUntilEvent(eventDateIso: string, from = new Date()): number {
  const target = new Date(`${eventDateIso.slice(0, 10)}T12:00:00`)
  const fromNorm = new Date(`${from.toISOString().slice(0, 10)}T12:00:00`)
  return Math.ceil((target.getTime() - fromNorm.getTime()) / (1000 * 60 * 60 * 24))
}

function applyShortLeadFloor(
  stress: AvailabilityStress,
  daysUntil: number | null,
  langfristig: boolean,
): AvailabilityStress {
  if (langfristig || daysUntil === null || daysUntil >= SHORT_LEAD_DAYS) return stress
  if (stress.stressLevel === "green") {
    return {
      stressLevel: "yellow",
      stressScore: Math.max(stress.stressScore, 42),
      stressLabel: "Kurzer Vorlauf – nur Lagerbestand",
    }
  }
  return stress
}

export function computeAvailabilityStress(input: {
  verfuegbar: boolean
  frei: number | null
  menge: number
  bestand: number | null
  belegt: number | null
  pendingInquiries: number
  monthsUntilEvent: number | null
  daysUntilEvent?: number | null
  langfristig?: boolean
}): AvailabilityStress {
  const {
    verfuegbar,
    frei,
    menge,
    bestand,
    belegt,
    pendingInquiries,
    monthsUntilEvent,
    daysUntilEvent: daysUntil,
    langfristig = false,
  } = input

  if (langfristig || (monthsUntilEvent !== null && monthsUntilEvent >= LONG_LEAD_MONTHS)) {
    return {
      stressLevel: "green",
      stressScore: 12,
      stressLabel: "Entspannt – ausreichend Vorlauf",
    }
  }

  const free = Math.max(0, frei ?? 0)
  const demandRatio = menge / Math.max(1, free)
  const occupancy =
    bestand && bestand > 0 && belegt !== null ? belegt / bestand : 0.5
  const inquiryPressure = Math.min(1, pendingInquiries / 8)

  let score = demandRatio * 35 + occupancy * 35 + inquiryPressure * 30
  if (!verfuegbar) score = Math.max(score, 72)
  score = Math.min(100, Math.max(8, score))

  let stress: AvailabilityStress
  if (score < 38) {
    stress = { stressLevel: "green", stressScore: score, stressLabel: "Entspannt" }
  } else if (score < 68) {
    stress = { stressLevel: "yellow", stressScore: score, stressLabel: "Auslastung spürbar" }
  } else {
    stress = { stressLevel: "red", stressScore: score, stressLabel: "Angespannt" }
  }

  return applyShortLeadFloor(stress, daysUntil ?? null, langfristig)
}

export function formatAvailabilityStandDatum(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso))
}

/** Früher Hard-Block im Wizard; Soft-Submit: knappe Verfügbarkeit blockiert nicht. */
export function availabilityBlocksBooking(
  _availability: { verfuegbar: boolean } | null | undefined,
): boolean {
  return false
}
