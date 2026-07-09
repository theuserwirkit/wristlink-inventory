import Link from "next/link"
import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { expireStaleQuotes } from "@/lib/quotes-internal"
import { getQuoteRequestStats, listPriorityFulfillmentOrders, listQuoteRequests } from "@/lib/actions/quotes"
import { UpcomingFulfillmentOrders } from "@/components/admin/upcoming-fulfillment-orders"

export const dynamic = "force-dynamic"
import { formatEur } from "@/lib/pricing/preis-engine"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import {
  STATUS_LABELS,
  SOURCE_LABELS,
  statusBadgeVariant,
  ACTIVE_STATUSES,
} from "@/lib/konfigurator/quote-status"
import {
  FULFILLMENT_STATUS_LABELS,
  getNextFulfillmentStep,
} from "@/lib/konfigurator/fulfillment-status"
import type { QuoteSource, QuoteStatus } from "@/lib/konfigurator/types"

const FILTER_STATUSES: (QuoteStatus | "all" | "active" | "fulfillment_open")[] = [
  "all",
  "active",
  "fulfillment_open",
  "submitted",
  "payment_pending",
  "approved",
  "paid",
  "rejected",
  "cancelled",
  "expired",
]

export default async function AnfragenPage({
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

  const [_, stats, quotes, priorityOrders] = await Promise.all([
    expireStaleQuotes(),
    getQuoteRequestStats({ skipExpire: true }),
    listQuoteRequests(
      Object.keys(quoteFilters).length > 0 ? quoteFilters : undefined,
      { skipExpire: true, tableView: true, limit: 100 },
    ),
    listPriorityFulfillmentOrders(3),
  ])

  const pendingCount = stats.submitted || 0

  function filterUrl(overrides: { status?: string; source?: string }) {
    const status = overrides.status ?? statusFilter ?? "all"
    const source = overrides.source ?? sourceFilter ?? "all"
    const qs = new URLSearchParams()
    if (status !== "all") qs.set("status", status)
    if (source !== "all") qs.set("source", source)
    const query = qs.toString()
    return query ? `/admin/anfragen?${query}` : "/admin/anfragen"
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/warenverwaltung">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Anfragen</h1>
            <p className="text-sm text-muted-foreground">
              {quotes.length} Einträge
              {pendingCount > 0 && ` · ${pendingCount} warten auf Freigabe`}
              {(stats.payment_pending || 0) + (stats.approved || 0) > 0 &&
                ` · ${(stats.payment_pending || 0) + (stats.approved || 0)} Zahlung ausstehend`}
              {(stats.fulfillment_open || 0) > 0 &&
                ` · ${stats.fulfillment_open} in Bearbeitung`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/einstellungen/e-mails">E-Mails</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <UpcomingFulfillmentOrders orders={priorityOrders} />

        <div className="flex flex-wrap gap-2">
          {FILTER_STATUSES.map((s) => {
            const count =
              s === "all"
                ? Object.entries(stats)
                    .filter(([key]) => key !== "fulfillment_open")
                    .reduce((sum, [, value]) => sum + value, 0)
                : s === "active"
                  ? ACTIVE_STATUSES.reduce((sum, st) => sum + (stats[st] || 0), 0)
                  : s === "fulfillment_open"
                    ? stats.fulfillment_open || 0
                    : stats[s] || 0
            const label =
              s === "all"
                ? "Alle"
                : s === "active"
                  ? "Aktiv"
                  : s === "fulfillment_open"
                    ? "In Bearbeitung"
                    : STATUS_LABELS[s as QuoteStatus]
            const active = (statusFilter || "all") === s
            return (
              <Button key={s} asChild variant={active ? "default" : "outline"} size="sm">
                <Link href={filterUrl({ status: s })}>
                  {label} ({count})
                </Link>
              </Button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "konfigurator", "n8n_email"] as const).map((s) => {
            const active = (sourceFilter || "all") === s
            const label = s === "all" ? "Alle Quellen" : SOURCE_LABELS[s]
            return (
              <Button key={s} asChild variant={active ? "secondary" : "ghost"} size="sm">
                <Link href={filterUrl({ source: s })}>{label}</Link>
              </Button>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Anfragen & Angebote</CardTitle>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Keine Anfragen vorhanden</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Quelle</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Produkt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead>Nächster Schritt</TableHead>
                    <TableHead>Buchung</TableHead>
                    <TableHead>Netto</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => {
                    const price = q.price_snapshot_json as { gesamt_netto?: number }
                    const hasDruck = Boolean(q.config_json.druck)
                    const nextStep =
                      q.status === "paid"
                        ? getNextFulfillmentStep(q.fulfillment_status, hasDruck)
                        : null
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono">#{q.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{SOURCE_LABELS[q.source]}</Badge>
                        </TableCell>
                        <TableCell>{q.lead_email}</TableCell>
                        <TableCell>
                          {q.config_json.produkt} ({q.config_json.modus})
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(q.status)}>
                            {STATUS_LABELS[q.status] || q.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {q.fulfillment_status ? (
                            <Badge variant="outline">
                              {FULFILLMENT_STATUS_LABELS[q.fulfillment_status]}
                            </Badge>
                          ) : (
                            "–"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {nextStep ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              {FULFILLMENT_STATUS_LABELS[nextStep]}
                            </span>
                          ) : q.status === "paid" ? (
                            <span className="text-muted-foreground">fertig</span>
                          ) : (
                            "–"
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {q.booking_id ? `#${q.booking_id}` : "–"}
                        </TableCell>
                        <TableCell>{formatEur(price.gesamt_netto || 0)}</TableCell>
                        <TableCell>
                          {q.submitted_at
                            ? new Date(q.submitted_at).toLocaleDateString("de-DE")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/anfragen/${q.id}`}>Details</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
