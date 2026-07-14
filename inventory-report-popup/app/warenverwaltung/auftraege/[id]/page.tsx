import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { getQuoteById, getQuoteRequestStats } from "@/lib/actions/quotes"
import { listFulfillmentEvents } from "@/lib/actions/fulfillment"
import {
  getGroups,
  getBatches,
  getBases,
  getCustomers,
  getOpenRentals,
  getInventoryLots,
} from "@/lib/actions/bookings"
import { getQuoteWarehouseData } from "@/lib/actions/quote-warehouse"
import { isStripeConfigured } from "@/lib/konfigurator/stripe"
import { isSevdeskConfigured } from "@/lib/konfigurator/sevdesk"
import { formatKontaktAdresse } from "@/lib/konfigurator/kontakt-adresse"
import { OperationsShell } from "@/components/dashboard/operations-shell"
import { formatEur } from "@/lib/pricing/preis-engine"
import { formatPriceSummary } from "@/lib/pricing/display"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { QuoteOrderWorkflow } from "@/components/admin/quote-order-workflow"
import { QuoteWarehousePanel } from "@/components/admin/quote-warehouse-panel"
import { STATUS_LABELS, SOURCE_LABELS, statusBadgeVariant } from "@/lib/konfigurator/quote-status"
import { FULFILLMENT_STATUS_LABELS } from "@/lib/konfigurator/fulfillment-status"
import { getLieferpaketLabel, normalizeLieferpaket } from "@/lib/konfigurator/lieferpaket"
import { getProbedruckLabel, normalizeProbedruckOption } from "@/lib/konfigurator/product-info"

export const dynamic = "force-dynamic"

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: "Stripe",
  bank_transfer: "Überweisung",
  manual: "Manuell",
}

export default async function AuftragDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await isAuthenticated())) redirect("/login")

  const { id } = await params
  const quoteId = Number(id)
  if (!Number.isFinite(quoteId)) notFound()

  const [quote, quoteStats] = await Promise.all([getQuoteById(quoteId), getQuoteRequestStats()])
  if (!quote) notFound()

  const config = quote.config_json

  const needsReturnModal =
    quote.fulfillment_status === "zurueckgepackt" &&
    config.modus === "miete" &&
    Boolean(quote.booking_id) &&
    !quote.return_booking_id

  const needsBookingModalProps =
    quote.status === "paid" ||
    (config.modus === "miete" && Boolean(quote.booking_id)) ||
    needsReturnModal

  const [events, warehouseData, bookingModalData] = await Promise.all([
    ["paid", "approved", "payment_pending", "submitted"].includes(quote.status)
      ? listFulfillmentEvents(quoteId).catch(() => [])
      : Promise.resolve([]),
    getQuoteWarehouseData(quoteId),
    needsBookingModalProps
      ? Promise.all([
          getGroups(),
          getBatches(),
          getCustomers(),
          getBases(),
          getInventoryLots(),
          getOpenRentals(),
        ]).then(([groups, batches, customers, bases, inventoryLots, openRentals]) => ({
          groups,
          batches,
          customers,
          bases,
          inventoryLots,
          openRentals,
        }))
      : Promise.resolve(null),
  ])

  const bookingModalProps = bookingModalData
    ? {
        groups: bookingModalData.groups,
        batches: bookingModalData.batches,
        customers: bookingModalData.customers,
        bases: bookingModalData.bases,
        inventoryLots: bookingModalData.inventoryLots,
        openRentals: bookingModalData.openRentals,
      }
    : null

  const price = quote.price_snapshot_json as {
    positionen?: { pos: string; summe: number }[]
    gesamt_netto?: number
    mwst_19?: number
    gesamt_brutto?: number
  }
  const userCanAdmin = true

  return (
    <OperationsShell activeTab="auftraege" quoteStats={quoteStats} userCanAdmin={userCanAdmin}>
      <div className="max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0 mt-0.5">
              <Link href="/warenverwaltung/auftraege">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Auftrag #{quote.id}</h2>
              <p className="text-sm text-muted-foreground">{quote.lead_email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{SOURCE_LABELS[quote.source]}</Badge>
            <Badge variant={statusBadgeVariant(quote.status)}>
              {STATUS_LABELS[quote.status] || quote.status}
            </Badge>
            {quote.fulfillment_status && (
              <Badge variant="secondary">
                {FULFILLMENT_STATUS_LABELS[quote.fulfillment_status]}
              </Badge>
            )}
          </div>
        </div>

        <QuoteOrderWorkflow
          quote={quote}
          leadEmail={quote.lead_email || ""}
          events={events}
          stripeConfigured={isStripeConfigured()}
          sevdeskConfigured={isSevdeskConfigured()}
        />

        <QuoteWarehousePanel
          quoteId={quote.id}
          quoteStatus={quote.status}
          modus={config.modus as "miete" | "kauf"}
          hasDruck={Boolean(config.druck)}
          fulfillmentStatus={quote.fulfillment_status}
          warehouseData={{
            primaryBooking: warehouseData.primaryBooking,
            returnBooking: warehouseData.returnBooking,
            remainingByGroup: warehouseData.remainingByGroup,
            stationInfo: warehouseData.stationInfo,
            availableBases: warehouseData.availableBases,
          }}
          groups={bookingModalData?.groups ?? []}
          batches={bookingModalData?.batches ?? []}
          bookingModalProps={
            bookingModalProps ?? {
              groups: [],
              batches: [],
              customers: [],
              bases: [],
              inventoryLots: [],
              openRentals: [],
            }
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Status & Verknüpfungen</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {quote.payment_method && (
                <div className="flex justify-between">
                  <dt>Zahlungsart</dt>
                  <dd>{PAYMENT_METHOD_LABELS[quote.payment_method] || quote.payment_method}</dd>
                </div>
              )}
              {quote.tracking_number && (
                <div className="flex justify-between">
                  <dt>Sendungsverfolgung</dt>
                  <dd className="font-mono text-xs text-right">
                    {quote.versand_dienstleister ? `${quote.versand_dienstleister} · ` : ""}
                    {quote.tracking_number}
                  </dd>
                </div>
              )}
              {quote.external_ref && (
                <div className="flex justify-between">
                  <dt>Externe Referenz</dt>
                  <dd className="font-mono text-xs">{quote.external_ref}</dd>
                </div>
              )}
              {quote.submitted_at && (
                <div className="flex justify-between">
                  <dt>Eingegangen</dt>
                  <dd>{new Date(quote.submitted_at).toLocaleString("de-DE")}</dd>
                </div>
              )}
              {quote.approved_at && (
                <div className="flex justify-between">
                  <dt>Freigegeben</dt>
                  <dd>{new Date(quote.approved_at).toLocaleString("de-DE")}</dd>
                </div>
              )}
              {quote.expires_at && quote.status === "payment_pending" && (
                <div className="flex justify-between">
                  <dt>Zahlung bis</dt>
                  <dd>{new Date(quote.expires_at).toLocaleString("de-DE")}</dd>
                </div>
              )}
              {quote.paid_at && (
                <div className="flex justify-between">
                  <dt>Bezahlt</dt>
                  <dd>{new Date(quote.paid_at).toLocaleString("de-DE")}</dd>
                </div>
              )}
              {quote.cancelled_at && (
                <div className="flex justify-between">
                  <dt>Storniert</dt>
                  <dd>{new Date(quote.cancelled_at).toLocaleString("de-DE")}</dd>
                </div>
              )}
              {quote.payment_note && (
                <div className="flex justify-between gap-4">
                  <dt>Zahlungsnotiz</dt>
                  <dd className="text-right">{quote.payment_note}</dd>
                </div>
              )}
              {quote.rejection_reason && (
                <div className="flex justify-between gap-4">
                  <dt>Hinweis</dt>
                  <dd className="text-right">{quote.rejection_reason}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Konfiguration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {(config.kontaktName || config.kontaktFirma || config.kontaktTelefon) && (
                <>
                  {config.kontaktName && (
                    <div className="flex justify-between">
                      <dt>Ansprechpartner</dt>
                      <dd>{config.kontaktName}</dd>
                    </div>
                  )}
                  {config.kontaktFirma && (
                    <div className="flex justify-between">
                      <dt>Firma</dt>
                      <dd>{config.kontaktFirma}</dd>
                    </div>
                  )}
                  {config.kontaktTelefon && (
                    <div className="flex justify-between">
                      <dt>Telefon</dt>
                      <dd>{config.kontaktTelefon}</dd>
                    </div>
                  )}
                  {formatKontaktAdresse(config) && (
                    <div className="flex justify-between">
                      <dt>Adresse</dt>
                      <dd className="text-right max-w-[60%]">{formatKontaktAdresse(config)}</dd>
                    </div>
                  )}
                </>
              )}
              {config.szenario && (
                <div className="flex justify-between">
                  <dt>Event</dt>
                  <dd>{config.szenario}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Produkt</dt>
                <dd>
                  {config.produkt} ({config.modus})
                </dd>
              </div>
              {config.produkt === "armband" && config.variante && (
                <div className="flex justify-between">
                  <dt>Variante</dt>
                  <dd>{config.variante}</dd>
                </div>
              )}
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
              <div className="flex justify-between">
                <dt>Druck</dt>
                <dd>{config.druck ? "ja" : "nein"}</dd>
              </div>
              {config.logoId && (
                <div className="flex justify-between items-start gap-4">
                  <dt>Logo</dt>
                  <dd className="flex flex-col items-end gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/konfigurator/logo/${config.logoId}`}
                      alt="Kundenlogo"
                      className="h-12 w-auto max-w-[120px] object-contain bg-black rounded p-1"
                    />
                    <a
                      href={`/api/konfigurator/logo/${config.logoId}?download=1`}
                      className="text-xs text-primary underline underline-offset-2"
                    >
                      Logo herunterladen (PNG)
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Probedruck</dt>
                <dd>{getProbedruckLabel(normalizeProbedruckOption(config)) ?? "nein"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Lieferpaket</dt>
                <dd>{getLieferpaketLabel(normalizeLieferpaket(config))}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Flex-Rückgabe</dt>
                <dd>{config.flexRueckgabe || config.flex ? "ja" : "nein"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Lieferland</dt>
                <dd>Deutschland</dd>
              </div>
              <div className="flex justify-between">
                <dt>Basis-Station</dt>
                <dd>
                  {config.station}
                  {config.station !== "keine" ? ` (${config.stationModus || config.modus})` : ""}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Gruppen</dt>
                <dd>
                  {config.gruppen}
                  {config.gruppen > 0 && config.baenderProGruppe
                    ? ` (à ${config.baenderProGruppe} Bänder)`
                    : ""}
                </dd>
              </div>
              {config.techniker && (
                <>
                  <div className="flex justify-between">
                    <dt>Techniker</dt>
                    <dd>{config.technikerTage} Tag(e)</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Eventadresse</dt>
                    <dd className="text-right max-w-[60%]">{config.technikerAdresse || "–"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Fahrt</dt>
                    <dd>{config.technikerKm ?? 0} km</dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {price.positionen && (
          <Card>
            <CardHeader>
              <CardTitle>Preis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {price.positionen.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{p.pos}</span>
                  <span>{formatEur(p.summe)} netto</span>
                </div>
              ))}
              {price.gesamt_netto != null && (
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>Netto</span>
                    <span>
                      {
                        formatPriceSummary({
                          gesamt_netto: price.gesamt_netto,
                          mwst_19: price.mwst_19 || 0,
                          gesamt_brutto: price.gesamt_brutto || 0,
                        }).nettoLabel
                      }
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Zahlung inkl. MwSt.</span>
                    <span>
                      {
                        formatPriceSummary({
                          gesamt_netto: price.gesamt_netto,
                          mwst_19: price.mwst_19 || 0,
                          gesamt_brutto: price.gesamt_brutto || 0,
                        }).bruttoLabel
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {quote.stripe_payment_link_url && (
          <Card>
            <CardHeader>
              <CardTitle>Stripe</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={quote.stripe_payment_link_url}
                className="text-sm text-primary underline break-all"
                target="_blank"
                rel="noreferrer"
              >
                {quote.stripe_payment_link_url}
              </a>
            </CardContent>
          </Card>
        )}

        {quote.source === "konfigurator" && (
          <Card>
            <CardHeader>
              <CardTitle>Kunden-Link</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm break-all">/angebot/{quote.public_token}</p>
            </CardContent>
          </Card>
        )}

        {quote.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notizen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </OperationsShell>
  )
}
