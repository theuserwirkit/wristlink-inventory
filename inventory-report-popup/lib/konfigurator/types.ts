export type QuoteStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "payment_pending"
  | "paid"
  | "expired"
  | "cancelled"

export type QuoteSource = "konfigurator" | "n8n_email"

export type PaymentMethod = "stripe" | "bank_transfer" | "manual"

export type FulfillmentStatus =
  | "angenommen"
  | "vorbereitet"
  | "bedruckt"
  | "verpackt"
  | "versand_beauftragt"
  | "versandt"
  | "ruecksendung_angekommen"
  | "zurueckgepackt"

export type EmailTemplate = {
  id: number
  template_key: string
  label: string
  category: string
  subject: string
  body: string
  send_by_default: boolean
  updated_at: string
}

export type QuoteFulfillmentEvent = {
  id: number
  quote_id: number
  from_status: FulfillmentStatus | null
  to_status: FulfillmentStatus
  comment: string | null
  tracking_number: string | null
  mail_sent: boolean
  mail_subject: string | null
  created_by: string | null
  created_at: string
}

export type QuoteConfig = {
  kontaktName?: string
  kontaktFirma?: string
  kontaktTelefon?: string
  szenario?: string
  variante?: string
  produkt: string
  modus: string
  menge: number
  von?: string
  bis?: string
  druck: boolean
  probedruckOption?: "none" | "fotos" | "versand"
  /** @deprecated – wird aus probedruckOption abgeleitet */
  probedruck?: boolean
  logoId?: string
  lieferpaket?: "regulaer" | "express" | "eil"
  flexRueckgabe?: boolean
  /** Standard-Anlieferung, Flex-Lieferung oder Overnight (48 Std.) – aus lieferpaket abgeleitet */
  lieferart?: "standard" | "flex" | "overnight"
  /** @deprecated – wird aus lieferart abgeleitet */
  flex?: boolean
  gruppen: number
  /** Bänder pro programmierter Gruppe (Index 0 = Gruppe 1) */
  gruppenGroessen?: number[]
  /** @deprecated Nutze gruppenGroessen – Fallback für ältere Anfragen */
  baenderProGruppe?: number
  kanalanzahl?: number
  station: string
  /** Kauf oder Miete der Basis-Station – unabhängig vom Produktmodus */
  stationModus: string
  lieferzeit: string
  land: string
  techniker?: boolean
  technikerTage?: number
  technikerAdresse?: string
  technikerKm?: number
}

export type Lead = {
  id: number
  email: string
  name: string | null
  firma: string | null
  telefon: string | null
  verified_at: string | null
  marketing_consent: boolean
  consent_text_version: string
  consent_ip: string | null
  customer_id: number | null
  created_at: string
}

export type QuoteRequest = {
  id: number
  lead_id: number
  public_token: string
  config_json: QuoteConfig
  price_snapshot_json: Record<string, unknown>
  status: QuoteStatus
  source: QuoteSource
  booking_id: number | null
  stripe_checkout_session_id: string | null
  stripe_payment_link_url: string | null
  rejection_reason: string | null
  external_ref: string | null
  notes: string | null
  submitted_at: string | null
  approved_at: string | null
  paid_at: string | null
  expires_at: string | null
  cancelled_at: string | null
  fulfillment_status: FulfillmentStatus | null
  tracking_number: string | null
  payment_method: PaymentMethod | null
  payment_note: string | null
  return_booking_id: number | null
  offer_pdf_filename: string | null
  created_at: string
  lead_email?: string
}
