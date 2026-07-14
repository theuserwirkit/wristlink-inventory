import { notFound, redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { getQuoteById } from "@/lib/actions/quotes"
import { getQuoteWarehouseData } from "@/lib/actions/quote-warehouse"
import { buildPackingSheetData } from "@/lib/konfigurator/packing-sheet"
import { QuotePackingPrintView } from "@/components/print/quote-packing-print-view"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ autoprint?: string }>
}

export default async function PackingChecklistPrintPage({ params, searchParams }: PageProps) {
  if (!(await isAuthenticated())) redirect("/login")

  const { id } = await params
  const quoteId = Number(id)
  if (!Number.isFinite(quoteId)) notFound()

  const quote = await getQuoteById(quoteId)
  if (!quote) notFound()

  const warehouse = await getQuoteWarehouseData(quoteId)
  const data = buildPackingSheetData(quote, warehouse)
  const { autoprint } = await searchParams

  return (
    <div className="min-h-screen bg-white">
      <QuotePackingPrintView variant="checklist" data={data} autoprint={autoprint === "1"} />
    </div>
  )
}
