"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { WristbandMockup } from "@/components/konfigurator/wristband-mockup"
import { CheckerboardBg } from "@/components/konfigurator/checkerboard-bg"
import { PrintPreviewLogoImage, usePrintPreviewLogo } from "@/components/konfigurator/print-preview-logo"
import { DRUCK_INFO } from "@/lib/konfigurator/product-info"

type LogoPreviewProps = {
  logoUrl: string | null
  uploadEnabled: boolean
  onFileSelect: (file: File) => void
  uploading: boolean
  uploadError: string | null
}

const MIN_WIDTH_PX = 350

function PrintCheckResult({
  dimensions,
}: {
  dimensions: { w: number; h: number }
}) {
  const resolutionOk = dimensions.w >= MIN_WIDTH_PX
  return (
    <div
      className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 ${
        resolutionOk ? "text-green-800 bg-green-50/90" : "text-amber-900 bg-amber-50/90"
      }`}
    >
      {resolutionOk ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      )}
      <div>
        <p className="font-medium">
          {resolutionOk ? "Für Druck geeignet" : "Auflösung eher niedrig"}
        </p>
        <p className="mt-0.5 opacity-90">
          {dimensions.w} × {dimensions.h} px
          {!resolutionOk && ` · Empfehlung: mind. ${MIN_WIDTH_PX} px Breite`}
        </p>
      </div>
    </div>
  )
}

export function LogoPreview({
  logoUrl,
  uploadEnabled,
  onFileSelect,
  uploading,
  uploadError,
}: LogoPreviewProps) {
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null)
  const { previewUrl, whitePixelsRemoved, loading: previewLoading } = usePrintPreviewLogo(logoUrl)

  useEffect(() => {
    if (!logoUrl) {
      setDimensions(null)
      return
    }
    const img = new window.Image()
    img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => setDimensions(null)
    img.src = logoUrl
  }, [logoUrl])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="logo-upload">Logo hochladen (PNG, transparenter Hintergrund)</Label>
        <Input
          id="logo-upload"
          type="file"
          accept="image/png"
          disabled={!uploadEnabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFileSelect(file)
          }}
        />
        {!uploadEnabled && (
          <p className="text-xs text-muted-foreground">
            Bitte zuerst Bedruckung aktivieren, um ein Logo hochzuladen.
          </p>
        )}
        {uploading && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Logo wird hochgeladen …
          </p>
        )}
        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        {logoUrl && !uploading && (
          <p className="text-xs text-green-700">Logo gespeichert</p>
        )}
      </div>

      {logoUrl && !previewLoading && whitePixelsRemoved > 0 && (
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-4 space-y-2 shadow-md ring-1 ring-amber-200">
          <p className="text-base font-bold text-amber-950 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Weiß im Logo wird nicht gedruckt
          </p>
          <p className="text-sm font-medium text-amber-950 leading-relaxed">
            In Ihrem Logo wurden helle bzw. weiße Bereiche erkannt. Diese erscheinen in der
            Vorschau transparent und sind nicht sinnvoll druckbar.
          </p>
        </div>
      )}

      <WristbandMockup
        printPreviewUrl={previewUrl}
        previewLoading={previewLoading}
      />

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-medium">Druckfreigabe</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {DRUCK_INFO.summary}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Druckfläche 3 × 2 cm · Schachbrett = transparente Bereiche in der PNG
          </p>
        </div>

        <CheckerboardBg className="p-6">
          <div
            className="mx-auto max-w-[280px] aspect-[3/2] rounded-sm border-2 border-dashed border-zinc-500/50 flex flex-col items-center justify-center p-3 gap-3"
            title="Druckfläche im Zielmaß-Verhältnis"
          >
            {logoUrl ? (
              <>
                <PrintPreviewLogoImage
                  previewUrl={previewUrl}
                  loading={previewLoading}
                  alt="Ihr Logo (Druckvorschau)"
                  className="max-w-full max-h-[calc(100%-3rem)] object-contain flex-1"
                />
                {dimensions && <PrintCheckResult dimensions={dimensions} />}
              </>
            ) : (
              <p className="text-xs text-zinc-500 text-center px-2">
                Logo erscheint hier nach Upload
              </p>
            )}
          </div>
        </CheckerboardBg>
      </div>
    </div>
  )
}
