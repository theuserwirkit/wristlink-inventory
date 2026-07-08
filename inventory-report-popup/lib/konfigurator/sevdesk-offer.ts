import type { PreisPosition } from "@/lib/pricing/types"
import { isSevdeskConfigured, sevdeskJson } from "@/lib/konfigurator/sevdesk"
import type { QuoteConfig, QuoteRequest } from "@/lib/konfigurator/types"

const CUSTOMER_CATEGORY_ID = 3
const DEFAULT_UNITY_ID = 1
const DEFAULT_TAX_RATE = 19

type SevdeskRef = { id: number | string; objectName: string }

type OrderPosPayload = {
  objectName: "OrderPos"
  mapAll: true
  name: string
  quantity: number
  price: number
  taxRate: number
  unity: SevdeskRef
  positionNumber: number
  part?: SevdeskRef
  text?: string
}

type SaveOrderResponse = {
  objects: {
    order: { id: string; orderNumber: string }
  }
}

type PdfResponse = {
  objects: {
    filename: string
    mimetype: string
    base64Encoded: boolean
    content: string
  }
}

export type SevdeskOfferResult = {
  orderId: string
  orderNumber: string
  pdfFilename: string
  pdfBuffer: Buffer
}

function getContactPersonId(): number | null {
  const raw = process.env.SEVDESK_CONTACT_PERSON_ID
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

function getDefaultPartId(): number | null {
  const raw = process.env.SEVDESK_DEFAULT_PART_ID
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

function splitName(fullName: string | undefined): { surename: string; familyname: string } {
  const trimmed = (fullName || "").trim()
  if (!trimmed) return { surename: "Kunde", familyname: "Wristlink" }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { surename: parts[0], familyname: "-" }
  return { surename: parts[0], familyname: parts.slice(1).join(" ") }
}

function mapPricePositions(positionen: PreisPosition[]): OrderPosPayload[] {
  const partId = getDefaultPartId()
  return positionen
    .filter((p) => p.summe > 0)
    .map((p, index) => {
      const quantity = p.menge > 0 ? p.menge : 1
      const unitPrice = p.menge > 0 ? p.einzel : p.summe
      const payload: OrderPosPayload = {
        objectName: "OrderPos",
        mapAll: true,
        name: p.pos,
        quantity,
        price: Math.round(unitPrice * 100) / 100,
        taxRate: DEFAULT_TAX_RATE,
        unity: { id: DEFAULT_UNITY_ID, objectName: "Unity" },
        positionNumber: index,
      }
      if (partId) {
        payload.part = { id: partId, objectName: "Part" }
      }
      return payload
    })
}

function buildHeadText(config: QuoteConfig, quoteId: number, email: string): string {
  const lines = [
    `WIRKUNG Wristlink Anfrage #${quoteId}`,
    `Kontakt: ${email}`,
  ]
  if (config.kontaktName) lines.push(`Ansprechpartner: ${config.kontaktName}`)
  if (config.kontaktFirma) lines.push(`Firma: ${config.kontaktFirma}`)
  if (config.kontaktTelefon) lines.push(`Telefon: ${config.kontaktTelefon}`)
  if (config.von) lines.push(`Eventzeitraum: ${config.von} – ${config.bis || config.von}`)
  return lines.join("\n")
}

async function findContactIdByEmail(email: string): Promise<number | null> {
  const data = await sevdeskJson<{
    objects: Array<{ contact?: { id: string } }>
  }>(`CommunicationWay?value=${encodeURIComponent(email)}`)
  const contactId = data.objects?.[0]?.contact?.id
  return contactId ? Number(contactId) : null
}

async function getNextCustomerNumber(): Promise<string> {
  const data = await sevdeskJson<{ objects: string }>("Contact/Factory/getNextCustomerNumber")
  return String(data.objects)
}

async function createContactForQuote(
  email: string,
  config: QuoteConfig,
): Promise<number> {
  const { surename, familyname } = splitName(config.kontaktName)
  const customerNumber = await getNextCustomerNumber()
  const created = await sevdeskJson<{ objects: { id: string } }>("Contact", {
    method: "POST",
    body: JSON.stringify({
      category: { id: CUSTOMER_CATEGORY_ID, objectName: "Category" },
      surename,
      familyname,
      customerNumber,
      name: config.kontaktFirma || `${surename} ${familyname}`.trim(),
      description: "WIRKUNG Wristlink Konfigurator",
      status: 100,
      taxType: "default",
    }),
  })

  const contactId = Number(created.objects.id)
  await sevdeskJson("CommunicationWay", {
    method: "POST",
    body: JSON.stringify({
      contact: { id: contactId, objectName: "Contact" },
      type: "EMAIL",
      value: email,
      key: { id: 1, objectName: "CommunicationWayKey" },
      main: 1,
    }),
  })

  if (config.kontaktTelefon?.trim()) {
    await sevdeskJson("CommunicationWay", {
      method: "POST",
      body: JSON.stringify({
        contact: { id: contactId, objectName: "Contact" },
        type: "PHONE",
        value: config.kontaktTelefon.trim(),
        key: { id: 2, objectName: "CommunicationWayKey" },
        main: 1,
      }),
    }).catch(() => undefined)
  }

  return contactId
}

async function resolveContactId(quote: QuoteRequest): Promise<number> {
  const email = quote.lead_email?.trim()
  if (!email) throw new Error("Keine E-Mail-Adresse für den Kontakt vorhanden")

  const existing = await findContactIdByEmail(email)
  if (existing) return existing

  return createContactForQuote(email, quote.config_json)
}

async function resolveContactPersonId(): Promise<number> {
  const configured = getContactPersonId()
  if (configured) return configured

  const users = await sevdeskJson<{ objects: Array<{ id: string }> }>("SevUser")
  const first = users.objects?.[0]?.id
  if (!first) throw new Error("Kein sevDesk-Benutzer für contactPerson gefunden")
  return Number(first)
}

async function getNextOrderNumber(): Promise<string> {
  const data = await sevdeskJson<{ objects: string }>(
    "Order/Factory/getNextOrderNumber?orderType=AN",
  )
  return String(data.objects)
}

async function downloadOrderPdf(orderId: string): Promise<{ filename: string; pdfBuffer: Buffer }> {
  const data = await sevdeskJson<PdfResponse>(`Order/${orderId}/getPdf`)
  const pdf = data.objects
  if (!pdf?.content) throw new Error("sevDesk PDF konnte nicht geladen werden")
  return {
    filename: pdf.filename || `Angebot-${orderId}.pdf`,
    pdfBuffer: Buffer.from(pdf.content, "base64"),
  }
}

export async function createSevdeskOfferForQuote(
  quote: QuoteRequest,
): Promise<SevdeskOfferResult> {
  if (!isSevdeskConfigured()) {
    throw new Error("SEVDESK_API_TOKEN nicht gesetzt")
  }

  const price = quote.price_snapshot_json as {
    positionen?: PreisPosition[]
    gesamt_netto?: number
  }
  const positionen = mapPricePositions(price.positionen || [])
  if (!positionen.length) {
    throw new Error("Keine Preispositionen für das Angebot vorhanden")
  }

  const [contactId, contactPersonId, orderNumber] = await Promise.all([
    resolveContactId(quote),
    resolveContactPersonId(),
    getNextOrderNumber(),
  ])

  const orderDate = new Date().toLocaleDateString("de-DE")
  const header = `Angebot ${orderNumber}`

  const saved = await sevdeskJson<SaveOrderResponse>("Order/Factory/saveOrder", {
    method: "POST",
    body: JSON.stringify({
      order: {
        objectName: "Order",
        mapAll: true,
        orderNumber,
        orderType: "AN",
        contact: { id: contactId, objectName: "Contact" },
        orderDate,
        status: 100,
        header,
        headText: buildHeadText(quote.config_json, quote.id, quote.lead_email || ""),
        addressCountry: { id: 1, objectName: "StaticCountry" },
        version: 0,
        contactPerson: { id: contactPersonId, objectName: "SevUser" },
        taxRate: 0,
        taxRule: { id: 1, objectName: "TaxRule" },
        taxText: "Umsatzsteuer",
        taxType: "default",
        currency: "EUR",
        showNet: true,
        customerInternalNote: `Wristlink Anfrage #${quote.id}`,
      },
      orderPosSave: positionen,
    }),
  })

  const orderId = saved.objects?.order?.id
  const savedOrderNumber = saved.objects?.order?.orderNumber || orderNumber
  if (!orderId) throw new Error("sevDesk Angebot wurde nicht erstellt")

  const pdf = await downloadOrderPdf(orderId)

  return {
    orderId,
    orderNumber: savedOrderNumber,
    pdfFilename: pdf.filename,
    pdfBuffer: pdf.pdfBuffer,
  }
}
