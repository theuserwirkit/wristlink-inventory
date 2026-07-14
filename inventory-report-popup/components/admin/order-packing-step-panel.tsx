"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { QuoteStationInfo } from "@/lib/actions/quote-warehouse"
import type { WarehousePipelineStepKey } from "@/lib/konfigurator/order-pipeline"
import type { BookingWithRelations } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Check, Circle } from "lucide-react"

type OrderPackingStepPanelProps = {
  phase: WarehousePipelineStepKey | "verpackt"
  quoteId: number
  allocationComplete: boolean
  packingDocsPrinted: boolean
  primaryBooking: BookingWithRelations | null
  stationInfo: QuoteStationInfo | null
  requiredMenge: number
  children?: ReactNode
}

function StepIndicator({
  done,
  active,
  label,
}: {
  done: boolean
  active: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
          done && "border-primary bg-primary text-primary-foreground",
          active && !done && "border-primary text-primary",
          !done && !active && "border-muted-foreground/30 text-muted-foreground",
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : active ? <Circle className="h-2 w-2 fill-current" /> : null}
      </span>
      <span className={cn(active && "font-medium", !active && done && "text-muted-foreground")}>
        {label}
      </span>
    </div>
  )
}

export function OrderPackingStepPanel({
  phase,
  quoteId,
  allocationComplete,
  packingDocsPrinted,
  primaryBooking,
  stationInfo,
  requiredMenge,
  children,
}: OrderPackingStepPanelProps) {
  const bandItems = primaryBooking?.items.filter((item) => item.group_id != null) ?? []
  const baseItems = primaryBooking?.items.filter((item) => item.base_id) ?? []
  const needsBase = stationInfo != null

  const steps = [
    { key: "material_zuweisen" as const, label: "Material zuweisen", done: allocationComplete },
    {
      key: "unterlagen_drucken" as const,
      label: "Lagerunterlagen drucken",
      done: packingDocsPrinted,
    },
    {
      key: "verpackt" as const,
      label: "Als gepackt markieren",
      done: phase !== "verpackt" && packingDocsPrinted && allocationComplete,
    },
  ]

  const descriptions: Record<WarehousePipelineStepKey | "verpackt", string> = {
    material_zuweisen:
      "Leuchtgruppen, Chargen und ggf. Basis-Station zuordnen. Nutze den Button oben: „Material zuweisen“.",
    unterlagen_drucken:
      "Pack-Checkliste und Labels drucken. Button oben: „Lagerunterlagen drucken“. Danach „Druck erledigt – weiter“.",
    verpackt: "Sets sind gepackt und bereit für den nächsten Schritt. Formular unten ausfüllen und abschließen.",
  }

  const titleByPhase: Record<WarehousePipelineStepKey | "verpackt", string> = {
    material_zuweisen: "Material zuweisen",
    unterlagen_drucken: "Lagerunterlagen drucken",
    verpackt: "Als gepackt markieren",
  }

  return (
    <div className="space-y-5 rounded-lg border bg-muted/20 p-4">
      <div className="space-y-2">
        {steps.map((step) => (
          <StepIndicator
            key={step.key}
            done={step.done}
            active={phase === step.key}
            label={step.label}
          />
        ))}
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold">{titleByPhase[phase]}</h3>
        <p className="text-sm text-muted-foreground">{descriptions[phase]}</p>
      </div>

      {phase !== "verpackt" && primaryBooking && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium">Aktuelle Zuweisung</h4>
            <Link
              href={`/warenverwaltung/buchungen?highlight=${primaryBooking.id}`}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Im Protokoll
            </Link>
          </div>

          <div className="overflow-x-auto rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leuchtgruppe</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead className="text-right">Anzahl</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bandItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-sm text-muted-foreground">
                      Noch keine Bänder zugewiesen ({requiredMenge} benötigt)
                    </TableCell>
                  </TableRow>
                ) : (
                  bandItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.group?.name || "–"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.batch?.code || "–"}</TableCell>
                      <TableCell className="text-right font-mono">{item.anzahl}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {needsBase && (
            <div className="overflow-x-auto rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Basis-Station</TableHead>
                    <TableHead>Seriennummer</TableHead>
                    <TableHead className="text-right">Anzahl</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baseItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-sm text-amber-700 dark:text-amber-400">
                        Basis-Station noch nicht zugewiesen
                      </TableCell>
                    </TableRow>
                  ) : (
                    baseItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.base?.bezeichnung || "–"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.base?.seriennummer || "–"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.anzahl_basen ?? item.anzahl ?? 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {allocationComplete && phase === "material_zuweisen" && (
            <Badge variant="outline" className="border-emerald-300 text-emerald-700">
              Zuweisung vollständig – Seite aktualisieren oder weiter zum Druck
            </Badge>
          )}
        </div>
      )}

      {phase !== "verpackt" && !primaryBooking && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Keine Buchung verknüpft. Bitte im Tab „Lager“ eine Buchung anlegen.
        </p>
      )}

      {children}
    </div>
  )
}
