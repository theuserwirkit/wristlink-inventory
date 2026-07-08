"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { createPrintPreviewFromUrl } from "@/lib/konfigurator/logo-print-preview"

export function usePrintPreviewLogo(logoUrl: string | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [whitePixelsRemoved, setWhitePixelsRemoved] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!logoUrl) {
      setPreviewUrl(null)
      setWhitePixelsRemoved(0)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    createPrintPreviewFromUrl(logoUrl)
      .then((result) => {
        if (cancelled) return
        setPreviewUrl(result.dataUrl)
        setWhitePixelsRemoved(result.whitePixelsRemoved)
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(logoUrl)
          setWhitePixelsRemoved(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [logoUrl])

  return { previewUrl, whitePixelsRemoved, loading }
}

export function PrintPreviewLogoImage({
  previewUrl,
  loading,
  alt,
  className,
}: {
  previewUrl: string | null
  loading: boolean
  alt: string
  className?: string
}) {
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!previewUrl) return null

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={previewUrl} alt={alt} className={className} />
  )
}
