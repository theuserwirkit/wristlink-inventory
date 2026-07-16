import { notFound } from "next/navigation"
import { getQuoteByPublicToken, getPublicFulfillmentEvents } from "@/lib/actions/quotes"
import {
  angebotRequiresPlzGate,
  hasAngebotAccess,
} from "@/lib/konfigurator/angebot-access"
import { getQuoteAccessPlz } from "@/lib/konfigurator/kontakt-adresse"
import { listQuoteVersions } from "@/lib/konfigurator/quote-versions"
import { canCustomerEditQuoteStatus } from "@/lib/konfigurator/quote-status"
import { AngebotPlzGate } from "@/components/angebot/plz-gate"
import { AngebotStatusView } from "@/components/angebot/angebot-status-view"

export const dynamic = "force-dynamic"

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

  const expectedPlz = getQuoteAccessPlz(quote.config_json)
  const needsGate = angebotRequiresPlzGate(expectedPlz)
  const unlocked = !needsGate || (await hasAngebotAccess(token))

  if (!unlocked) {
    return <AngebotPlzGate token={token} quoteId={quote.id} />
  }

  const fulfillmentEvents = await getPublicFulfillmentEvents(quote.id)
  const versions = await listQuoteVersions(quote.id)
  const canEdit = canCustomerEditQuoteStatus(quote.status)
  const hasOfferPdf = Boolean(quote.offer_pdf_filename)

  return (
    <AngebotStatusView
      quote={quote}
      fulfillmentEvents={fulfillmentEvents}
      versions={versions}
      canEdit={canEdit}
      hasOfferPdf={hasOfferPdf}
      paid={paid}
      cancelled={cancelled}
    />
  )
}
