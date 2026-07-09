"use client"

import { Loader2 } from "lucide-react"
import type { PreisEngineResult } from "@/lib/pricing/types"
import { formatEur } from "@/lib/pricing/preis-engine"
import { displayPositionen, formatPriceSummary } from "@/lib/pricing/display"
import { PRICING_NOTICE_B2B } from "@/lib/konfigurator/consent"

function formatEventDatum(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
}

export function StickyPriceBox({
  price,
  loading,
  compact,
  availabilityStand,
  showPrice = true,
  placeholder,
  menge,
  produktLabel,
  eventDatum,
}: {
  price: PreisEngineResult | null
  loading: boolean
  compact?: boolean
  availabilityStand?: string | null
  /** Preis erst anzeigen, wenn Produkt & Lieferung gewählt wurden */
  showPrice?: boolean
  placeholder?: string
  menge?: number
  produktLabel?: string
  eventDatum?: string | null
}) {
  const showKonfigSummary = showPrice && menge != null && produktLabel

  return (
    <div className="lg:sticky lg:top-6 rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <p className="text-sm font-semibold">Ihr Angebot</p>
      <p className="text-xs text-muted-foreground">{PRICING_NOTICE_B2B}</p>

      {showKonfigSummary && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
          <p>
            <span className="text-muted-foreground">Menge: </span>
            <span className="font-medium">
              {menge.toLocaleString("de-DE")}× {produktLabel}
            </span>
          </p>
          {eventDatum && (
            <p>
              <span className="text-muted-foreground">Event: </span>
              <span className="font-medium">{formatEventDatum(eventDatum)}</span>
            </p>
          )}
        </div>
      )}

      {!showPrice ? (
        <p className="text-xs text-muted-foreground py-4 text-center leading-relaxed">
          {placeholder ??
            "Preis erscheint, sobald Sie die Menge Ihrer LED-Armbänder gewählt haben."}
        </p>
      ) : loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : price?.gueltig ? (
        <>
          {!compact && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
              {displayPositionen(price.positionen).map((p, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">{p.pos}</span>
                  <span className="shrink-0">{formatEur(p.summe)}</span>
                </div>
              ))}
            </div>
          )}
          {(() => {
            const s = formatPriceSummary(price)
            return (
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Netto</span>
                  <span className="font-medium">{s.nettoLabel}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>zzgl. 19 % MwSt.</span>
                  <span>{s.mwstLabel}</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-1">
                  <span>Zahlung</span>
                  <span>{s.bruttoLabel}</span>
                </div>
              </div>
            )
          })()}
        </>
      ) : price && !price.gueltig ? (
        <p className="text-xs text-destructive">{price.fehler.join(" · ")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Preis wird berechnet …</p>
      )}
      {availabilityStand && (
        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Angebot gültig zum Stand <strong>{availabilityStand}</strong>
        </p>
      )}
    </div>
  )
}
