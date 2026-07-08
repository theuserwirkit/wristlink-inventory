import type { Kanalanzahl } from "@/lib/konfigurator/kanalanzahl"
import { isKanalanzahl, normalizeKanalanzahl } from "@/lib/konfigurator/kanalanzahl"

export const LEUCHTGRUPPE_MAX_SLOT = 20

/** Ab dieser Anzahl programmierter Gruppen ist 80 CH Pflicht */
export const GRUPPEN_80CH_MIN = 11

export const LEUCHTGRUPPE_SLOTS = Array.from(
  { length: LEUCHTGRUPPE_MAX_SLOT },
  (_, i) => i + 1,
)

const LEUCHTGRUPPE_NAME_RE = /^G([1-9]|1[0-9]|20)_(40|80)ch$/i

export function formatLeuchtgruppeName(slot: number, kanalanzahl: Kanalanzahl): string {
  const s = Math.min(Math.max(Math.floor(slot), 1), LEUCHTGRUPPE_MAX_SLOT)
  const ch = kanalanzahl === 80 ? 80 : 40
  return `G${s}_${ch}ch`
}

export function parseLeuchtgruppeName(
  name: string,
): { slot: number; kanalanzahl: Kanalanzahl } | null {
  const match = name.trim().match(LEUCHTGRUPPE_NAME_RE)
  if (!match) return null
  const slot = parseInt(match[1], 10)
  const kanalanzahl = parseInt(match[2], 10)
  if (!isKanalanzahl(kanalanzahl)) return null
  return { slot, kanalanzahl }
}

export function isLeuchtgruppeName(name: string): boolean {
  return LEUCHTGRUPPE_NAME_RE.test(name.trim())
}

export function getMandatoryKanalanzahl(gruppen: number): Kanalanzahl | null {
  return gruppen > 10 ? 80 : null
}

export function getKanalanzahlOptions(gruppen: number): Kanalanzahl[] {
  return getMandatoryKanalanzahl(gruppen) ? [80] : [40, 80]
}

export function formatLeuchtgruppeSlotLabel(slot: number): string {
  return `G${slot}`
}
