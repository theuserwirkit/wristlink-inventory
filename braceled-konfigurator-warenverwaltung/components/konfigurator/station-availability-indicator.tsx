"use client"

import { Loader2 } from "lucide-react"
import type { StationAvailability } from "@/lib/konfigurator/station-availability"
import { STATION_TYP_LABELS, type BaseStationTyp } from "@/lib/konfigurator/station-types"

export function StationAvailabilityIndicator({
  station,
  availability,
  loading,
}: {
  station: string
  kanalanzahl?: number
  availability: StationAvailability | null
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Controller-Verfügbarkeit wird geprüft …
      </div>
    )
  }

  if (!availability) return null

  const label =
    station === "eco" || station === "pro"
      ? STATION_TYP_LABELS[station as BaseStationTyp]
      : "Controller"
  const markerLeft = `clamp(0px, ${availability.stressScore}%, calc(100% - 12px))`

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Controller-Verfügbarkeit</p>
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
            {label} voraussichtlich verfügbar für Ihren Termin
          </span>
        ) : (
          <span className="text-destructive font-medium">
            {label} voraussichtlich nicht verfügbar für Ihren Termin
          </span>
        )}
      </p>

      {availability.hinweis && (
        <p className="text-xs text-muted-foreground leading-relaxed">{availability.hinweis}</p>
      )}
    </div>
  )
}
