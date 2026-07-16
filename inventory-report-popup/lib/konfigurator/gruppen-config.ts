import type { QuoteConfig } from "@/lib/konfigurator/types"

export const GRUPPEN_MIN = 1
export const GRUPPEN_MAX = 20
export const GRUPPEN_SLIDER_STEP = 50

export const GRUPPEN_SEGMENT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#d946ef",
  "#0ea5e9",
  "#65a30d",
  "#e11d48",
  "#8b5cf6",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#4f46e5",
] as const

export function equalSplitToMenge(menge: number, gruppen: number): number[] {
  if (gruppen <= 0) return []
  const min = GRUPPEN_SLIDER_STEP
  const sizes = Array.from({ length: gruppen }, () => min)
  let remaining = menge - gruppen * min
  if (remaining < 0) {
    return sizes
  }

  let i = 0
  while (remaining >= GRUPPEN_SLIDER_STEP) {
    sizes[i % gruppen] += GRUPPEN_SLIDER_STEP
    remaining -= GRUPPEN_SLIDER_STEP
    i++
  }
  return sizes
}

export function groessenToBoundaries(groessen: number[]): number[] {
  const out: number[] = []
  let acc = 0
  for (let i = 0; i < groessen.length - 1; i++) {
    acc += groessen[i]
    out.push(acc)
  }
  return out
}

export function boundariesToGroessen(boundaries: number[], menge: number): number[] {
  const sizes: number[] = []
  let prev = 0
  for (const boundary of boundaries) {
    sizes.push(boundary - prev)
    prev = boundary
  }
  sizes.push(menge - prev)
  return sizes
}

export function applyBoundaryDrag(
  groessen: number[],
  handleIndex: number,
  newBoundary: number,
): number[] {
  if (handleIndex < 0 || handleIndex >= groessen.length - 1) return [...groessen]

  const next = [...groessen]
  const sumLeft = next.slice(0, handleIndex).reduce((sum, n) => sum + n, 0)
  const pairTotal = next[handleIndex] + next[handleIndex + 1]
  const min = GRUPPEN_SLIDER_STEP

  let left = newBoundary - sumLeft
  left = Math.round(left / GRUPPEN_SLIDER_STEP) * GRUPPEN_SLIDER_STEP
  left = Math.max(min, Math.min(pairTotal - min, left))

  next[handleIndex] = left
  next[handleIndex + 1] = pairTotal - left
  return next
}

export function normalizeGruppenGroessen(config: QuoteConfig): number[] {
  const count = config.gruppen
  if (count <= 0) return []

  if (config.gruppenGroessen?.length === count) {
    const current = [...config.gruppenGroessen]
    if (gruppenVerteilungGueltig(current, config.menge)) return current
  }

  return equalSplitToMenge(config.menge, count)
}

export function defaultGroesseProGruppe(menge: number, gruppen: number): number {
  if (gruppen <= 0) return GRUPPEN_SLIDER_STEP
  const equal = Math.floor(menge / gruppen / GRUPPEN_SLIDER_STEP) * GRUPPEN_SLIDER_STEP
  return Math.max(minGroesseProGruppe(menge, gruppen), equal || minGroesseProGruppe(menge, gruppen))
}

export function minGroesseProGruppe(menge: number, gruppen: number): number {
  if (gruppen <= 0) return GRUPPEN_SLIDER_STEP
  return GRUPPEN_SLIDER_STEP
}

export function maxGruppenAnzahl(menge: number): number {
  return Math.min(GRUPPEN_MAX, Math.floor(menge / GRUPPEN_SLIDER_STEP))
}

export function maxGroesseForGruppe(
  groessen: number[],
  index: number,
  menge: number,
): number {
  const others = groessen.reduce((sum, n, i) => (i === index ? sum : sum + n), 0)
  return Math.max(0, menge - others)
}

/** Reduziert Overflow über die Menge; unter-Allokation bleibt (Legacy). Neue Pfade nutzen equalSplit. */
export function clampGruppenGroessenToMenge(groessen: number[], menge: number): number[] {
  if (groessen.length === 0) return []
  let next = [...groessen]
  let total = next.reduce((sum, n) => sum + n, 0)

  if (total <= menge) return next

  for (let i = next.length - 1; i >= 0 && total > menge; i--) {
    const overflow = total - menge
    const reducible = next[i] - minGroesseProGruppe(menge, next.length)
    if (reducible <= 0) continue
    const cut = Math.min(overflow, reducible)
    next[i] -= cut
    total -= cut
  }

  return next
}

export function syncGruppenGroessen(
  config: QuoteConfig,
  patch: Partial<QuoteConfig>,
): number[] | undefined {
  if (patch.gruppenGroessen !== undefined) {
    const menge = patch.menge ?? config.menge
    const next = [...patch.gruppenGroessen]
    if (gruppenVerteilungGueltig(next, menge)) return next
    return equalSplitToMenge(menge, next.length || (patch.gruppen ?? config.gruppen))
  }

  if (patch.gruppen === undefined && patch.menge === undefined) {
    return undefined
  }

  const nextGruppen = patch.gruppen ?? config.gruppen
  if (nextGruppen <= 0) return []

  const menge = patch.menge ?? config.menge
  return equalSplitToMenge(menge, nextGruppen)
}

export function gruppenVerteilungGueltig(groessen: number[], menge: number): boolean {
  if (groessen.length === 0) return false
  if (groessen.some((n) => n < GRUPPEN_SLIDER_STEP || n % GRUPPEN_SLIDER_STEP !== 0)) {
    return false
  }
  const total = groessen.reduce((sum, n) => sum + n, 0)
  return total === menge
}
