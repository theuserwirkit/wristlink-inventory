import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { getQuoteById, getQuoteRequestStats } from "@/lib/actions/quotes"
import { listFulfillmentEvents } from "@/lib/actions/fulfillment"
import {
  getGroups,
  getBatches,
  getBases,
  getCustomers,
  getOpenRentals,
  getInventoryLots,
} from "@/lib/actions/bookings"
import {
  getQuoteWarehouseData,
  getWarehousePipelineContext,
  isQuoteWarehouseReadyForPrint,
} from "@/lib/actions/quote-warehouse"
import { isStripeConfigured } from "@/lib/konfigurator/stripe"
import { isSevdeskConfigured } from "@/lib/konfigurator/sevdesk"
import { OperationsShell } from "@/components/dashboard/operations-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { AuftragDetailView } from "@/components/admin/auftrag-detail-view"
import { AuftragInfoTab } from "@/components/admin/auftrag-info-tab"
import { STATUS_LABELS, SOURCE_LABELS, statusBadgeVariant } from "@/lib/konfigurator/quote-status"
import { loadPackingSheetForQuote } from "@/lib/konfigurator/packing-sheet-loader"
import { FULFILLMENT_STATUS_LABELS } from "@/lib/konfigurator/fulfillment-status"

export const dynamic = "force-dynamic"

export default async function AuftragDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await isAuthenticated())) redirect("/login")

  const { id } = await params
  const quoteId = Number(id)
  if (!Number.isFinite(quoteId)) notFound()

  const [quote, quoteStats] = await Promise.all([getQuoteById(quoteId), getQuoteRequestStats()])
  if (!quote) notFound()

  const config = quote.config_json

  const needsReturnModal =
    quote.fulfillment_status === "zurueckgepackt" &&
    config.modus === "miete" &&
    Boolean(quote.booking_id) &&
    !quote.return_booking_id

  const needsBookingModalProps =
    quote.status === "paid" ||
    (config.modus === "miete" && Boolean(quote.booking_id)) ||
    needsReturnModal

  const [events, warehouseData, bookingModalData, canPrintWarehouseLabels, warehouseContext, packingSheetData] =
    await Promise.all([
      ["paid", "approved", "payment_pending", "submitted"].includes(quote.status)
        ? listFulfillmentEvents(quoteId).catch(() => [])
        : Promise.resolve([]),
      getQuoteWarehouseData(quoteId),
      needsBookingModalProps
        ? Promise.all([
            getGroups(),
            getBatches(),
            getCustomers(),
            getBases(),
            getInventoryLots(),
            getOpenRentals(),
          ]).then(([groups, batches, customers, bases, inventoryLots, openRentals]) => ({
            groups,
            batches,
            customers,
            bases,
            inventoryLots,
            openRentals,
          }))
        : Promise.resolve(null),
      quote.status === "paid" ? isQuoteWarehouseReadyForPrint(quoteId) : Promise.resolve(false),
      quote.status === "paid"
        ? getWarehousePipelineContext(quoteId)
        : Promise.resolve({ allocationComplete: false, packingDocsPrinted: false }),
      quote.status === "paid"
        ? loadPackingSheetForQuote(quoteId).catch(() => null)
        : Promise.resolve(null),
    ])

  const bookingModalProps = bookingModalData
    ? {
        groups: bookingModalData.groups,
        batches: bookingModalData.batches,
        customers: bookingModalData.customers,
        bases: bookingModalData.bases,
        inventoryLots: bookingModalData.inventoryLots,
        openRentals: bookingModalData.openRentals,
      }
    : null

  const price = quote.price_snapshot_json as {
    positionen?: { pos: string; summe: number }[]
    gesamt_netto?: number
    mwst_19?: number
    gesamt_brutto?: number
  }
  const userCanAdmin = true

  const resolvedWarehouseContext = {
    ...warehouseContext,
    packingDocsPrinted:
      Boolean(quote.packing_docs_printed_at) || warehouseContext.packingDocsPrinted,
  }

  const warehousePanelProps = {
    quoteId: quote.id,
    quoteStatus: quote.status,
    modus: config.modus as "miete" | "kauf",
    requiredMenge: config.menge,
    hasDruck: Boolean(config.druck),
    canPrint: canPrintWarehouseLabels,
    fulfillmentStatus: quote.fulfillment_status,
    warehouseData: {
      primaryBooking: warehouseData.primaryBooking,
      returnBooking: warehouseData.returnBooking,
      remainingByGroup: warehouseData.remainingByGroup,
      stationInfo: warehouseData.stationInfo,
      availableBases: warehouseData.availableBases,
      bandBatchPools: warehouseData.bandBatchPools,
    },
    groups: bookingModalData?.groups ?? [],
    batches: bookingModalData?.batches ?? [],
    bookingModalProps:
      bookingModalProps ?? {
        groups: [],
        batches: [],
        customers: [],
        bases: [],
        inventoryLots: [],
        openRentals: [],
      },
  }

  return (
    <OperationsShell activeTab="auftraege" quoteStats={quoteStats} userCanAdmin={userCanAdmin}>
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0 mt-0.5">
              <Link href="/warenverwaltung/auftraege">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Auftrag #{quote.id}</h2>
              <p className="text-sm text-muted-foreground">{quote.lead_email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{SOURCE_LABELS[quote.source]}</Badge>
            <Badge variant={statusBadgeVariant(quote.status)}>
              {STATUS_LABELS[quote.status] || quote.status}
            </Badge>
            {quote.fulfillment_status && (
              <Badge variant="secondary">
                {FULFILLMENT_STATUS_LABELS[quote.fulfillment_status]}
              </Badge>
            )}
          </div>
        </div>

        <AuftragDetailView
          quote={quote}
          leadEmail={quote.lead_email || ""}
          events={events}
          stripeConfigured={isStripeConfigured()}
          sevdeskConfigured={isSevdeskConfigured()}
          warehouseContext={resolvedWarehouseContext}
          warehousePanelProps={warehousePanelProps}
          packingSheetData={packingSheetData}
          infoTab={<AuftragInfoTab quote={quote} config={config} price={price} />}
        />
      </div>
    </OperationsShell>
  )
}
