import Link from "next/link"
import { AlertTriangle, Clock, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FULFILLMENT_STATUS_LABELS,
  getNextFulfillmentStep,
} from "@/lib/konfigurator/fulfillment-status"
import {
  getFulfillmentTiming,
  type FulfillmentTimingUrgency,
} from "@/lib/konfigurator/fulfillment-timing"
import { getLieferpaketLabel, normalizeLieferpaket } from "@/lib/konfigurator/lieferpaket"
import { modusAnzeige, PRODUKT_ANZEIGE } from "@/lib/konfigurator/product-info"
import type { QuoteRequest } from "@/lib/konfigurator/types"
import { formatDate } from "@/lib/utils/date"
import { cn } from "@/lib/utils"

function urgencyBadgeVariant(
  urgency: FulfillmentTimingUrgency,
): "default" | "secondary" | "destructive" | "outline" {
  switch (urgency) {
    case "overdue":
      return "destructive"
    case "due_today":
    case "due_soon":
      return "default"
    case "ok":
      return "secondary"
    default:
      return "outline"
  }
}

function urgencyIcon(urgency: FulfillmentTimingUrgency) {
  if (urgency === "overdue") return AlertTriangle
  return Clock
}

export function UpcomingFulfillmentOrders({
  orders,
  detailBasePath = "/warenverwaltung/auftraege",
}: {
  orders: QuoteRequest[]
  detailBasePath?: string
}) {
  if (orders.length === 0) return null

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Nächste Aufträge in Bearbeitung
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Die drei dringendsten gebuchten Aufträge nach Fälligkeit
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {orders.map((quote) => {
          const hasDruck = Boolean(quote.config_json.druck)
          const nextStep = getNextFulfillmentStep(quote.fulfillment_status, hasDruck)
          const timing = getFulfillmentTiming(quote)
          const Icon = urgencyIcon(timing.urgency)
          const paket = normalizeLieferpaket(quote.config_json)
          const kontaktName = quote.config_json.kontaktName?.trim()
          const kontaktFirma = quote.config_json.kontaktFirma?.trim()
          const produktLabel =
            PRODUKT_ANZEIGE[quote.config_json.produkt] ?? quote.config_json.produkt
          const modusLabel = modusAnzeige(quote.config_json.modus)

          return (
            <div
              key={quote.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-4",
                timing.urgency === "overdue" && "border-destructive/40 bg-destructive/5",
                (timing.urgency === "due_today" || timing.urgency === "due_soon") &&
                  "border-amber-500/40 bg-amber-500/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold">#{quote.id}</p>
                  {kontaktName ? (
                    <p className="font-medium truncate">{kontaktName}</p>
                  ) : null}
                  {kontaktFirma ? (
                    <p className="text-sm text-muted-foreground truncate">{kontaktFirma}</p>
                  ) : null}
                  <p className="text-sm text-muted-foreground truncate">{quote.lead_email}</p>
                </div>
                <Badge variant={urgencyBadgeVariant(timing.urgency)} className="shrink-0 gap-1">
                  <Icon className="h-3 w-3" />
                  {timing.label}
                </Badge>
              </div>

              {timing.dueDate ? (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2",
                    timing.urgency === "overdue" && "border-destructive/50 bg-destructive/10",
                    (timing.urgency === "due_today" || timing.urgency === "due_soon") &&
                      "border-amber-500/50 bg-amber-500/10",
                    timing.urgency === "ok" && "border-border bg-muted/40",
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Fälligkeit
                  </p>
                  <p className="text-xl font-bold leading-tight">{formatDate(timing.dueDate)}</p>
                  {timing.detail ? (
                    <p className="mt-1 text-xs text-muted-foreground">{timing.detail}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1 text-sm">
                <p>
                  {produktLabel} · {modusLabel} · {quote.config_json.menge} Stk.
                </p>
                <p className="text-muted-foreground">{getLieferpaketLabel(paket)}</p>
              </div>

              <div className="mt-auto space-y-2">
                {nextStep ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Nächster Schritt: </span>
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      {FULFILLMENT_STATUS_LABELS[nextStep]}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Kein weiterer Schritt</p>
                )}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`${detailBasePath}/${quote.id}`}>Bearbeiten</Link>
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
