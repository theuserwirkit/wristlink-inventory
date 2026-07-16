import {
  FLEX_NETTO,
  LIEFERZEIT_PREIS,
  OVERNIGHT_NETTO,
} from "@/lib/pricing/constants"
import { TECHNIKER_INFO } from "@/lib/konfigurator/product-info"

export type Lieferpaket = "regulaer" | "express" | "eil"
export type Lieferart = "standard" | "flex" | "overnight"

/** Werktage konservativ in Kalendertage umrechnen (Mo–Fr → Faktor 7/5) */
export function werktageToCalendarDays(werktage: number): number {
  return Math.ceil((werktage * 7) / 5)
}

const LIEFERPAKET_ORDER: Lieferpaket[] = ["regulaer", "express", "eil"]

export const LIEFERPAKET_PREIS: Record<Lieferpaket, number> = {
  regulaer: LIEFERZEIT_PREIS.standard,
  express: LIEFERZEIT_PREIS.express,
  eil: LIEFERZEIT_PREIS.hyperexpress + OVERNIGHT_NETTO,
}

export const LIEFERPAKET_OPTIONS: ReadonlyArray<{
  value: Lieferpaket
  label: string
  description: string
  minTage: number
  preisNetto: number
}> = [
  {
    value: "regulaer",
    label: "Regulär",
    description:
      "Produktion 20 Werktage · Anlieferung bis 2 Tage vor Event (UPS/TNT) · Rückversand 3 Werktage",
    minTage: werktageToCalendarDays(20),
    preisNetto: LIEFERPAKET_PREIS.regulaer,
  },
  {
    value: "express",
    label: "Express",
    description:
      "Produktion 10 Werktage · Anlieferung bis 2 Tage vor Event (UPS/TNT) · Rückversand 3 Werktage",
    minTage: werktageToCalendarDays(10),
    preisNetto: LIEFERPAKET_PREIS.express,
  },
  {
    value: "eil",
    label: "Eilauftrag",
    description:
      "Produktion 48 Std · Overnight per UPS/TNT · Rückversand 3 Werktage · Bedruckung möglich",
    minTage: 2,
    preisNetto: LIEFERPAKET_PREIS.eil,
  },
]

export const FLEX_RUECKGABE_INFO = {
  label: "Flex-Rückgabe",
  description:
    "Frühere Anlieferung (≥5 Werktage vor Event, UPS/TNT) · Rückversandfenster 8 Werktage",
  preisNetto: FLEX_NETTO,
  minTage: werktageToCalendarDays(5),
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

function minTageForPaket(paket: Lieferpaket): number {
  const opt = LIEFERPAKET_OPTIONS.find((o) => o.value === paket)
  return opt?.minTage ?? 0
}

/** Zeitliche Freigabe eines Lieferpakets (Kalendertage bis Event). Bedruckung ist unabhängig davon erlaubt. */
export function isLieferpaketAllowed(
  paket: Lieferpaket,
  daysUntilEvent: number | null,
  _ctx?: LieferungContext,
): boolean {
  if (daysUntilEvent === null) return true
  if (daysUntilEvent < 0) return false
  return daysUntilEvent >= minTageForPaket(paket)
}

/** Nutzertext, warum ein Paket gerade nicht wählbar ist. */
export function getLieferpaketBlockReason(
  paket: Lieferpaket,
  daysUntilEvent: number | null,
  ctx?: LieferungContext,
): string | null {
  if (isLieferpaketAllowed(paket, daysUntilEvent, ctx)) return null
  return "Zu kurzer Vorlauf bis zum Event"
}

export function isFlexRueckgabeAllowed(
  daysUntilEvent: number | null,
  paket?: Lieferpaket,
): boolean {
  if (paket === "eil") return false
  if (daysUntilEvent === null) return true
  if (daysUntilEvent < 0) return false
  return daysUntilEvent >= FLEX_RUECKGABE_INFO.minTage
}

export function hasAllowedLieferpaket(
  daysUntilEvent: number | null,
  ctx?: LieferungContext,
): boolean {
  return LIEFERPAKET_ORDER.some((p) => isLieferpaketAllowed(p, daysUntilEvent, ctx))
}

export function firstAllowedLieferpaket(
  daysUntilEvent: number | null,
  ctx?: LieferungContext,
): Lieferpaket | null {
  const allowed = LIEFERPAKET_ORDER.find((p) => isLieferpaketAllowed(p, daysUntilEvent, ctx))
  return allowed ?? null
}

export function isTechnikerAllowed(daysUntilEvent: number | null): boolean {
  if (daysUntilEvent === null) return true
  if (daysUntilEvent < 0) return false
  return daysUntilEvent >= TECHNIKER_MIN_TAGE
}

export function getLieferpaketWarning(
  daysUntilEvent: number | null,
  ctx?: LieferungContext,
): string | null {
  if (daysUntilEvent === null) return null

  const blockedByTime = LIEFERPAKET_OPTIONS.filter(
    (opt) => !isLieferpaketAllowed(opt.value, daysUntilEvent, ctx),
  )
  if (blockedByTime.length === 0) return null

  const names = blockedByTime.map((opt) => opt.label).join(", ")
  return `Bei nur noch ${daysUntilEvent} Tag${daysUntilEvent === 1 ? "" : "en"} bis zum Event ${blockedByTime.length === 1 ? "ist" : "sind"} ${names} nicht verfügbar.`
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
  daysUntilEvent: number | null,
): Partial<ReturnType<typeof applyLieferpaket>> {
  const paket = normalizeLieferpaket(config)
  let flexRueckgabe = normalizeFlexRueckgabe(config)
  const patch: Partial<ReturnType<typeof applyLieferpaket>> = {}

  let nextPaket = paket
  if (!isLieferpaketAllowed(paket, daysUntilEvent)) {
    const allowed = firstAllowedLieferpaket(daysUntilEvent)
    if (allowed) {
      nextPaket = allowed
      flexRueckgabe = false
    }
  }

  if (nextPaket === "eil") {
    flexRueckgabe = false
  } else if (flexRueckgabe && !isFlexRueckgabeAllowed(daysUntilEvent, nextPaket)) {
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

/** @deprecated – Kompatibilität für ältere Imports */
export const LIEFERZEIT_MIN_TAGE = {
  standard: werktageToCalendarDays(20),
  express: werktageToCalendarDays(10),
  hyperexpress: 2,
}
