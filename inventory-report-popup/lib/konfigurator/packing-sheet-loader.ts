import { listFulfillmentEvents } from "@/lib/actions/fulfillment"
import { getQuoteById } from "@/lib/actions/quotes"
import { getQuoteWarehouseData } from "@/lib/actions/quote-warehouse"
import {
  buildPackingSheetData,
  type PackingSheetData,
} from "@/lib/konfigurator/packing-sheet"

export async function loadPackingSheetForQuote(
  quoteId: number,
): Promise<PackingSheetData | null> {
  const quote = await getQuoteById(quoteId)
  if (!quote) return null

  const [warehouse, events] = await Promise.all([
    getQuoteWarehouseData(quoteId),
    listFulfillmentEvents(quoteId).catch(() => []),
  ])

  return buildPackingSheetData(quote, warehouse, events)
}
