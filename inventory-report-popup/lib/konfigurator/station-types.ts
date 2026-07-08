export type BaseStationTyp = "eco" | "pro" | "keine"

export const BASE_STATION_TYP_OPTIONS = [
  { value: "eco" as const, label: "ECO Handcontroller" },
  { value: "pro" as const, label: "PRO Basis-Station" },
  { value: "keine" as const, label: "Keine Zuordnung" },
]

export const STATION_TYP_LABELS: Record<BaseStationTyp, string> = {
  eco: "ECO Handcontroller",
  pro: "PRO Basis-Station",
  keine: "Keine Zuordnung",
}

export function isBaseStationTyp(value: string): value is BaseStationTyp {
  return value === "eco" || value === "pro" || value === "keine"
}
