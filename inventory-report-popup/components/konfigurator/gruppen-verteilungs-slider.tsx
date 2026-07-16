"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  GRUPPEN_SEGMENT_COLORS,
  GRUPPEN_SLIDER_STEP,
  boundariesToGroessen,
  groessenToBoundaries,
} from "@/lib/konfigurator/gruppen-config"
import { cn } from "@/lib/utils"

type GruppenVerteilungsSliderProps = {
  menge: number
  groessen: number[]
  onChange: (next: number[]) => void
  disabled?: boolean
}

export function GruppenVerteilungsSlider({
  menge,
  groessen,
  onChange,
  disabled = false,
}: GruppenVerteilungsSliderProps) {
  const n = groessen.length
  if (n === 0) return null

  const boundaries = groessenToBoundaries(groessen)
  const sum = groessen.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      <Label>Bänder aufteilen</Label>
      <div
        className="grid gap-2 text-center text-xs"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {groessen.map((groesse, index) => (
          <div key={index}>
            <div
              className="font-medium"
              style={{ color: GRUPPEN_SEGMENT_COLORS[index % GRUPPEN_SEGMENT_COLORS.length] }}
            >
              Gruppe {index + 1}
            </div>
            <div className="text-muted-foreground">{groesse} Stück</div>
          </div>
        ))}
      </div>

      <div className="relative py-2">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full"
          aria-hidden
        >
          <div className="flex h-full w-full">
            {groessen.map((groesse, index) => (
              <div
                key={index}
                className="h-full min-w-0"
                style={{
                  flex: Math.max(groesse, 1),
                  backgroundColor: GRUPPEN_SEGMENT_COLORS[index % GRUPPEN_SEGMENT_COLORS.length],
                }}
              />
            ))}
          </div>
        </div>

        {n >= 2 ? (
          <Slider
            min={0}
            max={menge}
            step={GRUPPEN_SLIDER_STEP}
            minStepsBetweenThumbs={1}
            value={boundaries}
            onValueChange={(nextBoundaries) => {
              onChange(boundariesToGroessen(nextBoundaries, menge))
            }}
            disabled={disabled}
            className={cn(
              "relative z-10",
              "**:data-[slot=slider-track]:bg-transparent",
              "**:data-[slot=slider-range]:opacity-0",
            )}
          />
        ) : (
          <div className="h-5" aria-hidden />
        )}
      </div>

      <p
        className={cn(
          "text-xs",
          sum !== menge ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {sum} von {menge} Bändern auf {n} Gruppe(n) verteilt
        {sum !== menge ? " – bitte Verteilung anpassen" : ""}
      </p>
    </div>
  )
}
