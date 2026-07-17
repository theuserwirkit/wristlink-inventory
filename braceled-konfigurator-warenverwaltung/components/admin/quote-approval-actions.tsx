"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import {
  adminApproveQuote,
  adminCancelQuote,
  adminRejectQuote,
  previewQuoteEmail,
} from "@/lib/actions/quotes"
import { REJECTION_REASONS, getRejectionMessage, type RejectionReasonId } from "@/lib/konfigurator/rejection-reasons"
import type { QuoteSource, QuoteStatus } from "@/lib/konfigurator/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QuoteOfferPdfUpload } from "@/components/admin/quote-offer-pdf-upload"

function EmailPreview({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
      <p className="font-medium text-muted-foreground">Betreff: {subject}</p>
      <pre className="whitespace-pre-wrap font-sans text-foreground">{body}</pre>
    </div>
  )
}

export function QuoteApprovalActions({
  quoteId,
  status,
  source,
  stripeConfigured,
  offerPdfFilename,
  sevdeskConfigured = false,
  sevdeskOrderNumber,
  embedded = false,
}: {
  quoteId: number
  status: QuoteStatus
  source: QuoteSource
  stripeConfigured: boolean
  offerPdfFilename?: string | null
  sevdeskConfigured?: boolean
  sevdeskOrderNumber?: string | null
  embedded?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | "cancel" | null>(null)
  const [reasonId, setReasonId] = useState<RejectionReasonId>("nicht_lieferbar")
  const [paymentMode, setPaymentMode] = useState<"stripe" | "manual">(
    stripeConfigured ? "stripe" : "manual",
  )
  const [error, setError] = useState<string | null>(null)
  const [approvePreview, setApprovePreview] = useState<{ subject: string; body: string } | null>(null)
  const [rejectPreview, setRejectPreview] = useState<{ subject: string; body: string } | null>(null)

  const skipStripe = paymentMode === "manual"

  const loadPreviews = useCallback(async () => {
    if (status !== "submitted") return
    const approveKey =
      source === "n8n_email"
        ? null
        : skipStripe || !stripeConfigured
          ? "quote_approved_manual"
          : "quote_approved_stripe"
    if (approveKey) {
      const preview = await previewQuoteEmail(quoteId, approveKey)
      setApprovePreview(preview)
    } else {
      setApprovePreview(null)
    }
    const rejected = await previewQuoteEmail(quoteId, "quote_rejected", {
      reason: getRejectionMessage(reasonId),
    })
    setRejectPreview(rejected)
  }, [quoteId, reasonId, skipStripe, source, status, stripeConfigured])

  useEffect(() => {
    void loadPreviews()
  }, [loadPreviews])

  if (!["submitted", "payment_pending", "approved"].includes(status)) return null

  async function handleApprove() {
    setLoading("approve")
    setError(null)
    try {
      const result = await adminApproveQuote(quoteId, {
        skipStripe: source === "konfigurator" ? skipStripe : undefined,
      })
      if (!result.success) {
        setError(result.error || "Fehler")
        return
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindungsfehler")
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading("reject")
    setError(null)
    try {
      const result = await adminRejectQuote(quoteId, reasonId)
      if (!result.success) {
        setError(result.error || "Fehler")
        return
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindungsfehler")
    } finally {
      setLoading(null)
    }
  }

  async function handleCancel() {
    setLoading("cancel")
    setError(null)
    try {
      const result = await adminCancelQuote(quoteId)
      if (!result.success) {
        setError(result.error || "Fehler")
        return
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindungsfehler")
    } finally {
      setLoading(null)
    }
  }

  const approveLabel =
    source === "n8n_email"
      ? "Freigeben & Angebot senden"
      : skipStripe || !stripeConfigured
        ? "Freigeben & Mail senden"
        : "Freigeben & Stripe-Link senden"

  const cancelSection =
    (status === "payment_pending" || status === "approved") ? (
      <Card className={embedded ? "border-dashed" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Stornierung</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleCancel} disabled={loading !== null}>
            {loading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Stornieren"}
          </Button>
        </CardContent>
      </Card>
    ) : null

  if (status !== "submitted") {
    return cancelSection
  }

  const content = (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-emerald-800 dark:text-emerald-200">Freigabe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {source === "konfigurator" && (
            <div className="space-y-2">
              <Label>Zahlungsart für den Kunden</Label>
              <Select
                value={paymentMode}
                onValueChange={(v: "stripe" | "manual") => setPaymentMode(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe" disabled={!stripeConfigured}>
                    Stripe (Online-Zahlung per Link)
                    {!stripeConfigured ? " – nicht konfiguriert" : ""}
                  </SelectItem>
                  <SelectItem value="manual">Manuelle Überweisung / Rechnung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <QuoteOfferPdfUpload
            quoteId={quoteId}
            filename={offerPdfFilename ?? null}
            sevdeskConfigured={sevdeskConfigured}
            sevdeskOrderNumber={sevdeskOrderNumber}
          />

          {source === "n8n_email" && (
            <p className="text-sm text-muted-foreground">
              Der Angebotstext aus den Notizen wird per E-Mail versendet.
            </p>
          )}
          {approvePreview && (
            <div className="space-y-2">
              <Label>Vorschau Kunden-Mail</Label>
              <EmailPreview subject={approvePreview.subject} body={approvePreview.body} />
            </div>
          )}
          <Button onClick={handleApprove} disabled={loading !== null} className="w-full sm:w-auto">
            {loading === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : approveLabel}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-destructive">Ablehnung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ablehnungsgrund</Label>
            <Select value={reasonId} onValueChange={(v) => setReasonId(v as RejectionReasonId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {rejectPreview && source === "konfigurator" && (
            <div className="space-y-2">
              <Label>Vorschau Ablehnungs-Mail</Label>
              <EmailPreview subject={rejectPreview.subject} body={rejectPreview.body} />
            </div>
          )}
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading !== null}
            className="w-full sm:w-auto"
          >
            {loading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ablehnen & Mail senden"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  if (embedded) return content

  return (
    <div className="space-y-4">
      {content}
      {cancelSection}
    </div>
  )
}
