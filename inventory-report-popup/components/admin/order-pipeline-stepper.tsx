"use client"

import { Check, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { OrderPipelineStep } from "@/lib/konfigurator/order-pipeline"

export function OrderPipelineStepper({
  steps,
  currentIndex,
  viewIndex,
}: {
  steps: OrderPipelineStep[]
  currentIndex: number
  viewIndex?: number
}) {
  const highlightedIndex = viewIndex ?? currentIndex

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-0 px-1">
        {steps.map((step, idx) => {
          const done = currentIndex > idx
          const active = highlightedIndex === idx
          const current = currentIndex === idx

          return (
            <div key={step.key} className="flex items-center last:flex-none">
              <div className="flex w-[4.25rem] flex-col items-center gap-1.5 sm:w-[5rem]">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    current && !done && "border-primary bg-primary/10 text-primary ring-2 ring-primary/30",
                    active && !current && !done && "border-primary/60 text-primary",
                    !done && !active && "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : current ? (
                    <Circle className="h-3 w-3 fill-current" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={cn(
                    "max-w-[5rem] text-center text-[10px] leading-tight sm:text-[11px]",
                    (active || current) && "font-medium text-foreground",
                    !active && !current && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-0.5 mt-[-1.25rem] h-0.5 w-4 shrink-0 sm:w-6",
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
