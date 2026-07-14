"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { QuoteWarehouseModal } from "@/components/admin/quote-warehouse-modal"
import { QuotePackingPrintModal } from "@/components/admin/quote-packing-print-modal"
import { confirmPackingDocsPrinted } from "@/lib/actions/quote-warehouse"
import type { QuoteStationInfo, QuoteWarehouseBaseOption } from "@/lib/actions/quote-warehouse"
import type { BandBatchPool } from "@/lib/konfigurator/band-allocation"
import type { OrderPipelineStepKey } from "@/lib/konfigurator/order-pipeline"
import type { BookingWithRelations } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { Check, Loader2, Package } from "lucide-react"

type OrderPrimaryActionProps = {
  phase: OrderPipelineStepKey | null
  stepLabel: string
  stepNumber: number
  totalSteps: number
  quoteId: number
  canPrint: boolean
  primaryBooking: BookingWithRelations | null
  requiredMenge: number
  bandBatchPools: BandBatchPool[]
  stationInfo: QuoteStationInfo | null
  availableBases: QuoteWarehouseBaseOption[]
}

export function OrderPrimaryAction({
  phase,
  stepLabel,
  stepNumber,
  totalSteps,
  quoteId,
  canPrint,
  primaryBooking,
  requiredMenge,
  bandBatchPools,
  stationInfo,
  availableBases,
}: OrderPrimaryActionProps) {
  const router = useRouter()
  const [openMaterial, setOpenMaterial] = useState(false)
  const [openPrint, setOpenPrint] = useState(false)
  const [confirmingPrint, setConfirmingPrint] = useState(false)

  if (!phase || phase === "freigabe" || phase === "geldeingang") return null
  if (
    phase !== "material_zuweisen" &&
    phase !== "unterlagen_drucken" &&
    phase !== "verpackt"
  ) {
    return null
  }

  const ctaClass =
    "w-full gap-2 bg-gradient-to-r from-wristlink-cyan to-wristlink-purple hover:from-wristlink-cyan/90 hover:to-wristlink-purple/90 text-white font-semibold shadow-md h-11 text-base"

  async function handleConfirmPrint() {
    setConfirmingPrint(true)
    try {
      const result = await confirmPackingDocsPrinted(quoteId)
      if (result.success) {
        setOpenPrint(false)
        toast({
          title: "Druck bestätigt",
          description: "Weiter mit „Als gepackt markieren“ im Tab Abwicklung.",
        })
        router.refresh()
        requestAnimationFrame(() => {
          document.getElementById("auftrag-workflow-panel")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        })
      } else {
        toast({
          title: "Nicht möglich",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      })
    } finally {
      setConfirmingPrint(false)
    }
  }

  return (
    <>
      <QuotePackingPrintModal
        quoteId={quoteId}
        quoteStatus="paid"
        canPrint={canPrint}
        open={openPrint}
        onOpenChange={setOpenPrint}
        showTrigger={false}
        onConfirmPrint={() => void handleConfirmPrint()}
        confirmingPrint={confirmingPrint}
      />

      <div className="sticky top-0 z-10 -mx-1 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <p className="mb-2 text-xs text-muted-foreground">
          Schritt {stepNumber} von {totalSteps}: {stepLabel}
        </p>

        {phase === "material_zuweisen" && (
          <>
            <Button
              type="button"
              onClick={() => setOpenMaterial(true)}
              disabled={!primaryBooking}
              className={ctaClass}
            >
              <Package className="h-5 w-5" />
              Material zuweisen
            </Button>
            {!primaryBooking && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Zuerst muss eine Buchung verknüpft sein (siehe Tab Lager).
              </p>
            )}
            {primaryBooking && (
              <QuoteWarehouseModal
                open={openMaterial}
                onOpenChange={setOpenMaterial}
                quoteId={quoteId}
                requiredMenge={requiredMenge}
                booking={primaryBooking}
                bandBatchPools={bandBatchPools}
                stationInfo={stationInfo}
                availableBases={availableBases}
              />
            )}
          </>
        )}

        {phase === "unterlagen_drucken" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => setOpenPrint(true)}
              disabled={!canPrint}
              className={`${ctaClass} flex-1`}
            >
              <Package className="h-5 w-5" />
              Lagerunterlagen drucken
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleConfirmPrint()}
              disabled={confirmingPrint}
              className="h-11 shrink-0 gap-2 font-medium"
            >
              {confirmingPrint ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Druck erledigt – weiter
            </Button>
          </div>
        )}

        {phase === "verpackt" && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={() => {
              document.getElementById("auftrag-workflow-panel")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }}
          >
            <Package className="h-4 w-4" />
            Als gepackt markieren – zum Formular
          </Button>
        )}
      </div>
    </>
  )
}
