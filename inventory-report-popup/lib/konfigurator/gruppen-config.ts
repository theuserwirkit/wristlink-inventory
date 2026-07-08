import type { QuoteConfig } from "@/lib/konfigurator/types"

export const GRUPPEN_MIN = 1
export const GRUPPEN_MAX = 20
export const GRUPPEN_SLIDER_STEP = 50

export function normalizeGruppenGroessen(config: QuoteConfig): number[] {
  const count = config.gruppen
  if (count <= 0) return []

  if (config.gruppenGroessen?.length === count) {
    return clampGruppenGroessenToMenge([...config.gruppenGroessen], config.menge)
  }

  const fallback = config.baenderProGruppe ?? defaultGroesseProGruppe(config.menge, count)
  return clampGruppenGroessenToMenge(
    Array.from({ length: count }, () => fallback),
    config.menge,
  )
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
    return clampGruppenGroessenToMenge(patch.gruppenGroessen, patch.menge ?? config.menge)
  }

  if (patch.gruppen === undefined && patch.menge === undefined) {
    return undefined
  }

  const nextGruppen = patch.gruppen ?? config.gruppen
  if (nextGruppen <= 0) return []

  const menge = patch.menge ?? config.menge
  const merged = { ...config, ...patch, gruppen: nextGruppen, menge }
  const prev = normalizeGruppenGroessen(merged)
  const defaultPer = defaultGroesseProGruppe(menge, nextGruppen)

  return clampGruppenGroessenToMenge(
    Array.from({ length: nextGruppen }, (_, i) => prev[i] ?? defaultPer),
    menge,
  )
}

export function gruppenVerteilungGueltig(groessen: number[], menge: number): boolean {
  const total = groessen.reduce((sum, n) => sum + n, 0)
  return total > 0 && total <= menge
}
