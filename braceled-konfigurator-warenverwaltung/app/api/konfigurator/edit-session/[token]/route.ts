import { getQuoteByPublicToken } from "@/lib/actions/quotes"
import { hasAngebotAccess } from "@/lib/konfigurator/angebot-access"
import { canCustomerEditQuoteStatus } from "@/lib/konfigurator/quote-status"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const allowed = await hasAngebotAccess(token)
  if (!allowed) {
    return Response.json({ error: "Zugang erforderlich" }, { status: 401 })
  }
  const quote = await getQuoteByPublicToken(token)
  if (!quote) return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  if (!canCustomerEditQuoteStatus(quote.status)) {
    return Response.json({ error: "Nicht editierbar" }, { status: 409 })
  }
  return Response.json({
    quoteId: quote.id,
    publicToken: quote.public_token,
    status: quote.status,
    config: quote.config_json,
    leadEmail: quote.lead_email,
  })
}
