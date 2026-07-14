import type { QuoteRequest } from "@/lib/konfigurator/types"
import { getAppBaseUrl } from "@/lib/konfigurator/lead-auth"
import { getVersandDienstleisterLabel } from "@/lib/konfigurator/versand-dienstleister"
import { formatDate } from "@/lib/utils/date"

export type TemplateVars = Record<string, string>

export function renderTemplateText(template: string, vars: TemplateVars): string {
  const withoutLegacyKommentar = template
    .replace(/\n?\{\{kommentar\}\}\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
  return withoutLegacyKommentar.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "")
}

function insertBeforeEmailFooter(body: string, block: string): string {
  const markers = [
    "\nBitte nicht auf diese E-Mail",
    "\nFragen bitte an",
    "\nViele Grüße",
  ]
  for (const marker of markers) {
    const idx = body.indexOf(marker)
    if (idx >= 0) {
      const before = body.slice(0, idx).trimEnd()
      const after = body.slice(idx)
      return `${before}\n\n${block}\n${after}`
    }
  }
  return `${body.trimEnd()}\n\n${block}\n`
}

/** Kundenkommentar vor der Signatur einfügen – nur wenn Text vorhanden. */
export function appendCustomerCommentToEmail(body: string, comment?: string): string {
  const trimmed = comment?.trim()
  if (!trimmed) return body
  if (body.includes(trimmed)) return body
  return insertBeforeEmailFooter(body, `Hinweis:\n${trimmed}`)
}

function formatEventDatum(von?: string, bis?: string): string {
  if (!von) return "–"
  const start = formatDate(von)
  if (bis && bis !== von) return `${start} – ${formatDate(bis)}`
  return start
}

function formatZahlungslinkBlock(paymentUrl?: string | null): string {
  const url = paymentUrl?.trim()
  if (!url) return ""
  return `Zum direkten Bezahlen online:\n${url}\n\n`
}

export function buildQuoteTemplateVars(
  quote: QuoteRequest,
  leadEmail: string,
  extra: TemplateVars = {},
): TemplateVars {
  const price = quote.price_snapshot_json as { gesamt_netto?: number; gesamt_brutto?: number }
  const config = quote.config_json
  const statusUrl = `${getAppBaseUrl()}/angebot/${quote.public_token}`.replace(/\s+/g, "")
  const trackingNr = quote.tracking_number || extra.tracking_nr || ""
  const versandDienstleister = getVersandDienstleisterLabel(
    extra.versand_dienstleister || quote.versand_dienstleister,
  )
  const trackingInfo = trackingNr
    ? versandDienstleister
      ? `Sendungsverfolgung (${versandDienstleister}): ${trackingNr}`
      : `Sendungsverfolgung: ${trackingNr}`
    : ""
  const paymentUrl = quote.stripe_payment_link_url || extra.zahlungslink || ""

  return {
    anfrage_id: String(quote.id),
    kunde_email: leadEmail,
    kunde_name: config.kontaktName || "",
    kunde_firma: config.kontaktFirma || "",
    kunde_anrede: config.kontaktName?.trim()
      ? `Hallo ${config.kontaktName.trim()},`
      : "Hallo,",
    angebot_netto: (price.gesamt_netto || 0).toFixed(2),
    angebot_brutto: (price.gesamt_brutto || 0).toFixed(2),
    menge: String(config.menge || 0),
    event_datum: formatEventDatum(config.von, config.bis),
    lieferort: config.technikerAdresse?.trim() || "–",
    zahlungslink: paymentUrl,
    zahlungslink_block: formatZahlungslinkBlock(paymentUrl),
    angebot_url: statusUrl,
    status_url: statusUrl,
    tracking_nr: trackingNr,
    versand_dienstleister: versandDienstleister,
    tracking_info: trackingInfo,
    kommentar: "",
    ablehnungsgrund: extra.ablehnungsgrund || quote.rejection_reason || "",
    zahlungsnotiz: extra.zahlungsnotiz || quote.payment_note || "",
    ...extra,
  }
}

export function formatKommentarBlock(comment: string | undefined): string {
  const trimmed = comment?.trim()
  if (!trimmed) return ""
  return trimmed
}

export function formatAblehnungsgrundBlock(reason: string | undefined): string {
  const trimmed = reason?.trim()
  if (!trimmed) return ""
  return `Grund: ${trimmed}\n\n`
}
