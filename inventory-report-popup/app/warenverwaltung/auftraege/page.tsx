import Link from "next/link"
import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { expireStaleQuotes } from "@/lib/quotes-internal"
import { getQuoteRequestStats, listPriorityFulfillmentOrders, listQuoteRequests } from "@/lib/actions/quotes"
import { OperationsShell } from "@/components/dashboard/operations-shell"
import { QuotesListPanel } from "@/components/dashboard/quotes-list-panel"
import { Button } from "@/components/ui/button"
import type { QuoteSource, QuoteStatus } from "@/lib/konfigurator/types"

export const dynamic = "force-dynamic"

export default async function AuftraegePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>
}) {
  if (!(await isAuthenticated())) redirect("/login")

  const params = await searchParams
  const statusFilter = params.status as QuoteStatus | "all" | "active" | "fulfillment_open" | undefined
  const sourceFilter = params.source as QuoteSource | "all" | undefined

  const quoteFilters: { status?: QuoteStatus | "active" | "fulfillment_open"; source?: QuoteSource } = {}
  if (sourceFilter && sourceFilter !== "all") quoteFilters.source = sourceFilter
  if (statusFilter && statusFilter !== "all") quoteFilters.status = statusFilter

  const [_, stats, quotes, priorityOrders, quoteStats] = await Promise.all([
    expireStaleQuotes(),
    getQuoteRequestStats({ skipExpire: true }),
    listQuoteRequests(
      Object.keys(quoteFilters).length > 0 ? quoteFilters : undefined,
      { skipExpire: true, tableView: true, limit: 100 },
    ),
    listPriorityFulfillmentOrders(3),
    getQuoteRequestStats({ skipExpire: true }),
  ])

  const userCanAdmin = true

  return (
    <OperationsShell
      activeTab="auftraege"
      quoteStats={quoteStats}
      userCanAdmin={userCanAdmin}
      headerActions={
        <Button
          asChild
          variant="outline"
          size="lg"
          className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"
        >
          <Link href="/admin/einstellungen/e-mails">E-Mails</Link>
        </Button>
      }
    >
      <QuotesListPanel
        quotes={quotes}
        stats={stats}
        priorityOrders={priorityOrders}
        statusFilter={statusFilter}
        sourceFilter={sourceFilter}
      />
    </OperationsShell>
  )
}
