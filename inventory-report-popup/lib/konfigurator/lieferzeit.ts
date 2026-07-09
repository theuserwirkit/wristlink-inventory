/** @deprecated Importiere aus @/lib/konfigurator/lieferpaket */
export {
  werktageToCalendarDays,
  LIEFERZEIT_MIN_TAGE,
  TECHNIKER_MIN_TAGE,
  isTechnikerAllowed,
  type LieferungContext,
} from "@/lib/konfigurator/lieferpaket"

import {
  LIEFERZEIT_MIN_TAGE,
  firstAllowedLieferpaket,
  hasAllowedLieferpaket,
  isLieferpaketAllowed,
  werktageToCalendarDays,
  type LieferungContext,
} from "@/lib/konfigurator/lieferpaket"

type Lieferzeit = "standard" | "express" | "hyperexpress"
type Lieferart = "standard" | "flex" | "overnight"

const LIEFERZEIT_TO_PAKET = {
  standard: "regulaer",
  express: "express",
  hyperexpress: "eil",
} as const

const LIEFERART_MIN_TAGE: Record<Lieferart, number> = {
  standard: werktageToCalendarDays(2),
  flex: werktageToCalendarDays(5),
  overnight: LIEFERZEIT_MIN_TAGE.hyperexpress,
}

const LIEFERART_ORDER: Lieferart[] = ["standard", "flex", "overnight"]

/** @deprecated Nutze isLieferpaketAllowed */
export function isLieferzeitOptionAllowed(
  lieferzeit: Lieferzeit,
  daysUntilEvent: number | null,
  ctx?: LieferungContext,
): boolean {
  return isLieferpaketAllowed(LIEFERZEIT_TO_PAKET[lieferzeit], daysUntilEvent, ctx)
}

/** @deprecated Nutze hasAllowedLieferpaket */
export function hasAllowedLieferzeit(
  daysUntilEvent: number | null,
  ctx?: LieferungContext,
): boolean {
  return hasAllowedLieferpaket(daysUntilEvent, ctx)
}

/** @deprecated Nutze firstAllowedLieferpaket */
export function firstAllowedLieferzeit(
  daysUntilEvent: number | null,
  ctx?: LieferungContext,
): Lieferzeit | null {
  const paket = firstAllowedLieferpaket(daysUntilEvent, ctx)
  if (!paket) return null
  if (paket === "eil") return "hyperexpress"
  if (paket === "express") return "express"
  return "standard"
}

/** @deprecated Lieferart-Mindesttage (unabhängig vom Lieferpaket) */
export function isLieferartOptionAllowed(
  lieferart: Lieferart,
  daysUntilEvent: number | null,
): boolean {
  if (daysUntilEvent === null) return true
  if (daysUntilEvent < 0) return false
  return daysUntilEvent >= LIEFERART_MIN_TAGE[lieferart]
}

/** @deprecated Erste erlaubte Lieferart nach Mindesttagen */
export function firstAllowedLieferart(daysUntilEvent: number | null): Lieferart | null {
  return LIEFERART_ORDER.find((art) => isLieferartOptionAllowed(art, daysUntilEvent)) ?? null
}
