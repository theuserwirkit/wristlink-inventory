import type { QuoteConfig } from "@/lib/konfigurator/types"
import { extractPlzFromAddress, normalizePlz } from "@/lib/konfigurator/plz"

export function formatKontaktAdresse(config: QuoteConfig): string {
  const strasse = config.kontaktStrasse?.trim()
  const plz = config.kontaktPlz?.trim()
  const ort = config.kontaktOrt?.trim()
  const plzOrt = [plz, ort].filter(Boolean).join(" ")
  return [strasse, plzOrt].filter(Boolean).join(", ")
}

/** PLZ für Status-Zugang: Kontakt-PLZ, sonst Fallback aus älteren Anfragen */
export function getQuoteAccessPlz(config: QuoteConfig): string | null {
  const plz = config.kontaktPlz?.trim()
  if (plz) {
    const normalized = normalizePlz(plz)
    return normalized.length === 5 ? normalized : null
  }
  return extractPlzFromAddress(config.technikerAdresse)
}

export function isKontaktAdresseComplete(config: QuoteConfig): boolean {
  return (
    Boolean(config.kontaktStrasse?.trim()) &&
    normalizePlz(config.kontaktPlz || "").length === 5 &&
    Boolean(config.kontaktOrt?.trim())
  )
}
