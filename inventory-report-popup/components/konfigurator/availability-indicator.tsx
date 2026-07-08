"use client"

import { Loader2 } from "lucide-react"
import type { AvailabilityResponse } from "@/lib/actions/n8n-api"
import { formatAvailabilityStandDatum } from "@/lib/konfigurator/availability-stress"

export function AvailabilityIndicator({
  availability,
  loading,
}: {
  availability: AvailabilityResponse | null
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verfügbarkeit wird geprüft …
      </div>
    )
  }

  if (!availability) return null

  const markerLeft = `clamp(0px, ${availability.stressScore}%, calc(100% - 12px))`

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Aktuelle Verfügbarkeit</p>
        <p className="text-sm text-muted-foreground">{availability.stressLabel}</p>
      </div>

      <div className="relative pt-1 pb-5">
        <div
          className="h-2.5 w-full rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 shadow-inner"
          aria-hidden
        />
        <div
          className="absolute top-0 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-foreground shadow-md"
          style={{ left: markerLeft }}
          title={availability.stressLabel}
        />
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
          <span>entspannt</span>
          <span>angespannt</span>
        </div>
      </div>

      <p className="text-sm">
        {availability.verfuegbar ? (
          <span className="text-green-700 font-medium">
            Voraussichtlich verfügbar für Ihren Termin
          </span>
        ) : (
          <span className="text-destructive font-medium">
            Voraussichtlich nicht verfügbar für Ihren Termin
          </span>
        )}
      </p>

      {availability.hinweis && (
        <p className="text-xs text-muted-foreground leading-relaxed">{availability.hinweis}</p>
      )}

      {availability.pendingInquiries > 0 && (
        <p className="text-xs text-muted-foreground">
          {availability.pendingInquiries} offene Anfrage
          {availability.pendingInquiries === 1 ? "" : "n"} im ähnlichen Zeitraum
        </p>
      )}

      <p className="text-[11px] text-muted-foreground border-t pt-2">
        Angebot und Verfügbarkeit gültig zum Stand{" "}
        <strong>{formatAvailabilityStandDatum(availability.standDatum)}</strong>
      </p>
    </div>
  )
}
