import { notFound } from "next/navigation"
import { getQuoteByPublicToken, getPublicFulfillmentEvents } from "@/lib/actions/quotes"
import {
  angebotRequiresPlzGate,
  hasAngebotAccess,
} from "@/lib/konfigurator/angebot-access"
import { getQuoteAccessPlz } from "@/lib/konfigurator/kontakt-adresse"
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

  return (
    <AngebotStatusView
      quote={quote}
      fulfillmentEvents={fulfillmentEvents}
      paid={paid}
      cancelled={cancelled}
    />
  )
}
