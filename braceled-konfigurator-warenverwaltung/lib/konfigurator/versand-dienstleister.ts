export const VERSAND_DIENSTLEISTER_OPTIONS = [
  { value: "UPS", label: "UPS" },
  { value: "DHL", label: "DHL" },
  { value: "TNT", label: "TNT" },
] as const

export type VersandDienstleister = (typeof VERSAND_DIENSTLEISTER_OPTIONS)[number]["value"]

export function isVersandDienstleister(value: string): value is VersandDienstleister {
  return VERSAND_DIENSTLEISTER_OPTIONS.some((option) => option.value === value)
}

export function getVersandDienstleisterLabel(value: string | null | undefined): string {
  if (!value) return ""
  return VERSAND_DIENSTLEISTER_OPTIONS.find((option) => option.value === value)?.label ?? value
}
