import type { QuoteRequest } from "@/lib/konfigurator/types"
import { getLieferpaketLabel, normalizeLieferpaket } from "@/lib/konfigurator/lieferpaket"

/**
 * Kompakte, einzeilige Zusammenfassung eines Auftrags (Menge, Produkt, Modus,
 * Mietzeitraum, Druck, Lieferpaket, Szenario) für Admin-Workflow-Header.
 *
 * Nimmt bewusst nur `config_json` entgegen (nicht den vollen `QuoteRequest`),
 * damit Aufrufer schlanke Client-DTOs ohne `public_token` übergeben können.
 */
export function buildOrderContext(quote: Pick<QuoteRequest, "config_json">): string {
  const config = quote.config_json
  const parts: string[] = [`${config.menge}× ${config.produkt}`, config.modus]
  if (config.modus === "miete" && config.von) {
    parts.push(`${config.von} – ${config.bis || config.von}`)
  }
  parts.push(config.druck ? "mit Druck" : "ohne Druck")
  parts.push(getLieferpaketLabel(normalizeLieferpaket(config)))
  if (config.szenario) parts.push(config.szenario)
  return parts.join(" · ")
}
