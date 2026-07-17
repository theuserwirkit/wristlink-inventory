"use client"

import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"
import { AutoPrint } from "@/components/print/auto-print"
import { QuoteBagLabels } from "@/components/print/quote-bag-labels"
import { QuotePackingChecklist } from "@/components/print/quote-packing-checklist"
import { QuoteWarehouseOverview } from "@/components/print/quote-warehouse-overview"

export type QuotePackingPrintVariant = "labels" | "checklist" | "overview"

type QuotePackingPrintViewProps = {
  variant: QuotePackingPrintVariant
  data: PackingSheetData
  autoprint?: boolean
}

export function QuotePackingPrintView({
  variant,
  data,
  autoprint = false,
}: QuotePackingPrintViewProps) {
  return (
    <>
      <AutoPrint autoprint={autoprint} />
      {variant === "labels" && <QuoteBagLabels data={data} />}
      {variant === "checklist" && <QuotePackingChecklist data={data} />}
      {variant === "overview" && <QuoteWarehouseOverview data={data} />}
    </>
  )
}
