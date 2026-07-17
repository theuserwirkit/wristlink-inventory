import {
  FLEX_NETTO,
  LIEFERZEIT_PREIS,
  OVERNIGHT_NETTO,
} from "@/lib/pricing/constants"
import { TECHNIKER_INFO } from "@/lib/konfigurator/product-info"
import { workdaysUntil } from "@/lib/utils/date"

export type Lieferpaket = "regulaer" | "express" | "eil"
export type Lieferart = "standard" | "flex" | "overnight"

/**
 * @deprecated Kalender-Näherung (Faktor 7/5) – für die Lieferpaket-Freigabe nicht mehr
 * verwenden, dort zählt `minWerktageForPaket` gegen echte Werktage. Nur noch für
 * Legacy-Shims (`lieferzeit.ts`) und `LIEFERZEIT_MIN_TAGE`.
 */
export function werktageToCalendarDays(werktage: number): number {
  return Math.ceil((werktage * 7) / 5)
}

const LIEFERPAKET_ORDER: Lieferpaket[] = ["regulaer", "express", "eil"]

export const LIEFERPAKET_PREIS: Record<Lieferpaket, number> = {
  regulaer: LIEFERZEIT_PREIS.standard,
  express: LIEFERZEIT_PREIS.express,
  eil: LIEFERZEIT_PREIS.hyperexpress + OVERNIGHT_NETTO,
}

/** Produktionszeit je Paket in Werktagen. */
export const PRODUKTION_WERKTAGE: Record<Lieferpaket, number> = {
  regulaer: 20,
  express: 10,
  eil: 2,
}

/** Versandlaufzeit Regulär/Express in Werktagen (UPS/TNT). */
export const VERSAND_WERKTAGE_STANDARD = 2
/** Versandlaufzeit Eilauftrag (Overnight-Kurier) in Werktagen. */
export const VERSAND_WERKTAGE_EIL = 1
/** Anlieferungspuffer vor Event bei Standard-Rückgabe, in Werktagen. */
export const ANKUNFT_WERKTAGE_STANDARD = 2
/** Anlieferungspuffer vor Event bei Flex-Rückgabe, in Werktagen. */
export const ANKUNFT_WERKTAGE_FLEX = 5

/**
 * Mindestvorlauf in Werktagen: Produktion + Versand + Ankunftspuffer.
 * Eilauftrag ignoriert Flex (kein Flex-Angebot für Eil).
 */
export function minWerktageForPaket(paket: Lieferpaket, flexRueckgabe = false): number {
  if (paket === "eil") {
    return PRODUKTION_WERKTAGE.eil + VERSAND_WERKTAGE_EIL
  }
  const ankunft = flexRueckgabe ? ANKUNFT_WERKTAGE_FLEX : ANKUNFT_WERKTAGE_STANDARD
  return PRODUKTION_WERKTAGE[paket] + VERSAND_WERKTAGE_STANDARD + ankunft
}

/** Echte Werktage (Mo–Fr) von `from` bis einschließlich Eventdatum (ISO-String). */
export function workdaysUntilEvent(eventDateIso: string, from = new Date()): number {
  const event = new Date(`${eventDateIso.slice(0, 10)}T12:00:00`)
  const fromNorm = new Date(`${from.toISOString().slice(0, 10)}T12:00:00`)
  return workdaysUntil(fromNorm, event)
}

export const LIEFERPAKET_OPTIONS: ReadonlyArray<{
  value: Lieferpaket
  label: string
  description: string
  minWerktage: number
  preisNetto: number
}> = [
  {
    value: "regulaer",
    label: "Regulär",
    description:
      "Produktion 20 Werktage · Anlieferung bis 2 Tage vor Event (UPS/TNT) · Rückversand 3 Werktage",
    minWerktage: minWerktageForPaket("regulaer", false),
    preisNetto: LIEFERPAKET_PREIS.regulaer,
  },
  {
    value: "express",
    label: "Express",
    description:
      "Produktion 10 Werktage · Anlieferung bis 2 Tage vor Event (UPS/TNT) · Rückversand 3 Werktage",
    minWerktage: minWerktageForPaket("express", false),
    preisNetto: LIEFERPAKET_PREIS.express,
  },
  {
    value: "eil",
    label: "Eilauftrag",
    description:
      "Produktion 48 Std · Overnight per UPS/TNT · Rückversand 3 Werktage · Bedruckung möglich",
    minWerktage: minWerktageForPaket("eil", false),
    preisNetto: LIEFERPAKET_PREIS.eil,
  },
]

export const FLEX_RUECKGABE_INFO = {
  label: "Flex-Rückgabe",
  description:
    "Frühere Anlieferung (≥5 Werktage vor Event, UPS/TNT) · Rückversandfenster 8 Werktage",
  preisNetto: FLEX_NETTO,
} as const

/** @deprecated hasDruck wirkt nicht mehr auf die Freigabe (Eil + Bedruckung ist erlaubt). */
export type LieferungContext = {
  hasDruck?: boolean
}

export const TECHNIKER_MIN_TAGE = TECHNIKER_INFO.minVorlaufTage

export function getLieferpaketLabel(paket: Lieferpaket): string {
  return LIEFERPAKET_OPTIONS.find((o) => o.value === paket)?.label ?? paket
}

export function normalizeLieferpaket(config: {
  lieferpaket?: string
  lieferzeit?: string
  lieferart?: string
  flex?: boolean
}): Lieferpaket {
  if (
    config.lieferpaket === "regulaer" ||
    config.lieferpaket === "express" ||
    config.lieferpaket === "eil"
  ) {
    return config.lieferpaket
  }

  const lieferzeit = (config.lieferzeit || "standard").toLowerCase()
  const lieferart = config.lieferart ?? (config.flex ? "flex" : "standard")

  if (lieferzeit === "hyperexpress" || lieferart === "overnight") return "eil"
  if (lieferzeit === "express") return "express"
  return "regulaer"
}

export function normalizeFlexRueckgabe(config: {
  flexRueckgabe?: boolean
  lieferart?: string
  flex?: boolean
  lieferpaket?: string
}): boolean {
  if (normalizeLieferpaket(config) === "eil") return false
  if (config.flexRueckgabe !== undefined) return config.flexRueckgabe
  return config.lieferart === "flex" || Boolean(config.flex)
}

export function applyLieferpaket(
  paket: Lieferpaket,
  flexRueckgabe: boolean,
): {
  lieferpaket: Lieferpaket
  lieferzeit: string
  lieferart: Lieferart
  flex: boolean
  flexRueckgabe: boolean
} {
  if (paket === "eil") {
    return {
      lieferpaket: "eil",
      lieferzeit: "hyperexpress",
      lieferart: "overnight",
      flex: false,
      flexRueckgabe: false,
    }
  }

  const lieferzeit = paket === "express" ? "express" : "standard"
  const flex = flexRueckgabe
  return {
    lieferpaket: paket,
    lieferzeit,
    lieferart: flex ? "flex" : "standard",
    flex,
    flexRueckgabe: flex,
  }
}

/** Zeitliche Freigabe eines Lieferpakets (Werktage bis Event). Bedruckung ist unabhängig davon erlaubt. */
export function isLieferpaketAllowed(
  paket: Lieferpaket,
  werktageBisEvent: number | null,
  _ctx?: LieferungContext,
): boolean {
  if (werktageBisEvent === null) return true
  if (werktageBisEvent < 0) return false
  return werktageBisEvent >= minWerktageForPaket(paket, false)
}

/** Nutzertext, warum ein Paket gerade nicht wählbar ist. */
export function getLieferpaketBlockReason(
  paket: Lieferpaket,
  werktageBisEvent: number | null,
  ctx?: LieferungContext,
): string | null {
  if (isLieferpaketAllowed(paket, werktageBisEvent, ctx)) return null
  return "Zu kurzer Vorlauf bis zum Event"
}

export function isFlexRueckgabeAllowed(
  werktageBisEvent: number | null,
  paket?: Lieferpaket,
): boolean {
  if (paket === "eil") return false
  if (werktageBisEvent === null) return true
  if (werktageBisEvent < 0) return false
  return werktageBisEvent >= minWerktageForPaket(paket ?? "regulaer", true)
}

export function hasAllowedLieferpaket(
  werktageBisEvent: number | null,
  ctx?: LieferungContext,
): boolean {
  return LIEFERPAKET_ORDER.some((p) => isLieferpaketAllowed(p, werktageBisEvent, ctx))
}

export function firstAllowedLieferpaket(
  werktageBisEvent: number | null,
  ctx?: LieferungContext,
): Lieferpaket | null {
  const allowed = LIEFERPAKET_ORDER.find((p) => isLieferpaketAllowed(p, werktageBisEvent, ctx))
  return allowed ?? null
}

export function isTechnikerAllowed(daysUntilEvent: number | null): boolean {
  if (daysUntilEvent === null) return true
  if (daysUntilEvent < 0) return false
  return daysUntilEvent >= TECHNIKER_MIN_TAGE
}

export function getLieferpaketWarning(
  werktageBisEvent: number | null,
  ctx?: LieferungContext,
): string | null {
  if (werktageBisEvent === null) return null

  const blockedByTime = LIEFERPAKET_OPTIONS.filter(
    (opt) => !isLieferpaketAllowed(opt.value, werktageBisEvent, ctx),
  )
  if (blockedByTime.length === 0) return null

  const names = blockedByTime.map((opt) => opt.label).join(", ")
  const unit = werktageBisEvent === 1 ? "Werktag" : "Werktagen"
  const verb = blockedByTime.length === 1 ? "ist" : "sind"
  return `Bei nur noch ${werktageBisEvent} ${unit} bis zum Event ${verb} ${names} nicht verfügbar.`
}

export function syncLieferpaketFromEvent(
  config: {
    lieferpaket?: string
    flexRueckgabe?: boolean
    lieferzeit?: string
    lieferart?: string
    flex?: boolean
    druck: boolean
  },
  werktageBisEvent: number | null,
): Partial<ReturnType<typeof applyLieferpaket>> {
  const paket = normalizeLieferpaket(config)
  let flexRueckgabe = normalizeFlexRueckgabe(config)
  const patch: Partial<ReturnType<typeof applyLieferpaket>> = {}

  let nextPaket = paket
  if (!isLieferpaketAllowed(paket, werktageBisEvent)) {
    const allowed = firstAllowedLieferpaket(werktageBisEvent)
    if (allowed) {
      nextPaket = allowed
      flexRueckgabe = false
    }
  }

  if (nextPaket === "eil") {
    flexRueckgabe = false
  } else if (flexRueckgabe && !isFlexRueckgabeAllowed(werktageBisEvent, nextPaket)) {
    flexRueckgabe = false
  }

  const resolved = applyLieferpaket(nextPaket, flexRueckgabe)
  if (
    resolved.lieferpaket !== paket ||
    resolved.flexRueckgabe !== normalizeFlexRueckgabe(config) ||
    resolved.lieferzeit !== (config.lieferzeit || "standard") ||
    resolved.lieferart !== (config.lieferart ?? (config.flex ? "flex" : "standard"))
  ) {
    Object.assign(patch, resolved)
  }

  return patch
}

/**
 * @deprecated Kompatibilität für ältere Imports (Kalender-Näherung). Nicht mehr für die
 * Lieferpaket-Freigabe verwenden – dafür `minWerktageForPaket`.
 */
export const LIEFERZEIT_MIN_TAGE = {
  standard: werktageToCalendarDays(20),
  express: werktageToCalendarDays(10),
  hyperexpress: 2,
}
