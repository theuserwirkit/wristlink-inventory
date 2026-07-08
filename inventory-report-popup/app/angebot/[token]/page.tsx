import { notFound } from "next/navigation"
import { getQuoteByPublicToken } from "@/lib/actions/quotes"

export const dynamic = "force-dynamic"
import { formatEur } from "@/lib/pricing/preis-engine"
import { formatPriceSummary } from "@/lib/pricing/display"
import { PRICING_NOTICE_B2B } from "@/lib/konfigurator/consent"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  submitted: { label: "In Prüfung", variant: "secondary" },
  approved: { label: "Freigegeben", variant: "default" },
  payment_pending: { label: "Zahlung ausstehend", variant: "default" },
  paid: { label: "Bezahlt", variant: "default" },
  rejected: { label: "Abgelehnt", variant: "destructive" },
  expired: { label: "Abgelaufen", variant: "outline" },
  cancelled: { label: "Storniert", variant: "destructive" },
}

export default async function AngebotPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string; cancelled?: string }>
}) {
  const { token } = await params
  const { paid, cancelled } = await searchParams
  const quote = await getQuoteByPublicToken(token)

  if (!quote) notFound()

  const price = quote.price_snapshot_json as {
    positionen?: { pos: string; summe: number }[]
    gesamt_netto?: number
    mwst_19?: number
    gesamt_brutto?: number
  }

  const statusInfo = STATUS_LABELS[quote.status] || { label: quote.status, variant: "outline" as const }
  const config = quote.config_json

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Ihr Angebot</h1>
          <p className="text-muted-foreground mt-1">Anfrage #{quote.id}</p>
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
              <CardTitle>Status</CardTitle>
              <CardDescription>{quote.lead_email}</CardDescription>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {quote.status === "submitted" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Wir prüfen Ihre Anfrage und melden uns per E-Mail.
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

            {quote.status === "paid" && (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Zahlung eingegangen – Rechnung über Stripe, wir melden uns in Kürze.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Konfiguration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt>Produkt</dt>
                <dd>{config.produkt} ({config.modus})</dd>
              </div>
              <div className="flex justify-between">
                <dt>Menge</dt>
                <dd>{config.menge}</dd>
              </div>
              {config.modus === "miete" && config.von && (
                <div className="flex justify-between">
                  <dt>Zeitraum</dt>
                  <dd>
                    {config.von} – {config.bis || config.von}
                  </dd>
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
