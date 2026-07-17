"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { QuoteWarehouseAllocationForm } from "@/components/admin/quote-warehouse-allocation-form"
import type { QuoteStationInfo, QuoteWarehouseBaseOption } from "@/lib/actions/quote-warehouse"
import type { BandBatchPool } from "@/lib/konfigurator/band-allocation"
import type { BookingWithRelations } from "@/lib/types"

export type QuoteWarehouseModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  quoteId: number
  requiredMenge: number
  booking: BookingWithRelations
  bandBatchPools: BandBatchPool[]
  stationInfo: QuoteStationInfo | null
  availableBases: QuoteWarehouseBaseOption[]
}

export function QuoteWarehouseModal({
  open,
  onOpenChange,
  quoteId,
  requiredMenge,
  booking,
  bandBatchPools,
  stationInfo,
  availableBases,
}: QuoteWarehouseModalProps) {
  const handleSuccess = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border-0 shadow-2xl p-0"
        showCloseButton={false}
      >
        <DialogHeader className="pb-6 bg-gradient-to-r from-wristlink-navy via-wristlink-purple to-wristlink-cyan px-8 pt-6 rounded-t-lg relative">
          <DialogTitle className="text-2xl font-bold text-white">
            Material packen & zuweisen – Auftrag #{quoteId}
          </DialogTitle>
          <p className="text-sm text-white/80 mt-1">
            Leuchtgruppen, Chargen und Basis-Station für diesen Konfigurator-Auftrag zuweisen
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/20 rounded-full h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Schließen</span>
          </Button>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-8 py-4">
          <QuoteWarehouseAllocationForm
            quoteId={quoteId}
            requiredMenge={requiredMenge}
            booking={booking}
            bandBatchPools={bandBatchPools}
            stationInfo={stationInfo}
            availableBases={availableBases}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
