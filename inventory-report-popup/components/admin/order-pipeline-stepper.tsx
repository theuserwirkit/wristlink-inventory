"use client"

import { Check, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OrderPipelineStep } from "@/lib/konfigurator/order-pipeline"

export function OrderPipelineStepper({
  steps,
  currentIndex,
}: {
  steps: OrderPipelineStep[]
  currentIndex: number
  complete?: boolean
}) {
  const progressValue =
    currentIndex >= 0 ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Fortschritt: {currentIndex >= 0 ? currentIndex + 1 : 0}/{steps.length}
        </span>
        {currentIndex >= 0 && steps[currentIndex] && (
          <span className="font-medium">{steps[currentIndex].label}</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressValue}%` }}
        />
      </div>
      <div className="flex items-start gap-0 overflow-x-auto pb-1">
        {steps.map((step, idx) => {
          const done = currentIndex > idx
          const active = currentIndex === idx
          return (
            <div key={step.key} className="flex min-w-0 flex-1 items-center last:flex-none">
              <div className="flex min-w-[4.5rem] flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && !done && "border-primary text-primary ring-2 ring-primary/30",
                    !done && !active && "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : active ? (
                    <Circle className="h-3 w-3 fill-current" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={cn(
                    "max-w-[5.5rem] text-center text-[10px] leading-tight",
                    active && "font-medium text-foreground",
                    !active && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-0.5 mt-[-1.25rem] h-0.5 min-w-[0.75rem] flex-1",
                    done ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
