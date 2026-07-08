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
