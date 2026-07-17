import type { QuoteRequest } from "@/lib/konfigurator/types"
import { formatDate } from "@/lib/utils/date"

export function formatAuftragHeading(quote: QuoteRequest): string {
  const config = quote.config_json
  const kunde =
    config.kontaktFirma?.trim() ||
    config.kontaktName?.trim() ||
    quote.lead_email ||
    "–"
  const baender = `${config.menge} Bänder`
  const ort = config.kontaktOrt?.trim() || config.technikerAdresse?.trim() || "–"

  let datum = "–"
  if (config.von) {
    datum = formatDate(config.von)
  } else if (quote.paid_at) {
    datum = formatDate(quote.paid_at)
  } else if (quote.submitted_at) {
    datum = formatDate(quote.submitted_at)
  }

  return `Auftrag #${quote.id} ${kunde} ${baender} ${ort} ${datum}`
}
