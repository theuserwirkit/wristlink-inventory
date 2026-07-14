"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import Link from "next/link"
import { Settings, Package, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingModal } from "@/components/booking/booking-modal"
import { exportBookingsToCSV } from "@/lib/actions/bookings"
import type {
  BookingWithRelations,
  BookingType,
  GroupRow,
  BatchRow,
  CustomerRow,
  BaseRow,
} from "@/lib/types"

interface OpenRental {
  id: number
  [key: string]: unknown
}

interface InventoryLot {
  id: number
  [key: string]: unknown
}

export interface BookingModalProps {
  groups: GroupRow[]
  batches: BatchRow[]
  bases: BaseRow[]
  customers: CustomerRow[]
  openRentals: OpenRental[]
  inventoryLots: InventoryLot[]
  userCanEdit: boolean
  userCanAdmin: boolean
}

interface BookingModalContextValue {
  openReturn: (booking: BookingWithRelations) => void
  openBookingType: (type: BookingType) => void
}

const BookingModalContext = createContext<BookingModalContextValue | null>(null)

export function useBookingReturnModal() {
  const ctx = useContext(BookingModalContext)
  if (!ctx) {
    throw new Error("useBookingReturnModal must be used within BookingModalProvider")
  }
  return ctx
}

export function BookingModalProvider({
  children,
  groups,
  batches,
  bases,
  customers,
  openRentals,
  inventoryLots,
}: Omit<BookingModalProps, "userCanEdit" | "userCanAdmin"> & { children: ReactNode }) {
  const [selectedRental, setSelectedRental] = useState<BookingWithRelations | null>(null)
  const [selectedBookingType, setSelectedBookingType] = useState<BookingType | null>(null)

  const handleModalClose = () => {
    setSelectedRental(null)
    setSelectedBookingType(null)
  }

  const openReturn = (booking: BookingWithRelations) => {
    setSelectedRental(booking)
    setSelectedBookingType("MIETE_RUECKGABE")
  }

  const openBookingType = (type: BookingType) => {
    setSelectedRental(null)
    setSelectedBookingType(type)
  }

  return (
    <BookingModalContext.Provider value={{ openReturn, openBookingType }}>
      {children}
      {(selectedBookingType || selectedRental) && (
        <BookingModal
          groups={groups}
          batches={batches}
          customers={customers}
          bases={bases}
          inventoryLots={inventoryLots}
          openRentals={openRentals}
          prefilledBooking={selectedRental}
          prefilledBookingType={selectedBookingType}
          onClose={handleModalClose}
        />
      )}
    </BookingModalContext.Provider>
  )
}

const outlineClassName =
  "gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"

export function OperationsHeaderActions({
  userCanEdit,
  userCanAdmin,
  mode = "operations",
}: Pick<BookingModalProps, "userCanEdit" | "userCanAdmin"> & { mode?: "operations" | "ledger" }) {
  const [isExporting, setIsExporting] = useState(false)
  const modal = useContext(BookingModalContext)

  const handleExportCSV = async () => {
    try {
      setIsExporting(true)
      const csvContent = await exportBookingsToCSV()

      if (!csvContent) {
        alert("Keine Buchungen zum Exportieren vorhanden")
        return
      }

      const filename = `buchungen_${new Date().toISOString().split("T")[0]}.csv`
      const encodedContent = encodeURIComponent(csvContent)
      const dataUri = `data:text/csv;charset=utf-8,${encodedContent}`

      const link = document.createElement("a")
      link.setAttribute("href", dataUri)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      alert("Fehler beim Exportieren der Daten")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleExportCSV}
        size="lg"
        variant="outline"
        className={outlineClassName}
        disabled={isExporting}
      >
        <Download className="h-4 w-4" />
        {isExporting ? "Exportiere..." : "CSV Export"}
      </Button>
      {userCanEdit && modal && (
        <Button
          onClick={() => modal.openBookingType("ZUGANG")}
          size="lg"
          variant="outline"
          className={outlineClassName}
        >
          <Package className="h-4 w-4" />
          Zugang
        </Button>
      )}
      {userCanAdmin && (
        <Button asChild variant="outline" size="lg" className={outlineClassName}>
          <Link href="/admin">
            <Settings className="h-4 w-4" />
            Admin
          </Link>
        </Button>
      )}
    </>
  )
}
