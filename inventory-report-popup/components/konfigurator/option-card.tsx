"use client"

import Image from "next/image"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function OptionCard({
  selected,
  onClick,
  title,
  description,
  badge,
  warning,
  priceHint,
  disabled,
  imageSrc,
  imageAlt,
}: {
  selected: boolean
  onClick: () => void
  title: string
  description: string
  badge?: string
  warning?: string
  priceHint?: string
  disabled?: boolean
  imageSrc?: string
  imageAlt?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded-lg border p-4 transition-all",
        disabled
          ? "opacity-50 cursor-not-allowed border-border bg-muted/30"
          : "hover:border-primary/50",
        !disabled && selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : !disabled
            ? "border-border bg-card"
            : "",
      )}
    >
      {imageSrc && (
        <div className="mb-3 flex h-28 items-center justify-center rounded-md bg-muted/40 p-2">
          <Image
            src={imageSrc}
            alt={imageAlt ?? title}
            width={160}
            height={112}
            className="max-h-24 w-auto object-contain"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium flex items-center gap-1.5">
          {title}
          {warning && (
            <AlertCircle
              className="h-4 w-4 shrink-0 text-amber-600"
              aria-label="Hinweis"
            />
          )}
        </span>
        {badge && (
          <span className="text-xs shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
      {warning && (
        <p className="mt-2 text-xs text-amber-700 leading-relaxed">{warning}</p>
      )}
      {priceHint && (
        <p className="mt-2 text-xs font-medium text-foreground">{priceHint}</p>
      )}
    </button>
  )
}
