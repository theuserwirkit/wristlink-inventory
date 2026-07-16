import "server-only"

import type { PreisPosition } from "@/lib/pricing/types"
import { normalizeGruppenGroessen } from "@/lib/konfigurator/gruppen-config"
import { getLieferpaketLabel, normalizeLieferpaket } from "@/lib/konfigurator/lieferpaket"
import {
  PRODUKT_ANZEIGE,
  SZENARIO_OPTIONS,
  getProbedruckLabel,
  modusAnzeige,
  normalizeDruckArt,
  normalizeProbedruckOption,
} from "@/lib/konfigurator/product-info"
import { isSevdeskConfigured, sevdeskJson } from "@/lib/konfigurator/sevdesk"
import type { QuoteConfig, QuoteRequest } from "@/lib/konfigurator/types"
import { formatKontaktAdresse } from "@/lib/konfigurator/kontakt-adresse"

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

function formatDeDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
}

function formatDateRange(von?: string, bis?: string): string | null {
  if (!von) return null
  const end = bis && bis !== von ? bis : null
  if (end) return `${formatDeDate(von)} – ${formatDeDate(end)}`
  return formatDeDate(von)
}

function szenarioLabel(value?: string): string | null {
  if (!value) return null
  return SZENARIO_OPTIONS.find((o) => o.value === value)?.label ?? value
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function modusLabel(modus: string): string {
  return modusAnzeige(modus)
}

function buildOrderAddress(quote: QuoteRequest): string {
  const config = quote.config_json
  const lines: string[] = []

  const firma = config.kontaktFirma?.trim()
  const name = config.kontaktName?.trim()
  if (firma) lines.push(firma)
  if (name) lines.push(name)
  if (!firma && !name) lines.push("Kunde Wristlink")

  const ort = config.technikerAdresse?.trim()
  if (ort) lines.push(ort)

  lines.push("Deutschland")
  return lines.join("\n")
}

function htmlParagraph(text: string): string {
  return `<p>${escapeHtml(text)}</p>`
}

function htmlSection(title: string, items: string[]): string {
  if (!items.length) return ""
  const body = items.map((item) => escapeHtml(item)).join("<br/>")
  return `<p><strong>${escapeHtml(title)}</strong><br/>${body}</p>`
}

function buildPositionText(pos: string, config: QuoteConfig): string | undefined {
  const produktBasis = PRODUKT_ANZEIGE[config.produkt] ?? config.produkt
  const zeitraum = formatDateRange(config.von, config.bis)

  if (
    pos.includes(`(${modusLabel(config.modus)})`) ||
    pos.includes(`(${config.modus})`) ||
    pos.startsWith(produktBasis)
  ) {
    const details: string[] = [`${config.menge.toLocaleString("de-DE")} Stück`]
    if (config.variante === "premium") details.push("Premium-Variante")
    if (config.kanalanzahl) details.push(`${config.kanalanzahl} Kanäle`)
    if (config.modus === "miete" && zeitraum) details.push(`Mietzeitraum: ${zeitraum}`)
    return details.join(" · ")
  }

  if (pos === "Druck – Setup-/Abwicklungsgebühr") {
    return "Einmalige Vorbereitung, Farbabstimmung und Produktionsfreigabe für den Logo-Druck (3 × 2 cm)."
  }
  if (pos === "Druck – pro Stück") {
    return "Individueller Logo-Druck je LED-Armband gemäß hochgeladenem Motiv."
  }
  if (pos === "Vollflächiger Druck – pro Stück") {
    return "Vollflächige Bedruckung je LED-Armband – abgestimmt im Projektablauf."
  }

  const probedruckLabel = getProbedruckLabel(normalizeProbedruckOption(config))
  if (probedruckLabel && pos === probedruckLabel) {
    return normalizeProbedruckOption(config) === "versand"
      ? "Physisches Muster per Post zur Freigabe vor der Serienproduktion."
      : "Musterdruck mit Fotodokumentation zur Freigabe vor der Serienproduktion."
  }

  if (pos.startsWith("Lieferpaket ")) {
    const paket = normalizeLieferpaket(config)
    if (paket === "eil") return "Eilauftrag mit beschleunigter Anlieferung (48 Stunden)."
    if (paket === "express") return "Express-Anlieferung mit verkürzter Vorlaufzeit."
    return "Reguläre Anlieferung gemäß gewähltem Lieferpaket."
  }

  if (pos === "Flex-Rückgabe") {
    return "Verlängertes Rücksendefenster für Miet-Equipment nach dem Event."
  }

  if (pos === "Gruppenprogrammierung") {
    const groessen = normalizeGruppenGroessen(config)
    const gruppenInfo =
      groessen.length > 0
        ? groessen.map((n, i) => `Gruppe ${i + 1}: ${n} Bänder`).join(", ")
        : null
    return gruppenInfo
      ? `Individuelle Lichtprogramme pro Gruppe (${gruppenInfo}).`
      : "Individuelle Lichtprogramme für bis zu 20 Gästegruppen über die PRO Basis-Station."
  }

  if (pos.startsWith("ECO Handcontroller")) {
    return "Handfernbedienung zur zentralen Steuerung aller Armbänder."
  }
  if (pos === "PRO Basis-Station (Miete)") {
    return "DMX/Bluetooth-Basis-Station für Live-Steuerung und Gruppenprogrammierung."
  }

  if (pos.startsWith("Versand ")) {
    return "Versand innerhalb Deutschlands per UPS oder TNT."
  }

  if (pos === "Techniker – Reisepauschale") {
    return "An- und Abreise sowie Vor-Ort-Setup am Veranstaltungstag."
  }
  if (pos === "Techniker – Einsatztag") {
    const tage = config.technikerTage ?? 1
    return `${tage} Einsatztag${tage === 1 ? "" : "e"} vor Ort${config.technikerAdresse ? ` (${config.technikerAdresse})` : ""}.`
  }
  if (pos === "Techniker – Fahrtkosten") {
    return config.technikerKm
      ? `Fahrtkosten für ${config.technikerKm.toLocaleString("de-DE")} km (Hin- und Rückfahrt).`
      : "Fahrtkosten gemäß Kilometerangabe."
  }

  return undefined
}

function mapPricePositions(positionen: PreisPosition[], config: QuoteConfig): OrderPosPayload[] {
  const partId = getDefaultPartId()
  return positionen
    .filter((p) => p.summe > 0)
    .map((p, index) => {
      const quantity = p.menge > 0 ? p.menge : 1
      const unitPrice = p.menge > 0 ? p.einzel : p.summe
      const text = buildPositionText(p.pos, config)
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
      if (text) payload.text = text
      if (partId) {
        payload.part = { id: partId, objectName: "Part" }
      }
      return payload
    })
}

function buildHeadText(quote: QuoteRequest): string {
  const config = quote.config_json
  const email = quote.lead_email?.trim() || ""
  const zeitraum = formatDateRange(config.von, config.bis)
  const produktBasis = PRODUKT_ANZEIGE[config.produkt] ?? config.produkt
  const druckArt = normalizeDruckArt(config)

  const blocks: string[] = [
    htmlParagraph("Sehr geehrte Damen und Herren,"),
    htmlParagraph(
      "vielen Dank für Ihre Anfrage über den WIRKUNG Wristlink Konfigurator. Gerne unterbreiten wir Ihnen folgendes Angebot.",
    ),
    htmlParagraph(`Anfrage-Nr.: #${quote.id}`),
  ]

  if (quote.public_token) {
    blocks.push(htmlParagraph(`Referenz: ${quote.public_token}`))
  }

  const kundenangaben: string[] = []
  if (config.kontaktName?.trim()) kundenangaben.push(`Ansprechpartner: ${config.kontaktName.trim()}`)
  if (config.kontaktFirma?.trim()) kundenangaben.push(`Firma: ${config.kontaktFirma.trim()}`)
  if (email) kundenangaben.push(`E-Mail: ${email}`)
  if (config.kontaktTelefon?.trim()) kundenangaben.push(`Telefon: ${config.kontaktTelefon.trim()}`)
  const adresse = formatKontaktAdresse(config)
  if (adresse) kundenangaben.push(`Adresse: ${adresse}`)

  const kundenSection = htmlSection("Kundenangaben", kundenangaben)
  if (kundenSection) blocks.push(kundenSection)

  const veranstaltung: string[] = []
  const szenario = szenarioLabel(config.szenario)
  if (szenario) veranstaltung.push(`Art der Veranstaltung: ${szenario}`)
  if (zeitraum) veranstaltung.push(`Zeitraum: ${zeitraum}`)
  if (config.technikerAdresse?.trim()) {
    veranstaltung.push(`Veranstaltungsort: ${config.technikerAdresse.trim()}`)
  }

  const eventSection = htmlSection("Veranstaltung", veranstaltung)
  if (eventSection) blocks.push(eventSection)

  const konfiguration: string[] = [
    `Produkt: ${produktBasis} (${modusLabel(config.modus)})`,
    `Menge: ${config.menge.toLocaleString("de-DE")} Stück`,
  ]
  if (config.variante === "premium") konfiguration.push("Variante: Premium")
  if (config.kanalanzahl) konfiguration.push(`Kanalanzahl: ${config.kanalanzahl} CH`)
  if (config.druck && config.modus === "kauf") {
    konfiguration.push(
      druckArt === "vollflaechig" ? "Bedruckung: Vollflächig" : "Bedruckung: Logo-Druck (3 × 2 cm)",
    )
  }
  const probedruckLabel = getProbedruckLabel(normalizeProbedruckOption(config))
  if (probedruckLabel) konfiguration.push(`Probedruck: ${probedruckLabel}`)
  if ((config.gruppen ?? 0) > 0) {
    konfiguration.push(`Gruppenprogrammierung: ${config.gruppen} Gruppe(n)`)
  }
  if (config.station && config.station !== "keine") {
    konfiguration.push(
      `Basis-Station: ${config.station.toUpperCase()} (${modusLabel(config.stationModus || config.modus)})`,
    )
  }
  konfiguration.push(`Lieferpaket: ${getLieferpaketLabel(normalizeLieferpaket(config))}`)
  if (config.flexRueckgabe || config.flex) konfiguration.push("Flex-Rückgabe: ja")

  blocks.push(htmlSection("Konfiguration", konfiguration))
  blocks.push(
    htmlParagraph("Alle Preise verstehen sich netto zzgl. der gesetzlichen Umsatzsteuer."),
  )

  return blocks.join("")
}

async function fetchTextTemplateByName(name: string): Promise<string | null> {
  try {
    const data = await sevdeskJson<{
      objects: Array<{ name?: string; text?: string }>
    }>("TextTemplate?limit=1000")
    const template = data.objects?.find(
      (t) => t.name?.trim().toLowerCase() === name.trim().toLowerCase(),
    )
    return template?.text?.trim() || null
  } catch {
    return null
  }
}

async function buildFootText(): Promise<string> {
  const templateName =
    process.env.SEVDESK_FOOTER_TEMPLATE_NAME?.trim() || "Wristlink-Fusstext"
  const templateText = await fetchTextTemplateByName(templateName)
  if (templateText) return templateText

  return [
    "<p>Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.</p>",
    "<p>Mit freundlichen Grüßen<br/>Ihr WIRKUNG-Team</p>",
  ].join("")
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
  const positionen = mapPricePositions(price.positionen || [], quote.config_json)
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
  const footText = await buildFootText()
  const address = buildOrderAddress(quote)

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
        headText: buildHeadText(quote),
        footText,
        address,
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
