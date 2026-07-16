import type { QuoteSource, QuoteStatus } from "@/lib/konfigurator/types"

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Entwurf",
  submitted: "In Prüfung",
  payment_pending: "Zahlung ausstehend",
  paid: "Gebucht",
  rejected: "Abgelehnt",
  approved: "Freigegeben",
  expired: "Abgelaufen",
  cancelled: "Storniert",
}

export const SOURCE_LABELS: Record<QuoteSource, string> = {
  konfigurator: "Konfigurator",
  n8n_email: "E-Mail (n8n)",
  manual: "Manuell",
}

export function statusBadgeVariant(
  status: QuoteStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "submitted":
      return "secondary"
    case "payment_pending":
      return "default"
    case "paid":
    case "approved":
      return "default"
    case "rejected":
    case "cancelled":
    case "expired":
      return "destructive"
    default:
      return "outline"
  }
}

export const ACTIVE_STATUSES: QuoteStatus[] = ["submitted", "payment_pending", "approved"]

/** Status, in denen Kunden die Anfrage noch ändern dürfen (bis Zahlung). */
export const CUSTOMER_EDITABLE_STATUSES: QuoteStatus[] = [
  "submitted",
  "approved",
  "payment_pending",
]

export function canCustomerEditQuoteStatus(status: QuoteStatus): boolean {
  return CUSTOMER_EDITABLE_STATUSES.includes(status)
}
