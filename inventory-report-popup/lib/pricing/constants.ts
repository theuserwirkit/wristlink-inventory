/** Zentrale Nettopreise – Stand finale Konditionen */

export const STATION_PREIS_KAUF: Record<string, number> = {
  keine: 0,
  eco: 399,
  pro: 0, // PRO wird nicht verkauft
}

export const STATION_PREIS_MIETE: Record<string, number> = {
  keine: 0,
  eco: 250,
  pro: 649,
}

export const LIEFERZEIT_PREIS: Record<string, number> = {
  standard: 100,
  express: 349,
  hyperexpress: 620,
}

/** Techniker: Tagesrate netto (Reisepauschale + km separat) */
export const TECHNIKER_TAG_NETTO = 1200
export const TECHNIKER_REISEPAUSCHALE_NETTO = 400
export const TECHNIKER_KM_NETTO = 0.5

export const FLEX_NETTO = 199
export const OVERNIGHT_NETTO = 299
export const PROBEDRUCK_FOTOS_NETTO = 149
export const PROBEDRUCK_VERSAND_NETTO = 189
/** @deprecated Nutze PROBEDRUCK_FOTOS_NETTO */
export const PROBEDRUCK_NETTO = PROBEDRUCK_FOTOS_NETTO
export const PREMIUM_AUFSCHLAG_FAKTOR = 1.1

export function stationPreisNetto(station: string, modus: string): number {
  const s = station.toLowerCase()
  const m = modus.toLowerCase()
  if (s === "keine") return 0
  if (m === "kauf") return STATION_PREIS_KAUF[s] ?? 0
  return STATION_PREIS_MIETE[s] ?? 0
}
