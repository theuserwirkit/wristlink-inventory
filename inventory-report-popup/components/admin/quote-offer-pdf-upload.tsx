"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Sparkles, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { removeQuoteOfferPdf, uploadQuoteOfferPdf } from "@/lib/actions/quote-offer-pdf"
import { createQuoteSevdeskOffer } from "@/lib/actions/sevdesk-offer"

export function QuoteOfferPdfUpload({
  quoteId,
  filename,
  sevdeskConfigured = false,
  sevdeskOrderNumber,
}: {
  quoteId: number
  filename: string | null
  sevdeskConfigured?: boolean
  sevdeskOrderNumber?: string | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState<"upload" | "remove" | "sevdesk" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setLoading("upload")
    setError(null)
    setSuccess(null)
    const result = await uploadQuoteOfferPdf(quoteId, file)
    if (!result.success) {
      setError(result.error || "Upload fehlgeschlagen")
      setLoading(null)
      return
    }
    router.refresh()
    setLoading(null)
  }

  async function handleRemove() {
    setLoading("remove")
    setError(null)
    setSuccess(null)
    await removeQuoteOfferPdf(quoteId)
    router.refresh()
    setLoading(null)
  }

  async function handleCreateSevdeskOffer() {
    setLoading("sevdesk")
    setError(null)
    setSuccess(null)
    try {
      const result = await createQuoteSevdeskOffer(quoteId)
      if (!result.success) {
        setError(result.error || "sevDesk-Angebot fehlgeschlagen")
        setLoading(null)
        return
      }
      setSuccess(`Angebot ${result.orderNumber} in sevDesk erstellt`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindungsfehler")
    }
    setLoading(null)
  }

  const busy = loading !== null

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Angebots-PDF (sevDesk oder manuell)
      </Label>
      <p className="text-xs text-muted-foreground">
        Wird bei Freigabe und Zahlungsbestätigung als Anhang an die Kunden-Mail gesendet.
      </p>
      {sevdeskOrderNumber && (
        <p className="text-xs text-muted-foreground">
          sevDesk-Angebot: <span className="font-medium text-foreground">{sevdeskOrderNumber}</span>
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-700 dark:text-green-400">{success}</p>}
      {filename ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/admin/quotes/${quoteId}/offer-pdf`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            {filename}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleRemove()}
            disabled={busy}
          >
            {loading === "remove" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sevdeskConfigured && !sevdeskOrderNumber && (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={busy}
              onClick={() => void handleCreateSevdeskOffer()}
            >
              {loading === "sevdesk" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              In sevDesk erstellen
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUpload(file)
              e.target.value = ""
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {loading === "upload" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            PDF hochladen
          </Button>
        </div>
      )}
    </div>
  )
}
