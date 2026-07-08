import { getStats, getBookings, getGroups, getBatches, getBases, getBaseStats, getCustomers, getOpenRentals, getInventoryLots } from "@/lib/actions/bookings"
import { getQuoteRequestStats } from "@/lib/actions/quotes"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { isAuthenticated } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect("/login")
  }

  const [stats, bookings, groups, batches, bases, baseStats, customers, openRentals, inventoryLots, quoteStats] = await Promise.all([
    getStats(),
    getBookings(),
    getGroups(),
    getBatches(),
    getBases(),
    getBaseStats(),
    getCustomers(),
    getOpenRentals(),
    getInventoryLots(),
    getQuoteRequestStats(),
  ])

  // Hardcoded to true since authentication is not fully implemented
  const userCanEdit = true
  const userCanAdmin = true

  return (
    <DashboardClient
      stats={stats}
      bookings={bookings}
      groups={groups}
      batches={batches}
      bases={bases}
      baseStats={baseStats}
      customers={customers}
      openRentals={openRentals}
      inventoryLots={inventoryLots}
      userCanEdit={userCanEdit}
      userCanAdmin={userCanAdmin}
      quoteStats={quoteStats}
    />
  )
}
