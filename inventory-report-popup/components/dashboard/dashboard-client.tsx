"use client"

import { useState } from "react"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { AvailabilityTable } from "@/components/dashboard/availability-table"
import { BookingsTable } from "@/components/dashboard/bookings-table"
import Link from "next/link"
import { Settings, Package, TrendingUp, ShoppingCart, Download, CalendarDays, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingModal } from "@/components/booking/booking-modal"
import { exportBookingsToCSV } from "@/lib/actions/bookings"
import type {
  AvailabilityStats,
  BookingWithRelations,
  BookingType,
  GroupRow,
  BatchRow,
  CustomerRow,
  BaseRow,
} from "@/lib/types"

interface OpenRental { id: number; [key: string]: unknown }
interface InventoryLot { id: number; [key: string]: unknown }

interface DashboardClientProps {
  stats: AvailabilityStats[]
  bookings: BookingWithRelations[]
  groups: GroupRow[]
  batches: BatchRow[]
  bases: BaseRow[]
  baseStats: any[]
  customers: CustomerRow[]
  openRentals: OpenRental[]
  inventoryLots: InventoryLot[]
  userCanEdit: boolean
  userCanAdmin: boolean
  quoteStats?: Record<string, number>
}

export function DashboardClient({
  stats,
  bookings,
  groups,
  batches,
  bases,
  baseStats,
  customers,
  openRentals,
  inventoryLots,
  userCanEdit,
  userCanAdmin,
  quoteStats = {},
}: DashboardClientProps) {
  const [selectedRental, setSelectedRental] = useState<BookingWithRelations | null>(null)
  const [selectedBookingType, setSelectedBookingType] = useState<BookingType | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleRentalClick = (booking: BookingWithRelations) => {
    setSelectedRental(booking)
    setSelectedBookingType("MIETE_RUECKGABE")
  }

  const handleZugangClick = () => {
    setSelectedRental(null)
    setSelectedBookingType("ZUGANG")
  }

  const handleVermietungClick = () => {
    setSelectedRental(null)
    setSelectedBookingType("MIETE_AUSGABE")
  }

  const handleVerkaufClick = () => {
    setSelectedRental(null)
    setSelectedBookingType("VERKAUF")
  }

  const handleModalClose = () => {
    setSelectedRental(null)
    setSelectedBookingType(null)
  }

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
    } catch (error) {
      alert("Fehler beim Exportieren der Daten")
    } finally {
      setIsExporting(false)
    }
  }

  const pendingQuotes = (quoteStats.submitted || 0) + (quoteStats.payment_pending || 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-primary shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground text-balance">
                WIRKUNG.<span className="text-gradient-wristlink">wristlink</span>
              </h1>
              <p className="text-sm text-primary-foreground/70">Warenverwaltung</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleExportCSV}
                size="lg"
                variant="outline"
                className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Exportiere..." : "CSV Export"}
              </Button>
              {userCanEdit && (
                <>
                  <Button
                    onClick={handleZugangClick}
                    size="lg"
                    variant="outline"
                    className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"
                  >
                    <Package className="h-4 w-4" />
                    Zugang
                  </Button>
                  <Button
                    onClick={handleVermietungClick}
                    size="lg"
                    variant="outline"
                    className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Vermietung
                  </Button>
                  <Button
                    onClick={handleVerkaufClick}
                    size="lg"
                    variant="outline"
                    className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Verkauf
                  </Button>
                </>
              )}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"
              >
                <Link href="/kalender">
                  <CalendarDays className="h-4 w-4" />
                  Kalender
                </Link>
              </Button>
              {userCanAdmin && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"
                >
                  <Link href="/admin/anfragen">
                    <Inbox className="h-4 w-4" />
                    Anfragen{pendingQuotes > 0 ? ` (${pendingQuotes})` : ""}
                  </Link>
                </Button>
              )}
              {userCanAdmin && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"
                >
                  <Link href="/admin">
                    <Settings className="h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          <section>
            <KPICards stats={stats} />
          </section>

          <section>
            <AvailabilityTable stats={stats} baseStats={baseStats} />
          </section>

          <section>
            <BookingsTable bookings={bookings} onReturnClick={handleRentalClick} />
          </section>
        </div>
      </main>

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
    </div>
  )
}
