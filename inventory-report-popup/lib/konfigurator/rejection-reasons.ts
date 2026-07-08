export const REJECTION_REASONS = [
  {
    id: "nicht_lieferbar",
    label: "Nicht lieferbar",
    message:
      "Leider ist Ihre gewünschte Konfiguration im angefragten Zeitraum bzw. in der gewünschten Menge nicht lieferbar.",
  },
  {
    id: "zeitraum_belegt",
    label: "Zeitraum nicht verfügbar",
    message:
      "Der gewünschte Mietzeitraum ist leider bereits belegt. Gerne prüfen wir alternative Termine auf Anfrage.",
  },
  {
    id: "konfiguration_unmoeglich",
    label: "Konfiguration nicht umsetzbar",
    message:
      "Die gewählte Kombination aus Optionen kann technisch oder organisatorisch nicht umgesetzt werden.",
  },
] as const

export type RejectionReasonId = (typeof REJECTION_REASONS)[number]["id"]

export function getRejectionReasonById(id: string) {
  return REJECTION_REASONS.find((r) => r.id === id)
}

export function getRejectionMessage(id: string): string {
  return getRejectionReasonById(id)?.message ?? REJECTION_REASONS[0].message
}
