"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { adminMarkQuotePaid, previewQuoteEmail } from "@/lib/actions/quotes"
import type { PaymentMethod, QuoteStatus } from "@/lib/konfigurator/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QuoteOfferPdfUpload } from "@/components/admin/quote-offer-pdf-upload"

const PAYMENT_METHOD_LABELS: Record<Exclude<PaymentMethod, "stripe">, string> = {
  bank_transfer: "Überweisung",
  manual: "Manuell / Bar",
}

export function QuotePaymentActions({
  quoteId,
  status,
  stripePaymentLinkUrl,
  offerPdfFilename,
  sevdeskConfigured = false,
  sevdeskOrderNumber,
  embedded = false,
}: {
  quoteId: number
  status: QuoteStatus
  stripePaymentLinkUrl?: string | null
  offerPdfFilename?: string | null
  sevdeskConfigured?: boolean
  sevdeskOrderNumber?: string | null
  embedded?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer")
  const [paymentNote, setPaymentNote] = useState("")
  const [sendMail, setSendMail] = useState(true)
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)

  const loadPreview = useCallback(async () => {
    const result = await previewQuoteEmail(quoteId, "quote_paid", { paymentNote })
    setPreview(result)
  }, [quoteId, paymentNote])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  if (!["payment_pending", "approved"].includes(status)) return null

  async function handleMarkPaid() {
    setLoading(true)
    setError(null)
    try {
      const result = await adminMarkQuotePaid(quoteId, {
        paymentMethod,
        paymentNote,
        sendMail,
      })
      if (!result.success) {
        setError(result.error || "Fehler")
        setLoading(false)
        return
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindungsfehler")
    }
    setLoading(false)
  }

  const body = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Bestätigen Sie den Geldeingang, sobald die Zahlung eingegangen ist. Danach startet die
        Auftragsabwicklung automatisch beim Schritt „Angenommen“.
      </p>

      {status === "payment_pending" && stripePaymentLinkUrl && (
        <div className="rounded-md border border-blue-200 bg-blue-50/50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/20">
          <p className="font-medium">Stripe-Zahlung ausstehend</p>
          <a
            href={stripePaymentLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all text-primary underline"
          >
            {stripePaymentLinkUrl}
          </a>
          <p className="mt-2 text-muted-foreground">
            Nach Stripe-Zahlung erfolgt die Bestätigung automatisch. Alternativ können Sie die
            Zahlung manuell bestätigen.
          </p>
        </div>
      )}

      <QuoteOfferPdfUpload
        quoteId={quoteId}
        filename={offerPdfFilename ?? null}
        sevdeskConfigured={sevdeskConfigured}
        sevdeskOrderNumber={sevdeskOrderNumber}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <Label>Manuelle Zahlungsart (bei Bestätigung)</Label>
        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PAYMENT_METHOD_LABELS) as Array<Exclude<PaymentMethod, "stripe">>).map(
              (m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Notiz (optional, erscheint in der Kunden-Mail)</Label>
        <Textarea
          value={paymentNote}
          onChange={(e) => setPaymentNote(e.target.value)}
          placeholder="z. B. Überweisung vom 07.07.2026, Verwendungszweck …"
          rows={2}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="payment-send-mail"
          checked={sendMail}
          onCheckedChange={(v) => setSendMail(v === true)}
        />
        <Label htmlFor="payment-send-mail" className="cursor-pointer font-normal">
          Kunden-Mail bei Geldeingang senden
        </Label>
      </div>
      {sendMail && preview && (
        <div className="space-y-2">
          <Label>Vorschau Kunden-Mail</Label>
          <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-muted-foreground">Betreff: {preview.subject}</p>
            <pre className="whitespace-pre-wrap font-sans">{preview.body}</pre>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleMarkPaid()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : sendMail ? (
            "Geldeingang bestätigen & Mail senden"
          ) : (
            "Geldeingang bestätigen (ohne Mail)"
          )}
        </Button>
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div className="space-y-4 rounded-lg border border-amber-200 p-4 dark:border-amber-900">
        <p className="font-medium">Geldeingang</p>
        {body}
      </div>
    )
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Geldeingang</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
