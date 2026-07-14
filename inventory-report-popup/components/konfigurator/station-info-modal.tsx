"use client"

import Image from "next/image"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  STATION_COMPARISON,
  STATION_DETAIL,
  STATION_TECH_DOC_URL,
  type StationDetail,
} from "@/lib/konfigurator/product-info"

export function StationInfoModal({
  station,
  open,
  onOpenChange,
}: {
  station: "eco" | "pro" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!station) return null

  const detail: StationDetail = STATION_DETAIL[station]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail.title}</DialogTitle>
          <DialogDescription>{detail.subtitle}</DialogDescription>
        </DialogHeader>

        <div
          className={
            detail.secondaryImage
              ? "grid gap-3 sm:grid-cols-2"
              : "flex items-center justify-center rounded-lg bg-muted/40 p-4"
          }
        >
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/40 p-4">
            <Image
              src={detail.imageSrc}
              alt={detail.title}
              width={480}
              height={320}
              className="max-h-44 w-auto object-contain"
            />
            {detail.secondaryImage && (
              <p className="mt-2 text-xs text-muted-foreground">Vorderseite</p>
            )}
          </div>
          {detail.secondaryImage && (
            <div className="flex flex-col items-center justify-center rounded-lg bg-muted/40 p-4">
              <Image
                src={detail.secondaryImage.src}
                alt={detail.secondaryImage.label}
                width={480}
                height={320}
                className="max-h-44 w-auto object-contain"
              />
              <p className="mt-2 text-xs text-muted-foreground">{detail.secondaryImage.label}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Funktionen</h3>
            <ul className="mt-2 space-y-3">
              {detail.features.map((feature) => (
                <li key={feature.title} className="text-sm">
                  <span className="font-medium">{feature.title}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {detail.limitations && detail.limitations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Hinweise</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {detail.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Ideal für: </span>
            {detail.idealFor}
          </p>

          <Link
            href={STATION_TECH_DOC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Technische Dokumentation
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function StationComparisonModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ECO vs. PRO – Kurzvergleich</DialogTitle>
          <DialogDescription>
            Welcher Controller passt zu Ihrem Event? Details per Info-Button auf der jeweiligen Karte.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Merkmal</th>
                <th className="px-3 py-2 font-medium">ECO</th>
                <th className="px-3 py-2 font-medium">PRO</th>
              </tr>
            </thead>
            <tbody>
              {STATION_COMPARISON.map((row) => (
                <tr key={row.label} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{row.label}</td>
                  <td className="px-3 py-2 text-xs">{row.eco}</td>
                  <td className="px-3 py-2 text-xs">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
