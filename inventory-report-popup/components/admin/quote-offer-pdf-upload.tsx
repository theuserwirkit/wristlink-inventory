"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { removeQuoteOfferPdf, uploadQuoteOfferPdf } from "@/lib/actions/quote-offer-pdf"

export function QuoteOfferPdfUpload({
  quoteId,
  filename,
}: {
  quoteId: number
  filename: string | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setLoading(true)
    setError(null)
    const result = await uploadQuoteOfferPdf(quoteId, file)
    if (!result.success) {
      setError(result.error || "Upload fehlgeschlagen")
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  async function handleRemove() {
    setLoading(true)
    setError(null)
    await removeQuoteOfferPdf(quoteId)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Angebots-PDF (sevDesk oder manuell)
      </Label>
      <p className="text-xs text-muted-foreground">
        Wird bei Freigabe und Zahlungsbestätigung als Anhang an die Kunden-Mail gesendet.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
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
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
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
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? (
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
