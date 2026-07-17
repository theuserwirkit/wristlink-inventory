import { notFound, redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { loadPackingSheetForQuote } from "@/lib/konfigurator/packing-sheet-loader"
import { QuotePackingPrintView } from "@/components/print/quote-packing-print-view"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ autoprint?: string }>
}

export default async function PackingLabelsPrintPage({ params, searchParams }: PageProps) {
  if (!(await isAuthenticated())) redirect("/login")

  const { id } = await params
  const quoteId = Number(id)
  if (!Number.isFinite(quoteId)) notFound()

  const data = await loadPackingSheetForQuote(quoteId)
  if (!data) notFound()

  const { autoprint } = await searchParams

  return (
    <div className="min-h-screen bg-white">
      <QuotePackingPrintView variant="labels" data={data} autoprint={autoprint === "1"} />
    </div>
  )
}
