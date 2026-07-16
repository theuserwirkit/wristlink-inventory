"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Loader2, Package, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OrderPipelineStepper } from "@/components/admin/order-pipeline-stepper"
import { OrderPackingChecklistUi } from "@/components/admin/order-packing-checklist-ui"
import { QuoteApprovalActions } from "@/components/admin/quote-approval-actions"
import { QuotePaymentActions } from "@/components/admin/quote-payment-actions"
import { QuoteFulfillmentWorkflow } from "@/components/admin/quote-fulfillment-workflow"
import { QuoteWarehouseModal } from "@/components/admin/quote-warehouse-modal"
import { QuotePackingPrintModal } from "@/components/admin/quote-packing-print-modal"
import { QuoteWarehousePanel, type QuoteWarehousePanelProps } from "@/components/admin/quote-warehouse-panel"
import { confirmPackingDocsPrinted } from "@/lib/actions/quote-warehouse"
import {
  getOrderPipelinePhase,
  getOrderPipelineProgressIndex,
  getOrderPipelineSteps,
  isOrderPipelineComplete,
  type OrderPipelineStepKey,
  type WarehousePipelineContext,
} from "@/lib/konfigurator/order-pipeline"
import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"
import { buildOrderContext } from "@/lib/konfigurator/order-context"
import type { QuoteFulfillmentEvent, QuoteRequest } from "@/lib/konfigurator/types"
import { toast } from "@/hooks/use-toast"

const STEP_INTRO: Partial<Record<OrderPipelineStepKey, string>> = {
  material_zuweisen:
    "Leuchtgruppen, Chargen und ggf. Basis-Station zuordnen. Vollständige Zuweisung ist Voraussetzung für den Druck.",
  unterlagen_drucken:
    "Pack-Checkliste, Tüten-Labels und Übersicht im Popup öffnen, drucken und danach den Schritt abschließen.",
  verpackt:
    "Alles laut Checkliste in die Tüten packen, dann als gepackt markieren.",
}

export function QuoteOrderWorkflow({
  quote,
  leadEmail,
  events,
  stripeConfigured,
  sevdeskConfigured,
  warehouseContext,
  warehousePanelProps,
  packingSheetData,
}: {
  /** Ohne `public_token` – der Token wird ausschließlich im Info-Tab serverseitig gerendert. */
  quote: Omit<QuoteRequest, "public_token">
  leadEmail: string
  events: QuoteFulfillmentEvent[]
  stripeConfigured: boolean
  sevdeskConfigured: boolean
  warehouseContext: WarehousePipelineContext
  warehousePanelProps: QuoteWarehousePanelProps
  packingSheetData: PackingSheetData | null
}) {
  const router = useRouter()
  const [viewIndex, setViewIndex] = useState(0)
  const [openMaterial, setOpenMaterial] = useState(false)
  const [openPrint, setOpenPrint] = useState(false)
  const [actionPending, setActionPending] = useState(false)

  if (["rejected", "expired", "cancelled", "draft"].includes(quote.status)) {
    return null
  }

  const hasDruck = Boolean(quote.config_json.druck)
  const steps = getOrderPipelineSteps(hasDruck)
  const currentIndex = getOrderPipelineProgressIndex(quote, hasDruck, warehouseContext)
  const phase = getOrderPipelinePhase(quote, hasDruck, warehouseContext)
  const complete = isOrderPipelineComplete(quote, hasDruck)
  const orderContext = buildOrderContext(quote)
  const viewStep = steps[viewIndex]
  const viewKey = viewStep?.key
  const isViewingCurrent = viewIndex === currentIndex
  const isViewingPast = viewIndex < currentIndex
  const primaryBooking = warehousePanelProps.warehouseData.primaryBooking

  useEffect(() => {
    setViewIndex(currentIndex)
  }, [currentIndex])

  async function handleConfirmPrint() {
    setActionPending(true)
    try {
      const result = await confirmPackingDocsPrinted(quote.id)
      if (result.success) {
        setOpenPrint(false)
        toast({ title: "Druck bestätigt", description: "Weiter mit „Als gepackt markieren“." })
        router.refresh()
      } else {
        toast({ title: "Nicht möglich", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    } finally {
      setActionPending(false)
    }
  }

  function handlePrimaryAction() {
    if (!isViewingCurrent || !phase) return

    if (phase === "material_zuweisen") {
      if (!warehouseContext.allocationComplete) {
        setOpenMaterial(true)
        return
      }
      router.refresh()
      return
    }

    if (phase === "unterlagen_drucken") {
      void handleConfirmPrint()
      return
    }

    if (quote.status === "paid") {
      document.getElementById("fulfillment-advance-btn")?.click()
    }
  }

  function primaryLabel(): string {
    if (!phase) return "Schritt abschließen"
    if (phase === "material_zuweisen") {
      return warehouseContext.allocationComplete
        ? "Zuweisung abschließen"
        : "Material zuweisen"
    }
    if (phase === "unterlagen_drucken") return "Druck erledigt – Schritt abschließen"
    if (phase === "verpackt") return "Als gepackt markieren"
    return `Schritt abschließen: ${steps[currentIndex]?.label ?? ""}`
  }

  const isWarehousePhase =
    phase === "material_zuweisen" ||
    phase === "unterlagen_drucken" ||
    phase === "verpackt"

  const showFooter = !complete || viewIndex > 0
  const showPrimary =
    isViewingCurrent &&
    (isWarehousePhase || (quote.status === "paid" && phase && phase !== "freigabe" && phase !== "geldeingang"))

  function renderStepContent() {
    if (!viewKey) return null

    if (viewKey === "freigabe" && quote.status === "submitted") {
      return (
        <QuoteApprovalActions
          quoteId={quote.id}
          status={quote.status}
          source={quote.source}
          stripeConfigured={stripeConfigured}
          offerPdfFilename={quote.offer_pdf_filename}
          sevdeskConfigured={sevdeskConfigured}
          sevdeskOrderNumber={quote.sevdesk_order_number}
          embedded
        />
      )
    }

    if (viewKey === "geldeingang") {
      return (
        <div className="space-y-4">
          <QuotePaymentActions
            quoteId={quote.id}
            status={quote.status}
            stripePaymentLinkUrl={quote.stripe_payment_link_url}
            offerPdfFilename={quote.offer_pdf_filename}
            sevdeskConfigured={sevdeskConfigured}
            sevdeskOrderNumber={quote.sevdesk_order_number}
            embedded
          />
          {(quote.status === "approved" || quote.status === "payment_pending") && (
            <QuoteApprovalActions
              quoteId={quote.id}
              status={quote.status}
              source={quote.source}
              stripeConfigured={stripeConfigured}
              offerPdfFilename={quote.offer_pdf_filename}
              sevdeskConfigured={sevdeskConfigured}
              sevdeskOrderNumber={quote.sevdesk_order_number}
              embedded
            />
          )}
        </div>
      )
    }

    if (viewKey === "material_zuweisen") {
      return (
        <div className="space-y-3">
          <QuoteWarehousePanel {...warehousePanelProps} embedded variant="reference" />
        </div>
      )
    }

    if (viewKey === "unterlagen_drucken") {
      return (
        <p className="text-sm text-muted-foreground">
          {STEP_INTRO.unterlagen_drucken}
          {isViewingPast && " (Schritt bereits erledigt.)"}
        </p>
      )
    }

    if (viewKey === "verpackt") {
      return (
        <div className="space-y-4">
          {packingSheetData ? (
            <OrderPackingChecklistUi data={packingSheetData} />
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Checkliste verfügbar, sobald die Material-Zuweisung vollständig ist.
            </p>
          )}
          {isViewingCurrent && leadEmail && (
            <QuoteFulfillmentWorkflow
              quote={quote}
              leadEmail={leadEmail}
              events={events}
              embedded
              hideAdvanceButtons
            />
          )}
        </div>
      )
    }

    if (
      quote.status === "paid" &&
      leadEmail &&
      typeof viewKey === "string" &&
      !["freigabe", "geldeingang", "material_zuweisen", "unterlagen_drucken"].includes(viewKey)
    ) {
      return (
        <QuoteFulfillmentWorkflow
          quote={quote}
          leadEmail={leadEmail}
          events={events}
          embedded
          hideAdvanceButtons={isViewingCurrent}
        />
      )
    }

    if (complete) {
      return <p className="text-sm text-muted-foreground">Alle Schritte abgeschlossen.</p>
    }

    return (
      <p className="text-sm text-muted-foreground">
        {STEP_INTRO[viewKey as OrderPipelineStepKey] ?? "Schritt ausstehend."}
      </p>
    )
  }

  return (
    <>
      <QuotePackingPrintModal
        quoteId={quote.id}
        quoteStatus={quote.status}
        canPrint={warehousePanelProps.canPrint ?? false}
        open={openPrint}
        onOpenChange={setOpenPrint}
        showTrigger={false}
        onConfirmPrint={() => void handleConfirmPrint()}
        confirmingPrint={actionPending}
      />

      {primaryBooking && (
        <QuoteWarehouseModal
          open={openMaterial}
          onOpenChange={setOpenMaterial}
          quoteId={quote.id}
          requiredMenge={quote.config_json.menge}
          booking={primaryBooking}
          bandBatchPools={warehousePanelProps.warehouseData.bandBatchPools}
          stationInfo={warehousePanelProps.warehouseData.stationInfo}
          availableBases={warehousePanelProps.warehouseData.availableBases}
        />
      )}

      <Card id="auftrag-workflow-panel">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle>Auftragsabwicklung</CardTitle>
            <span className="text-sm text-muted-foreground">{leadEmail}</span>
          </div>
          <p className="text-sm text-muted-foreground">{orderContext}</p>
          <OrderPipelineStepper
            steps={steps}
            currentIndex={currentIndex}
            viewIndex={viewIndex}
          />

          {showFooter && (
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={viewIndex <= 0}
                onClick={() => setViewIndex((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
                Zum letzten Schritt
              </Button>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {!isViewingCurrent && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => setViewIndex(currentIndex)}
                  >
                    Zum aktuellen Schritt
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}

                {isViewingCurrent && phase === "unterlagen_drucken" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={!warehousePanelProps.canPrint}
                    onClick={() => setOpenPrint(true)}
                  >
                    <Printer className="h-4 w-4" />
                    Lagerunterlagen öffnen
                  </Button>
                )}

                {isViewingCurrent && showPrimary && (
                  <Button
                    type="button"
                    className="w-full gap-2 sm:w-auto"
                    disabled={
                      actionPending ||
                      (phase === "material_zuweisen" && !primaryBooking) ||
                      (phase === "unterlagen_drucken" && !warehousePanelProps.canPrint)
                    }
                    onClick={handlePrimaryAction}
                  >
                    {actionPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : phase === "material_zuweisen" && !warehouseContext.allocationComplete ? (
                      <Package className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {primaryLabel()}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4 border-t pt-6">
          {viewStep && (
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{viewStep.label}</h3>
              {STEP_INTRO[viewKey as OrderPipelineStepKey] && viewKey !== "unterlagen_drucken" && (
                <p className="text-sm text-muted-foreground">
                  {STEP_INTRO[viewKey as OrderPipelineStepKey]}
                </p>
              )}
            </div>
          )}
          {renderStepContent()}
        </CardContent>
      </Card>
    </>
  )
}
