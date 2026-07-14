"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BookingForm } from "./booking-form"
import { useRouter } from "next/navigation"
import type { BookingWithRelations, BookingType, BatchRow } from "@/lib/types"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BookingModalProps {
  groups: Array<{ id: number; name: string }>
  batches: BatchRow[]
  customers: Array<{ id: number; name: string; email: string | null; telefon: string | null }>
  bases: Array<{ id: number; bezeichnung: string; hersteller: string; kanalanzahl: number; firmwareversion: string | null; funktionsumfang: string | null; batch_id?: number | null }>
  inventoryLots: Array<Record<string, unknown>>
  openRentals: Array<Record<string, unknown>>
  prefilledBooking?: BookingWithRelations | null
  prefilledBookingType?: BookingType | null
  dialogTitle?: string
  onBookingCreated?: (bookingId: number) => void
  onClose?: () => void
}

export function BookingModal({
  groups,
  batches,
  customers,
  bases,
  inventoryLots,
  openRentals,
  prefilledBooking,
  prefilledBookingType,
  dialogTitle,
  onBookingCreated,
  onClose,
}: BookingModalProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (prefilledBooking || prefilledBookingType) {
      setOpen(true)
    }
  }, [prefilledBooking, prefilledBookingType])

  const handleSuccess = () => {
    setOpen(false)
    if (onClose) onClose()
    router.refresh()
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen && onClose) {
      onClose()
    }
  }

  const getDialogTitle = () => {
    if (dialogTitle) return dialogTitle
    if (prefilledBooking) return "Rückgabe erstellen"
    if (prefilledBookingType === "ZUGANG") return "Zugang buchen"
    if (prefilledBookingType === "MIETE_AUSGABE") return "Vermietung buchen"
    if (prefilledBookingType === "VERKAUF") return "Verkauf buchen"
    return "Neue Buchung"
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border-0 shadow-2xl p-0"
        showCloseButton={false}
      >
        <DialogHeader className="pb-6 bg-gradient-to-r from-wristlink-navy via-wristlink-purple to-wristlink-cyan px-8 pt-6 rounded-t-lg relative">
          <DialogTitle className="text-2xl font-bold text-white">{getDialogTitle()}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/20 rounded-full h-8 w-8"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Schließen</span>
          </Button>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-8 py-4">
          <BookingForm
            groups={groups}
            batches={batches}
            customers={customers}
            bases={bases}
            inventoryLots={inventoryLots}
            openRentals={openRentals}
            onSuccess={handleSuccess}
            onBookingCreated={onBookingCreated}
            prefilledBooking={prefilledBooking}
            prefilledBookingType={prefilledBookingType}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
