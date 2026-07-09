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
import type { QuoteRequest } from "@/lib/konfigurator/types"
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

export function UpcomingFulfillmentOrders({ orders }: { orders: QuoteRequest[] }) {
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
                <div>
                  <p className="font-mono text-sm font-semibold">#{quote.id}</p>
                  <p className="text-sm text-muted-foreground truncate">{quote.lead_email}</p>
                </div>
                <Badge variant={urgencyBadgeVariant(timing.urgency)} className="shrink-0 gap-1">
                  <Icon className="h-3 w-3" />
                  {timing.label}
                </Badge>
              </div>

              <div className="space-y-1 text-sm">
                <p>
                  {quote.config_json.produkt} · {quote.config_json.modus} · {quote.config_json.menge} Stk.
                </p>
                <p className="text-muted-foreground">{getLieferpaketLabel(paket)}</p>
                {timing.detail && <p className="text-muted-foreground text-xs">{timing.detail}</p>}
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
                  <Link href={`/admin/anfragen/${quote.id}`}>Bearbeiten</Link>
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
