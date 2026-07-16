"use server"

import { revalidatePath } from "next/cache"
import { getDb } from "@/lib/db"
import { checkProductAvailability } from "@/lib/actions/n8n-api"
import { getOrCreateVerifiedLeadForEmail, getVerifiedLead } from "@/lib/actions/leads"
import { rechnePreis } from "@/lib/pricing/preis-engine"
import { renderEmailPreview } from "@/lib/konfigurator/email"
import type { PaymentMethod, QuoteConfig, QuoteRequest, QuoteSource, QuoteStatus, FulfillmentStatus } from "@/lib/konfigurator/types"
import { formatAblehnungsgrundBlock } from "@/lib/konfigurator/email-template-render"
import { type RejectionReasonId } from "@/lib/konfigurator/rejection-reasons"
import { isAuthenticated, requireRole } from "@/lib/auth"
import {
  approveQuoteRequest,
  cancelQuoteRequest,
  createQuoteWithHold,
  expireStaleQuotes,
  finalizeQuoteAsPaid,
  getQuoteByIdInternal,
  mapQuoteRow,
  rejectQuoteRequest,
  type ExternalQuoteInput,
} from "@/lib/quotes-internal"
import { getLeadById } from "@/lib/actions/leads-internal"
import {
  compareFulfillmentUrgency,
  isFulfillmentWorkOpen,
} from "@/lib/konfigurator/fulfillment-timing"
import { defaultGroesseProGruppe, maxGruppenAnzahl } from "@/lib/konfigurator/gruppen-config"

export type { ExternalQuoteInput }

export type QuoteListFilters = {
  status?: QuoteStatus | "active" | "fulfillment_open"
  source?: QuoteSource
}

export type QuoteListOptions = {
  skipExpire?: boolean
  tableView?: boolean
  limit?: number
}

export type ManualQuoteInput = {
  email: string
  kontaktName?: string
  kontaktFirma?: string
  produkt: string
  modus: "miete" | "kauf"
  menge: number
  von?: string
  bis?: string
  station?: string
  gruppen?: number
  druck?: boolean
  szenario?: string
  notes?: string
}

export async function createManualQuoteRequest(
  input: ManualQuoteInput,
): Promise<{ success: boolean; error?: string; quoteId?: number }> {
  await requireRole(["ADMIN"])

  const email = input.email.trim().toLowerCase()
  if (!email || !email.includes("@")) {
    return { success: false, error: "Gültige E-Mail-Adresse erforderlich" }
  }

  if (input.modus === "miete" && !input.von?.trim()) {
    return { success: false, error: "Mietzeitraum (von) ist erforderlich" }
  }

  const station = input.station ?? "keine"
  if (station === "pro" && input.modus === "kauf") {
    return {
      success: false,
      error: "PRO-Basis-Station ist nur zur Miete verfügbar. Bitte Modus „Miete“ wählen oder eine andere Station.",
    }
  }

  const gruppen =
    station === "pro"
      ? Math.min(
          maxGruppenAnzahl(input.menge),
          Math.max(1, Math.floor(input.gruppen ?? 1)),
        )
      : 0

  const config: QuoteConfig = {
    kontaktName: input.kontaktName?.trim() || undefined,
    kontaktFirma: input.kontaktFirma?.trim() || undefined,
    szenario: input.szenario?.trim() || undefined,
    produkt: input.produkt,
    modus: input.modus,
    menge: input.menge,
    von: input.von?.trim() || undefined,
    bis: input.bis?.trim() || undefined,
    druck: input.druck ?? false,
    station,
    stationModus: station === "pro" ? "miete" : input.modus,
    gruppen,
    baenderProGruppe: gruppen > 0 ? defaultGroesseProGruppe(input.menge, gruppen) : 0,
    kanalanzahl: 1,
    lieferpaket: "regulaer",
    land: "DE",
    lieferzeit: "standard",
  }

  const price = rechnePreis(config)
  if (!price.gueltig) {
    return { success: false, error: price.fehler.join("; ") }
  }

  const lead = await getOrCreateVerifiedLeadForEmail(email)

  const result = await createQuoteWithHold({
    leadId: lead.id,
    config,
    price,
    source: "manual",
    notes: input.notes?.trim() || undefined,
    sendCustomerEmail: false,
    skipNotifications: true,
  })

  if (result.success) {
    revalidatePath("/warenverwaltung/auftraege")
  }

  return {
    success: result.success,
    error: result.error,
    quoteId: result.quoteId,
  }
}

const ACTIVE_QUOTE_STATUSES: QuoteStatus[] = ["submitted", "payment_pending", "approved"]

export async function submitQuoteRequest(
  config: QuoteConfig,
  options?: { skipAvailabilityCheck?: boolean },
): Promise<{ success: boolean; error?: string; publicToken?: string }> {
  const lead = await getVerifiedLead()
  if (!lead) {
    return { success: false, error: "Bitte bestätigen Sie zuerst Ihre E-Mail" }
  }

  const price = rechnePreis(config)
  if (!price.gueltig) {
    return { success: false, error: price.fehler.join("; ") }
  }

  if (config.modus === "miete") {
    if (!config.von) {
      return { success: false, error: "Mietzeitraum (von) ist erforderlich" }
    }
  }

  if (config.von && !(options?.skipAvailabilityCheck && config.modus === "miete")) {
    const availability = await checkProductAvailability({
      produkt: config.produkt,
      modus: config.modus,
      menge: config.menge,
      von: config.von,
      bis: config.bis || config.von,
      lieferzeit: config.lieferzeit,
    })
    if (!availability.verfuegbar) {
      return {
        success: false,
        error: `Nicht verfügbar im gewählten Zeitraum. Frei: ${availability.frei ?? 0}, benötigt: ${config.menge}`,
      }
    }
  }

  const result = await createQuoteWithHold({
    leadId: lead.id,
    config,
    price,
    source: "konfigurator",
    sendCustomerEmail: true,
  })

  return {
    success: result.success,
    error: result.error,
    publicToken: result.publicToken,
  }
}

export async function getQuoteByPublicToken(token: string): Promise<QuoteRequest | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT qr.*, l.email AS lead_email
    FROM quote_requests qr
    JOIN leads l ON l.id = qr.lead_id
    WHERE qr.public_token = ${token}
    LIMIT 1
  `
  if (!rows.length) return null
  return mapQuoteRow(rows[0])
}

export async function getPublicFulfillmentEvents(quoteId: number) {
  const sql = getDb()
  const rows = await sql`
    SELECT to_status, created_at, tracking_number, versand_dienstleister
    FROM quote_fulfillment_events
    WHERE quote_id = ${quoteId}
    ORDER BY created_at ASC
  `
  return rows.map((row) => ({
    to_status: row.to_status as FulfillmentStatus,
    created_at: row.created_at as string,
    tracking_number: (row.tracking_number as string | null) ?? null,
    versand_dienstleister: (row.versand_dienstleister as string | null) ?? null,
  }))
}

// Auth-geschützte Variante für Client-/Server-Component-Zugriffe.
// Gibt bei fehlender Admin-Session null zurück (statt zu werfen), damit
// vorhandene Aufrufer mit optionalem Null-Handling nicht brechen.
export async function getQuoteById(id: number): Promise<QuoteRequest | null> {
  if (!(await isAuthenticated())) return null
  return getQuoteByIdInternal(id)
}

export async function listQuoteRequests(
  filters?: QuoteListFilters,
  options?: QuoteListOptions,
): Promise<QuoteRequest[]> {
  await requireRole(["ADMIN"])
  if (!options?.skipExpire) {
    await expireStaleQuotes()
  }

  const sql = getDb()
  const fulfillmentOpenOnly = filters?.status === "fulfillment_open"
  const statusFilter =
    filters?.status === "active"
      ? ACTIVE_QUOTE_STATUSES
      : fulfillmentOpenOnly
        ? ["paid"]
        : filters?.status
          ? [filters.status]
          : null
  const safeLimit = Math.min(Math.max(Math.floor(options?.limit ?? 100), 1), 500)

  const rows = options?.tableView
    ? await sql`
      SELECT
        qr.id,
        qr.lead_id,
        qr.public_token,
        jsonb_build_object(
          'produkt', qr.config_json->>'produkt',
          'modus', qr.config_json->>'modus',
          'druck', COALESCE((qr.config_json->>'druck')::boolean, false)
        ) AS config_json,
        jsonb_build_object(
          'gesamt_netto', COALESCE((qr.price_snapshot_json->>'gesamt_netto')::numeric, 0)
        ) AS price_snapshot_json,
        qr.status,
        qr.source,
        qr.booking_id,
        qr.rejection_reason,
        qr.external_ref,
        qr.notes,
        qr.submitted_at,
        qr.approved_at,
        qr.paid_at,
        qr.expires_at,
        qr.cancelled_at,
        qr.fulfillment_status,
        qr.created_at,
        qr.updated_at,
        l.email AS lead_email
      FROM quote_requests qr
      JOIN leads l ON l.id = qr.lead_id
      WHERE qr.status != 'draft'
        AND (${statusFilter}::text[] IS NULL OR qr.status = ANY(${statusFilter}::text[]))
        AND (${!fulfillmentOpenOnly}::boolean OR qr.fulfillment_status IS NULL OR qr.fulfillment_status != 'zurueckgepackt')
        AND (${filters?.source ?? null}::text IS NULL OR qr.source = ${filters?.source ?? null})
      ORDER BY qr.submitted_at DESC NULLS LAST, qr.created_at DESC
      LIMIT ${safeLimit}
    `
    : await sql`
      SELECT qr.*, l.email AS lead_email
      FROM quote_requests qr
      JOIN leads l ON l.id = qr.lead_id
      WHERE qr.status != 'draft'
        AND (${statusFilter}::text[] IS NULL OR qr.status = ANY(${statusFilter}::text[]))
        AND (${!fulfillmentOpenOnly}::boolean OR qr.fulfillment_status IS NULL OR qr.fulfillment_status != 'zurueckgepackt')
        AND (${filters?.source ?? null}::text IS NULL OR qr.source = ${filters?.source ?? null})
      ORDER BY qr.submitted_at DESC NULLS LAST, qr.created_at DESC
      LIMIT ${safeLimit}
    `

  return rows.map((row) => mapQuoteRow(row))
}

export async function listPriorityFulfillmentOrders(limit = 3): Promise<QuoteRequest[]> {
  await requireRole(["ADMIN"])

  const sql = getDb()
  const rows = await sql`
    SELECT qr.*, l.email AS lead_email
    FROM quote_requests qr
    JOIN leads l ON l.id = qr.lead_id
    WHERE qr.status = 'paid'
      AND (qr.fulfillment_status IS NULL OR qr.fulfillment_status != 'zurueckgepackt')
    ORDER BY qr.paid_at ASC NULLS LAST, qr.submitted_at ASC NULLS LAST
    LIMIT 100
  `

  const open = rows.map((row) => mapQuoteRow(row)).filter(isFulfillmentWorkOpen)
  open.sort(compareFulfillmentUrgency)
  return open.slice(0, Math.max(1, Math.min(limit, 10)))
}

export async function getQuoteRequestStats(options?: { skipExpire?: boolean }): Promise<Record<string, number>> {
  if (!options?.skipExpire) {
    await expireStaleQuotes()
  }
  const sql = getDb()
  const [statusRows, fulfillmentOpenRows] = await Promise.all([
    sql`
      SELECT status, COUNT(*)::int AS cnt
      FROM quote_requests
      WHERE status != 'draft'
      GROUP BY status
    `,
    sql`
      SELECT COUNT(*)::int AS cnt
      FROM quote_requests
      WHERE status = 'paid'
        AND (fulfillment_status IS NULL OR fulfillment_status != 'zurueckgepackt')
    `,
  ])
  const stats: Record<string, number> = {}
  for (const row of statusRows) {
    stats[row.status as string] = row.cnt as number
  }
  stats.fulfillment_open = fulfillmentOpenRows[0]?.cnt ?? 0
  return stats
}

export async function adminApproveQuote(quoteId: number, options?: { skipStripe?: boolean }) {
  await requireRole(["ADMIN"])
  return approveQuoteRequest(quoteId, options)
}

export async function adminRejectQuote(quoteId: number, reasonId: RejectionReasonId) {
  await requireRole(["ADMIN"])
  return rejectQuoteRequest(quoteId, reasonId)
}

export async function adminCancelQuote(quoteId: number, reason?: string) {
  await requireRole(["ADMIN"])
  return cancelQuoteRequest(quoteId, reason)
}

export async function adminMarkQuotePaid(
  quoteId: number,
  input?: { paymentMethod?: PaymentMethod; paymentNote?: string; sendMail?: boolean },
) {
  await requireRole(["ADMIN"])
  return finalizeQuoteAsPaid(quoteId, {
    paymentMethod: input?.paymentMethod || "bank_transfer",
    paymentNote: input?.paymentNote,
    sendMail: input?.sendMail,
  })
}

export async function previewQuoteEmail(
  quoteId: number,
  templateKey: string,
  extra?: { reason?: string; paymentNote?: string },
) {
  await requireRole(["ADMIN"])
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return null
  const lead = await getLeadById(quote.lead_id)
  if (!lead) return null

  return renderEmailPreview({
    templateKey,
    quote,
    leadEmail: lead.email,
    extraVars: {
      ablehnungsgrund: formatAblehnungsgrundBlock(extra?.reason),
      zahlungsnotiz: extra?.paymentNote?.trim()
        ? `Hinweis: ${extra.paymentNote.trim()}\n\n`
        : "",
    },
  })
}
