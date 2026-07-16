import {
  getBookings,
  getGroups,
  getBatches,
  getBases,
  getCustomers,
  getOpenRentals,
  getInventoryLots,
} from "@/lib/actions/bookings"
import { getQuoteRequestStats } from "@/lib/actions/quotes"
import { OperationsShell } from "@/components/dashboard/operations-shell"
import {
  BookingModalProvider,
  OperationsHeaderActions,
} from "@/components/dashboard/operations-header-actions"
import { BookingsTableWithReturnModal } from "@/components/dashboard/bookings-table"
import { isAuthenticated } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function BuchungenPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) redirect("/login")

  const [
    bookings,
    groups,
    batches,
    bases,
    customers,
    openRentals,
    inventoryLots,
    quoteStats,
  ] = await Promise.all([
    getBookings(),
    getGroups(),
    getBatches(),
    getBases(),
    getCustomers(),
    getOpenRentals(),
    getInventoryLots(),
    getQuoteRequestStats(),
  ])

  const userCanEdit = true
  const userCanAdmin = true

  return (
    <BookingModalProvider
      groups={groups}
      batches={batches}
      bases={bases}
      customers={customers}
      openRentals={openRentals}
      inventoryLots={inventoryLots}
    >
      <OperationsShell
        activeTab="buchungen"
        quoteStats={quoteStats}
        userCanAdmin={userCanAdmin}
        headerActions={
          <OperationsHeaderActions
            userCanEdit={userCanEdit}
            userCanAdmin={userCanAdmin}
          />
        }
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Bestandsprotokoll</h2>
          <p className="text-sm text-muted-foreground">
            Chronologisches Ledger aller Zugänge und Abgänge. Kundenaufträge bearbeiten Sie unter Aufträge.
          </p>
        </div>
        <BookingsTableWithReturnModal bookings={bookings} />
      </OperationsShell>
    </BookingModalProvider>
  )
}
