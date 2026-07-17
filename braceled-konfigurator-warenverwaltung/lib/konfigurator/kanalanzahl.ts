export const KANALANZAHL_OPTIONS = [40, 80] as const
export type Kanalanzahl = (typeof KANALANZAHL_OPTIONS)[number]

export const MAX_PHYSICAL_GROUPS = 3

export function isKanalanzahl(value: unknown): value is Kanalanzahl {
  return value === 40 || value === 80
}

export function normalizeKanalanzahl(value: unknown, fallback: Kanalanzahl = 40): Kanalanzahl {
  return isKanalanzahl(value) ? value : fallback
}

export function formatKanalanzahl(value: number): string {
  return `${value} CH`
}

export function formatStationMitKanal(stationLabel: string, kanalanzahl: number): string {
  return `${stationLabel} (${formatKanalanzahl(kanalanzahl)})`
}
