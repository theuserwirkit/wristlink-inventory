import {
  getStats,
  getGroups,
  getBatches,
  getBases,
  getBaseStats,
  getCustomers,
  getOpenRentals,
  getInventoryLots,
} from "@/lib/actions/bookings"
import { getQuoteRequestStats, listPriorityFulfillmentOrders } from "@/lib/actions/quotes"
import { OperationsShell } from "@/components/dashboard/operations-shell"
import {
  BookingModalProvider,
  OperationsHeaderActions,
} from "@/components/dashboard/operations-header-actions"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { AvailabilityTable } from "@/components/dashboard/availability-table"
import { UpcomingFulfillmentOrders } from "@/components/admin/upcoming-fulfillment-orders"
import { isAuthenticated } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect("/login")
  }

  const [
    stats,
    groups,
    batches,
    bases,
    baseStats,
    customers,
    openRentals,
    inventoryLots,
    quoteStats,
    priorityOrders,
  ] = await Promise.all([
    getStats(),
    getGroups(),
    getBatches(),
    getBases(),
    getBaseStats(),
    getCustomers(),
    getOpenRentals(),
    getInventoryLots(),
    getQuoteRequestStats(),
    listPriorityFulfillmentOrders(3),
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
        activeTab="overview"
        quoteStats={quoteStats}
        userCanAdmin={userCanAdmin}
        headerActions={
          <OperationsHeaderActions
            userCanEdit={userCanEdit}
            userCanAdmin={userCanAdmin}
          />
        }
      >
        <div className="flex flex-col gap-8">
          <section>
            <KPICards stats={stats} />
          </section>

          <section>
            <AvailabilityTable stats={stats} baseStats={baseStats} />
          </section>

          <section>
            <UpcomingFulfillmentOrders orders={priorityOrders} />
          </section>
        </div>
      </OperationsShell>
    </BookingModalProvider>
  )
}
