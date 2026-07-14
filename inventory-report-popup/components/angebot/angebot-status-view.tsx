import { formatEur } from "@/lib/pricing/preis-engine"
import { formatPriceSummary } from "@/lib/pricing/display"
import { PRICING_NOTICE_B2B } from "@/lib/konfigurator/consent"
import {
  FULFILLMENT_STATUS_LABELS,
  getActiveFulfillmentSteps,
} from "@/lib/konfigurator/fulfillment-status"
import { formatKontaktAdresse } from "@/lib/konfigurator/kontakt-adresse"
import type { FulfillmentStatus, QuoteConfig, QuoteRequest } from "@/lib/konfigurator/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Clock, CreditCard, Package, XCircle } from "lucide-react"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  submitted: { label: "In Prüfung", variant: "secondary" },
  approved: { label: "Freigegeben", variant: "default" },
  payment_pending: { label: "Zahlung ausstehend", variant: "default" },
  paid: { label: "Bezahlt", variant: "default" },
  rejected: { label: "Abgelehnt", variant: "destructive" },
  expired: { label: "Abgelaufen", variant: "outline" },
  cancelled: { label: "Storniert", variant: "destructive" },
}

const CUSTOMER_FULFILLMENT_HINTS: Partial<Record<FulfillmentStatus, string>> = {
  angenommen: "Wir haben Ihre Bestellung angenommen",
  vorbereitet: "Material wird vorbereitet",
  verpackt: "Sets sind zusammengepackt",
  bedruckt: "Ihr Logo wurde auf die Bänder gedruckt",
  versand_beauftragt: "Versand ist beauftragt",
  versandt: "Paket ist unterwegs",
  ruecksendung_angekommen: "Rücksendung eingegangen",
  zurueckgepackt: "Rücksendung abgeschlossen",
}

type FulfillmentEvent = {
  to_status: FulfillmentStatus
  created_at: string
  tracking_number: string | null
  versand_dienstleister: string | null
}

export function AngebotStatusView({
  quote,
  fulfillmentEvents,
  paid,
  cancelled,
}: {
  quote: QuoteRequest
  fulfillmentEvents: FulfillmentEvent[]
  paid?: string
  cancelled?: string
}) {
  const price = quote.price_snapshot_json as {
    positionen?: { pos: string; summe: number }[]
    gesamt_netto?: number
    mwst_19?: number
    gesamt_brutto?: number
  }

  const statusInfo = STATUS_LABELS[quote.status] || { label: quote.status, variant: "outline" as const }
  const config = quote.config_json as QuoteConfig
  const hasDruck = Boolean(config.druck)
  const fulfillmentSteps = getActiveFulfillmentSteps(hasDruck)
  const currentFulfillment = quote.fulfillment_status
  const currentIdx = currentFulfillment ? fulfillmentSteps.indexOf(currentFulfillment) : -1
  const showFulfillment = quote.status === "paid" && currentFulfillment

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Ihr Auftragsstatus</h1>
          <p className="text-muted-foreground mt-1">
            Anfrage #{quote.id}
            {config.kontaktFirma ? ` · ${config.kontaktFirma}` : ""}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {paid === "1" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Zahlung wird verarbeitet – vielen Dank!
            </CardContent>
          </Card>
        )}

        {cancelled === "1" && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 text-amber-800">
              Zahlung abgebrochen. Sie können es jederzeit erneut versuchen.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Angebotsstatus</CardTitle>
              <CardDescription>Ihre Anfrage auf einen Blick</CardDescription>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.status === "submitted" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Wir prüfen Ihre Konfiguration – Sie hören bald von uns.
              </div>
            )}

            {quote.status === "rejected" && (
              <div className="flex items-start gap-2 text-destructive">
                <XCircle className="h-4 w-4 mt-0.5" />
                <div>
                  <p>Leider konnten wir Ihre Anfrage nicht bestätigen.</p>
                  {quote.rejection_reason && (
                    <p className="text-sm mt-1">{quote.rejection_reason}</p>
                  )}
                </div>
              </div>
            )}

            {(quote.status === "payment_pending" || quote.status === "approved") &&
              quote.stripe_payment_link_url && (
                <Button asChild size="lg" className="w-full">
                  <a href={quote.stripe_payment_link_url}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Jetzt bezahlen ({formatEur(price.gesamt_brutto || 0)} inkl. MwSt.)
                  </a>
                </Button>
              )}

            {quote.status === "paid" && !showFulfillment && (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Zahlung eingegangen – wir starten mit der Vorbereitung.
              </div>
            )}
          </CardContent>
        </Card>

        {showFulfillment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produktion & Versand
              </CardTitle>
              <CardDescription>So weit ist Ihre Bestellung</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {fulfillmentSteps.map((step, idx) => {
                  const done = currentIdx >= idx
                  const isCurrent = currentFulfillment === step
                  const event = fulfillmentEvents.find((e) => e.to_status === step)
                  const tracking = event?.tracking_number || quote.tracking_number
                  const carrier = event?.versand_dienstleister || quote.versand_dienstleister

                  return (
                    <li key={step} className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        {done ? (
                          <CheckCircle2
                            className={`h-5 w-5 ${isCurrent ? "text-primary" : "text-green-600"}`}
                          />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${done ? "" : "text-muted-foreground"}`}>
                          {FULFILLMENT_STATUS_LABELS[step]}
                          {isCurrent && (
                            <span className="ml-2 text-xs font-normal text-primary">aktuell</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {CUSTOMER_FULFILLMENT_HINTS[step]}
                        </p>
                        {done && tracking && (step === "versand_beauftragt" || step === "versandt") && (
                          <p className="text-sm mt-1">
                            {carrier ? `${carrier}: ` : "Sendungsverfolgung: "}
                            <span className="font-mono">{tracking}</span>
                          </p>
                        )}
                        {event && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(event.created_at).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ihre Konfiguration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Produkt</dt>
                <dd className="text-right">
                  {config.produkt} ({config.modus})
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Menge</dt>
                <dd>{config.menge}</dd>
              </div>
              {config.modus === "miete" && config.von && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Zeitraum</dt>
                  <dd>
                    {config.von} – {config.bis || config.von}
                  </dd>
                </div>
              )}
              {formatKontaktAdresse(config) && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Firmenadresse</dt>
                  <dd className="text-right max-w-[60%]">{formatKontaktAdresse(config)}</dd>
                </div>
              )}
              {config.technikerAdresse && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Veranstaltungsort</dt>
                  <dd className="text-right max-w-[60%]">{config.technikerAdresse}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {price.positionen && price.gesamt_netto != null && (
          <Card>
            <CardHeader>
              <CardTitle>Preisübersicht (B2B)</CardTitle>
              <CardDescription>{PRICING_NOTICE_B2B}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {price.positionen.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{p.pos}</span>
                  <span>{formatEur(p.summe)} netto</span>
                </div>
              ))}
              {(() => {
                const summary = formatPriceSummary({
                  gesamt_netto: price.gesamt_netto || 0,
                  mwst_19: price.mwst_19 || 0,
                  gesamt_brutto: price.gesamt_brutto || 0,
                })
                return (
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>Gesamt netto</span>
                      <span>{summary.nettoLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>zzgl. 19 % MwSt.</span>
                      <span>{summary.mwstLabel}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Zahlungsbetrag</span>
                      <span>{summary.bruttoLabel}</span>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
