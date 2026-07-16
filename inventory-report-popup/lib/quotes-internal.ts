import "server-only"

import { randomUUID } from "crypto"
import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { getDb } from "@/lib/db"
import { checkProductAvailability } from "@/lib/actions/n8n-api"
import {
  createQuoteHoldBooking,
  finalizeQuoteBookingOnPayment,
  releaseQuoteBooking,
} from "@/lib/actions/quote-booking-internal"
import { getOrCreateVerifiedLeadForEmail } from "@/lib/actions/leads"
import { getLeadById } from "@/lib/actions/leads-internal"
import { rechnePreis } from "@/lib/pricing/preis-engine"
import {
  sendCustomerApprovedEmail,
  sendCustomerPaidEmail,
  sendCustomerRejectedEmail,
  sendCustomerSubmittedEmail,
  sendN8nApprovedOfferEmail,
  sendTeamQuoteNotification,
} from "@/lib/konfigurator/email"
import { sendQuoteTelegramNotification, isTelegramConfigured } from "@/lib/konfigurator/telegram"
import { createCheckoutSessionForQuote, isStripeConfigured } from "@/lib/konfigurator/stripe"
import { getAppBaseUrl } from "@/lib/konfigurator/lead-auth"
import { canCustomerEditQuoteStatus, CUSTOMER_EDITABLE_STATUSES } from "@/lib/konfigurator/quote-status"
import { mergeCustomerEditConfig, buildChangeSummary } from "@/lib/konfigurator/quote-customer-edit"
import {
  ensureInitialQuoteVersion,
  insertQuoteVersion,
  getNextVersionNumber,
} from "@/lib/konfigurator/quote-versions"
import type { AvailabilityStressLevel } from "@/lib/konfigurator/availability-stress"
import type { PaymentMethod, QuoteConfig, QuoteRequest, QuoteSource } from "@/lib/konfigurator/types"
import { getProbedruckLabel, normalizeProbedruckOption } from "@/lib/konfigurator/product-info"
import { getLieferpaketLabel, normalizeLieferpaket } from "@/lib/konfigurator/lieferpaket"
import { normalizeGruppenGroessen } from "@/lib/konfigurator/gruppen-config"
import { formatKontaktAdresse } from "@/lib/konfigurator/kontakt-adresse"
import { getRejectionMessage, type RejectionReasonId } from "@/lib/konfigurator/rejection-reasons"
import { priceSnapshotSchema, quoteConfigSchema, formatZodError } from "@/lib/api-schemas"
import { getQuoteOfferPdfForEmail } from "@/lib/actions/quote-offer-pdf-internal"
import { toSafeErrorMessage } from "@/lib/safe-error"

const PAYMENT_EXPIRY_DAYS = 7

export function mapQuoteRow(row: Record<string, unknown>): QuoteRequest {
  const { offer_pdf_data: _pdf, offer_pdf_mime_type: _mime, ...safeRow } = row
  return {
    ...safeRow,
    source: (row.source as QuoteSource) || "konfigurator",
    booking_id: (row.booking_id as number | null) ?? null,
    external_ref: (row.external_ref as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    fulfillment_status: (row.fulfillment_status as QuoteRequest["fulfillment_status"]) ?? null,
    tracking_number: (row.tracking_number as string | null) ?? null,
    versand_dienstleister: (row.versand_dienstleister as QuoteRequest["versand_dienstleister"]) ?? null,
    payment_method: (row.payment_method as QuoteRequest["payment_method"]) ?? null,
    payment_note: (row.payment_note as string | null) ?? null,
    return_booking_id: (row.return_booking_id as number | null) ?? null,
    offer_pdf_filename: (row.offer_pdf_filename as string | null) ?? null,
    sevdesk_order_id: (row.sevdesk_order_id as string | null) ?? null,
    sevdesk_order_number: (row.sevdesk_order_number as string | null) ?? null,
    packing_docs_printed_at: (row.packing_docs_printed_at as string | null) ?? null,
    config_json: typeof row.config_json === "string" ? JSON.parse(row.config_json) : row.config_json,
    price_snapshot_json:
      typeof row.price_snapshot_json === "string"
        ? JSON.parse(row.price_snapshot_json)
        : row.price_snapshot_json,
  } as QuoteRequest
}

function configSummary(config: QuoteConfig): string {
  const lines: string[] = []
  if (config.kontaktName) lines.push(`Ansprechpartner: ${config.kontaktName}`)
  if (config.kontaktFirma) lines.push(`Firma: ${config.kontaktFirma}`)
  if (config.kontaktTelefon) lines.push(`Telefon: ${config.kontaktTelefon}`)
  const adresse = formatKontaktAdresse(config)
  if (adresse) lines.push(`Adresse: ${adresse}`)
  if (config.szenario) lines.push(`Event: ${config.szenario}`)
  if (config.von) {
    lines.push(`Eventzeitraum: ${config.von} – ${config.bis || config.von}`)
  }
  if (config.technikerAdresse) {
    lines.push(`Eventadresse: ${config.technikerAdresse}`)
  }
  lines.push(
    `Produkt: ${config.produkt}`,
    `Modus: ${config.modus}`,
    `Menge: ${config.menge}`,
  )
  if (config.produkt === "armband" && config.variante) {
    lines.push(`Variante: ${config.variante}`)
  }
  if (config.produkt === "armband" && config.kanalanzahl) {
    lines.push(`Kanalanzahl: ${config.kanalanzahl} CH`)
  }
  if (config.modus === "miete" && config.von) {
    lines.push(`Zeitraum: ${config.von} – ${config.bis || config.von}`)
  }
  lines.push(
    `Druck: ${
      config.druck
        ? config.druckArt === "vollflaechig"
          ? "vollflächig"
          : "Logo-Druck"
        : "nein"
    }`,
    config.logoId ? `Logo: ${config.logoId}` : "",
    `Probedruck: ${getProbedruckLabel(normalizeProbedruckOption(config)) ?? "nein"}`,
    `Lieferpaket: ${getLieferpaketLabel(normalizeLieferpaket(config))}`,
    `Flex-Rückgabe: ${config.flexRueckgabe || config.flex ? "ja" : "nein"}`,
    `Lieferland: Deutschland`,
    `Gruppen: ${config.gruppen ?? 0}`,
    (config.gruppen ?? 0) > 0
      ? `Gruppengrößen: ${normalizeGruppenGroessen(config).map((n, i) => `G${i + 1}: ${n}`).join(", ")}`
      : "",
    `Basis-Station: ${config.station}${config.station !== "keine" ? ` (${config.stationModus || config.modus})` : ""}`,
  )
  if (config.techniker) {
    lines.push(
      `Techniker: ${config.technikerTage} Tag(e)`,
      `Eventadresse: ${config.technikerAdresse || "–"}`,
      `Fahrt: ${config.technikerKm ?? 0} km`,
    )
  }
  return lines.join("\n")
}

async function notifyTeamAboutQuote(
  quoteId: number,
  email: string,
  config: QuoteConfig,
  price: { gesamt_netto: number; gesamt_brutto: number },
  source: QuoteSource = "konfigurator",
) {
  const adminUrl = `${getAppBaseUrl()}/warenverwaltung/auftraege/${quoteId}`
  const notificationTasks: Array<{ name: string; task: Promise<unknown> }> = [
    {
      name: "team-email",
      task: sendTeamQuoteNotification({
        quoteId,
        email,
        configSummary: configSummary(config),
        totalNetto: price.gesamt_netto,
        totalBrutto: price.gesamt_brutto,
        adminUrl,
      }),
    },
  ]
  if (isTelegramConfigured()) {
    notificationTasks.push({
      name: "telegram",
      task: sendQuoteTelegramNotification({
        quoteId,
        email,
        summary: configSummary(config),
        totalNetto: price.gesamt_netto,
        totalBrutto: price.gesamt_brutto,
        source,
      }),
    })
  }

  const settled = await Promise.allSettled(notificationTasks.map((entry) => entry.task))
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Quote notification ${notificationTasks[index].name} failed:`, result.reason)
    }
  })
}

export async function createQuoteWithHold(input: {
  leadId: number
  config: QuoteConfig
  price: ReturnType<typeof rechnePreis>
  source: QuoteSource
  externalRef?: string
  notes?: string
  sendCustomerEmail?: boolean
  skipNotifications?: boolean
}): Promise<{ success: boolean; error?: string; quoteId?: number; publicToken?: string }> {
  const publicToken = randomUUID()
  const sql = getDb()

  const inserted = await sql`
    INSERT INTO quote_requests (
      lead_id, public_token, config_json, price_snapshot_json, status, source,
      external_ref, notes, submitted_at
    ) VALUES (
      ${input.leadId},
      ${publicToken},
      ${JSON.stringify(input.config)},
      ${JSON.stringify(input.price)},
      'submitted',
      ${input.source},
      ${input.externalRef || null},
      ${input.notes || null},
      NOW()
    )
    RETURNING id
  `

  const quoteId = inserted[0].id as number
  const lead = await getLeadById(input.leadId)

  await ensureInitialQuoteVersion({
    quoteRequestId: quoteId,
    config: input.config,
    price: input.price as unknown as Record<string, unknown>,
    changedBy: "customer",
  })

  // Hold-Fehler blockiert die Anfrage nicht (Soft-Submit): Quote bleibt submitted,
  // Team sieht den Hinweis in notes und prüft manuell.
  const hold = await createQuoteHoldBooking(quoteId, input.config, lead?.email)
  if (!hold.success) {
    const holdWarning = hold.error || "Hold fehlgeschlagen"
    await sql`
      UPDATE quote_requests SET
        notes = COALESCE(notes || E'\n', '') || ${`[System] Hold bei Anfrage: ${holdWarning}`},
        updated_at = NOW()
      WHERE id = ${quoteId}
    `
  } else if (hold.bookingId) {
    await sql`UPDATE quote_requests SET booking_id = ${hold.bookingId}, updated_at = NOW() WHERE id = ${quoteId}`
  }

  const notificationTasks: Array<{ name: string; task: Promise<unknown> }> = []

  if (input.sendCustomerEmail && lead) {
    const offerUrl = `${getAppBaseUrl()}/angebot/${publicToken}`
    notificationTasks.push({
      name: "customer-submitted-email",
      task: sendCustomerSubmittedEmail({ email: lead.email, quoteId, offerUrl }),
    })
  }

  if (lead && !input.skipNotifications) {
    const priceNotify = {
      gesamt_netto: Number((input.price as { gesamt_netto?: number }).gesamt_netto) || 0,
      gesamt_brutto: Number((input.price as { gesamt_brutto?: number }).gesamt_brutto) || 0,
    }
    notificationTasks.push({
      name: "team-notifications",
      task: notifyTeamAboutQuote(quoteId, lead.email, input.config, priceNotify, input.source),
    })
  }

  if (notificationTasks.length > 0) {
    const settled = await Promise.allSettled(notificationTasks.map((entry) => entry.task))
    settled.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Quote notification ${notificationTasks[index].name} failed:`, result.reason)
      }
    })
  }

  revalidatePath("/warenverwaltung/auftraege")
  return { success: true, quoteId, publicToken }
}

export type ExternalQuoteInput = {
  email: string
  config: QuoteConfig
  price_snapshot?: Record<string, unknown>
  external_ref?: string
  notes?: string
  skip_notifications?: boolean
}

export async function createExternalQuoteRequest(
  input: ExternalQuoteInput,
): Promise<{ success: boolean; error?: string; quoteId?: number }> {
  const configResult = quoteConfigSchema.safeParse(input.config)
  if (!configResult.success) {
    return { success: false, error: `Ungültige Konfiguration: ${formatZodError(configResult.error)}` }
  }

  if (input.price_snapshot !== undefined) {
    const priceSnapshotResult = priceSnapshotSchema.safeParse(input.price_snapshot)
    if (!priceSnapshotResult.success) {
      return {
        success: false,
        error: `Ungültiger price_snapshot: ${formatZodError(priceSnapshotResult.error)}`,
      }
    }
  }

  const lead = await getOrCreateVerifiedLeadForEmail(input.email)
  const price = input.price_snapshot
    ? { ...input.price_snapshot, gueltig: true }
    : rechnePreis(input.config)

  if (!input.price_snapshot) {
    const computed = price as ReturnType<typeof rechnePreis>
    if (!computed.gueltig) {
      return { success: false, error: computed.fehler.join("; ") }
    }
  }

  return createQuoteWithHold({
    leadId: lead.id,
    config: input.config,
    price: price as ReturnType<typeof rechnePreis>,
    source: "n8n_email",
    externalRef: input.external_ref,
    notes: input.notes,
    sendCustomerEmail: false,
    skipNotifications: input.skip_notifications ?? false,
  })
}

export async function expireStaleQuotes(): Promise<number> {
  const sql = getDb()
  const stale = await sql`
    SELECT id, booking_id FROM quote_requests
    WHERE status = 'payment_pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
  `

  for (const row of stale) {
    await releaseQuoteBooking(row.booking_id as number | null)
    await sql`
      UPDATE quote_requests SET
        status = 'expired',
        booking_id = NULL,
        updated_at = NOW()
      WHERE id = ${row.id}
    `
  }

  if (stale.length > 0) {
    revalidatePath("/warenverwaltung/auftraege")
  }

  return stale.length
}

export async function getQuoteByIdInternal(id: number): Promise<QuoteRequest | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT qr.*, l.email AS lead_email
    FROM quote_requests qr
    JOIN leads l ON l.id = qr.lead_id
    WHERE qr.id = ${id}
    LIMIT 1
  `
  if (!rows.length) return null
  return mapQuoteRow(rows[0])
}

export async function updateQuoteByPublicToken(input: {
  publicToken: string
  incomingConfig: QuoteConfig
  availabilityLevel: AvailabilityStressLevel
  availabilityLabel?: string | null
}): Promise<{ success: boolean; error?: string; quoteId?: number }> {
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT qr.*, l.email AS lead_email
      FROM quote_requests qr
      JOIN leads l ON l.id = qr.lead_id
      WHERE qr.public_token = ${input.publicToken}
      LIMIT 1
    `
    if (!rows.length) return { success: false, error: "Anfrage nicht gefunden" }
    const quote = mapQuoteRow(rows[0])

    if (!canCustomerEditQuoteStatus(quote.status)) {
      return { success: false, error: "Änderung in diesem Status nicht möglich" }
    }

    const previous = quote.config_json
    const merged = mergeCustomerEditConfig(previous, input.incomingConfig)
    const price = rechnePreis(merged)
    if (!price.gueltig) {
      return { success: false, error: price.fehler.join("; ") }
    }

    await ensureInitialQuoteVersion({
      quoteRequestId: quote.id,
      config: previous,
      price: quote.price_snapshot_json,
      changedBy: "system",
    })

    const versionNumber = await getNextVersionNumber(quote.id)
    const changeSummary = buildChangeSummary(previous, merged)

    await insertQuoteVersion({
      quoteRequestId: quote.id,
      versionNumber,
      config: merged,
      price: price as unknown as Record<string, unknown>,
      availabilityLevel: input.availabilityLevel,
      availabilityLabel: input.availabilityLabel ?? null,
      changedBy: "customer",
      changeSummary,
    })

    await releaseQuoteBooking(quote.booking_id)
    const hold = await createQuoteHoldBooking(quote.id, merged, quote.lead_email)

    // Hold-Fehler blockiert die Kundenänderung nicht (Spec): die Anfrage wird trotzdem
    // gespeichert, Status geht zurück auf Prüfung, Team wird per Notiz gewarnt.
    let holdWarning: string | null = null
    let newBookingId: number | null = null
    if (!hold.success) {
      holdWarning = hold.error || "Hold fehlgeschlagen"
    } else {
      newBookingId = hold.bookingId ?? null
    }

    // TOCTOU-Schutz: Zwischen dem initialen Status-Check oben und diesem UPDATE kann der
    // Status parallel gewechselt haben (z. B. Admin lehnt ab oder Kunde bezahlt). Das UPDATE
    // greift daher nur, wenn der Status weiterhin kundeneditierbar ist; sonst wird die frisch
    // angelegte Hold-Buchung wieder freigegeben, um keine verwaiste Reservierung zu hinterlassen.
    const updated = await sql`
      UPDATE quote_requests SET
        config_json = ${JSON.stringify(merged)},
        price_snapshot_json = ${JSON.stringify(price)},
        status = 'submitted',
        approved_at = NULL,
        expires_at = NULL,
        stripe_checkout_session_id = NULL,
        stripe_payment_link_url = NULL,
        booking_id = ${newBookingId},
        notes = CASE
          WHEN ${holdWarning}::text IS NOT NULL
          THEN COALESCE(notes || E'\n', '') || ${`[System] Hold nach Kundenänderung: ${holdWarning}`}
          ELSE notes
        END,
        updated_at = NOW()
      WHERE id = ${quote.id}
        AND status = ANY(${CUSTOMER_EDITABLE_STATUSES}::text[])
      RETURNING id
    `

    if (updated.length === 0) {
      await releaseQuoteBooking(newBookingId)
      return { success: false, error: "Änderung in diesem Status nicht möglich" }
    }

    if (quote.lead_email && isTelegramConfigured()) {
      void sendQuoteTelegramNotification({
        quoteId: quote.id,
        email: quote.lead_email,
        summary: `Kundenänderung: ${changeSummary}`,
        totalNetto: Number(price.gesamt_netto) || 0,
        totalBrutto: Number(price.gesamt_brutto) || 0,
        source: quote.source,
      }).catch((err) => console.error("Telegram customer-edit notify failed", err))
    }

    revalidatePath("/warenverwaltung/auftraege")
    revalidatePath(`/angebot/${input.publicToken}`)
    return { success: true, quoteId: quote.id }
  } catch (e) {
    return {
      success: false,
      error: toSafeErrorMessage(e, "updateQuoteByPublicToken"),
    }
  }
}

function scheduleApprovalCustomerEmail(params: {
  quoteId: number
  email: string
  quote: QuoteRequest
  paymentUrl?: string
}) {
  after(async () => {
    try {
      const pdf = await getQuoteOfferPdfForEmail(params.quoteId)
      const mailResult = await sendCustomerApprovedEmail({
        email: params.email,
        quote: params.quote,
        paymentUrl: params.paymentUrl,
        attachments: pdf ? [{ filename: pdf.filename, content: pdf.data }] : undefined,
      })
      if (!mailResult.success) {
        console.error("Approval email failed:", mailResult.error)
      }
    } catch (e) {
      console.error("Approval email failed:", e)
    }
  })
}

function scheduleN8nApprovedOfferEmail(params: { email: string; offerText: string }) {
  after(async () => {
    try {
      await sendN8nApprovedOfferEmail(params)
    } catch (e) {
      console.error("n8n offer email failed:", e)
    }
  })
}

async function revalidateAvailability(quote: QuoteRequest): Promise<string | null> {
  const config = quote.config_json
  if (config.modus !== "miete") return null

  const availability = await checkProductAvailability({
    produkt: config.produkt,
    modus: config.modus,
    menge: config.menge,
    von: config.von,
    bis: config.bis || config.von,
  })

  if (!availability.verfuegbar) {
    return `Nicht mehr verfügbar. Frei: ${availability.frei ?? 0}`
  }
  return null
}

export async function approveQuoteRequest(
  quoteId: number,
  options?: { skipStripe?: boolean },
): Promise<{ success: boolean; error?: string }> {
  try {
    const quote = await getQuoteByIdInternal(quoteId)
    if (!quote) return { success: false, error: "Anfrage nicht gefunden" }
    if (quote.status !== "submitted") {
      return { success: false, error: `Status ${quote.status} kann nicht freigegeben werden` }
    }

    const availError = await revalidateAvailability(quote)
    if (availError) return { success: false, error: availError }

    const lead = await getLeadById(quote.lead_id)
    if (!lead) return { success: false, error: "Lead nicht gefunden" }

    const sql = getDb()

    if (quote.source === "n8n_email") {
      await sql`
        UPDATE quote_requests SET
          status = 'approved',
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = ${quoteId}
      `

      if (quote.notes) {
        scheduleN8nApprovedOfferEmail({ email: lead.email, offerText: quote.notes })
      }

      revalidatePath("/warenverwaltung/auftraege")
      revalidatePath(`/warenverwaltung/auftraege/${quoteId}`)
      return { success: true }
    }

    const useStripe = !options?.skipStripe && isStripeConfigured()

    if (!useStripe) {
      await sql`
        UPDATE quote_requests SET
          status = 'approved',
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = ${quoteId}
      `

      scheduleApprovalCustomerEmail({
        quoteId,
        email: lead.email,
        quote: { ...quote, status: "approved" },
      })

      revalidatePath("/warenverwaltung/auftraege")
      revalidatePath(`/warenverwaltung/auftraege/${quoteId}`)
      return { success: true }
    }

    let sessionId: string
    let url: string
    try {
      const checkout = await createCheckoutSessionForQuote(quote, lead.email, {
        name: lead.name,
        firma: lead.firma,
      })
      sessionId = checkout.sessionId
      url = checkout.url
    } catch (e) {
      return {
        success: false,
        error: toSafeErrorMessage(e, "createCheckoutSessionForQuote"),
      }
    }

    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    await sql`
      UPDATE quote_requests SET
        status = 'payment_pending',
        approved_at = NOW(),
        expires_at = ${expiresAt.toISOString()},
        stripe_checkout_session_id = ${sessionId},
        stripe_payment_link_url = ${url},
        updated_at = NOW()
      WHERE id = ${quoteId}
    `

    scheduleApprovalCustomerEmail({
      quoteId,
      email: lead.email,
      quote: { ...quote, status: "payment_pending" },
      paymentUrl: url,
    })

    revalidatePath("/warenverwaltung/auftraege")
    revalidatePath(`/warenverwaltung/auftraege/${quoteId}`)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: toSafeErrorMessage(e, "approveQuoteRequest"),
    }
  }
}

async function finalizeRejectedQuote(quote: QuoteRequest, reasonMessage: string) {
  const sql = getDb()
  await releaseQuoteBooking(quote.booking_id)

  await sql`
    UPDATE quote_requests SET
      status = 'rejected',
      rejection_reason = ${reasonMessage},
      booking_id = NULL,
      updated_at = NOW()
    WHERE id = ${quote.id}
  `

  revalidatePath("/warenverwaltung/auftraege")
}

export async function rejectQuoteRequest(
  quoteId: number,
  reasonId: RejectionReasonId = "nicht_lieferbar",
): Promise<{ success: boolean; error?: string }> {
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return { success: false, error: "Anfrage nicht gefunden" }
  if (quote.status !== "submitted") {
    return { success: false, error: `Status ${quote.status} kann nicht abgelehnt werden` }
  }

  const reasonMessage = getRejectionMessage(reasonId)
  const lead = await getLeadById(quote.lead_id)

  await finalizeRejectedQuote(quote, reasonMessage)

  if (lead && quote.source === "konfigurator") {
    try {
      await sendCustomerRejectedEmail({
        email: lead.email,
        quote,
        reason: reasonMessage,
      })
    } catch (e) {
      console.error("Rejection email failed:", e)
    }
  }

  return { success: true }
}

export async function cancelQuoteRequest(
  quoteId: number,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return { success: false, error: "Anfrage nicht gefunden" }

  const cancellable = ["submitted", "payment_pending", "approved"]
  if (!cancellable.includes(quote.status)) {
    return { success: false, error: `Status ${quote.status} kann nicht storniert werden` }
  }

  const sql = getDb()
  await releaseQuoteBooking(quote.booking_id)

  await sql`
    UPDATE quote_requests SET
      status = 'cancelled',
      rejection_reason = ${reason || "Manuell storniert"},
      booking_id = NULL,
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = ${quoteId}
  `

  revalidatePath("/warenverwaltung/auftraege")
  return { success: true }
}

/**
 * B-09: Idempotenz gegen doppelt zugestellte Stripe-Events. Das INSERT mit
 * `ON CONFLICT (event_id) DO NOTHING RETURNING` ist atomar (Postgres reserviert
 * die Zeile innerhalb eines einzelnen Statements) — anders als ein vorheriges
 * SELECT-then-INSERT können zwei parallele Zustellungen desselben Events NICHT
 * beide den "noch nicht verarbeitet"-Zweig durchlaufen. Bei Konflikt (bereits
 * verarbeitet) liefert die Funktion `alreadyProcessed: true` statt zu werfen,
 * damit die Webhook-Route weiterhin `{received:true}` zurückgeben kann und
 * Stripe nicht unnötig retried.
 */
export async function processPaidQuote(quoteId: number, stripeEventId: string) {
  const sql = getDb()

  const inserted = await sql`
    INSERT INTO stripe_webhook_events (event_id) VALUES (${stripeEventId})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `
  if (inserted.length === 0) return { alreadyProcessed: true }

  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return { success: false, error: "Quote not found" }
  if (quote.status === "paid") return { alreadyProcessed: true }

  return finalizeQuoteAsPaid(quoteId, {
    paymentMethod: "stripe",
    stripeEventId,
  })
}

export async function finalizeQuoteAsPaid(
  quoteId: number,
  options: {
    paymentMethod: PaymentMethod
    paymentNote?: string
    stripeEventId?: string
    sendMail?: boolean
  },
): Promise<{ success: boolean; error?: string; alreadyProcessed?: boolean }> {
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return { success: false, error: "Anfrage nicht gefunden" }
  if (quote.status === "paid") return { success: true, alreadyProcessed: true }

  const payable = ["payment_pending", "approved"]
  if (!payable.includes(quote.status)) {
    return { success: false, error: `Status ${quote.status} kann nicht als bezahlt markiert werden` }
  }

  const sql = getDb()

  // C-04: Buchungs-Finalisierung läuft jetzt VOR dem Status-Wechsel auf "paid". Vorher
  // wurde der Status zuerst auf "paid" gesetzt und bei einem Buchungsfehler nur eine
  // Notiz angehängt — die Anfrage blieb dann "fertig bezahlt ohne Buchung" stehen, ohne
  // klaren Retry-Pfad. Jetzt: Wenn die Buchung fehlschlägt, bleibt der Status auf dem
  // bisherigen (zahlbaren) Wert stehen, die Notiz wird trotzdem geschrieben (bestehendes
  // Logging bleibt erhalten) — ein erneuter Aufruf von finalizeQuoteAsPaid (z. B. über den
  // Admin-Retry-Pfad `markQuoteAsPaid` in lib/actions/quotes.ts) kann die Buchung dann
  // erneut versuchen, da `payable` weiterhin erfüllt ist. Für Stripe-Zahlungen bleibt das
  // zugehörige Event dank B-09 (ON CONFLICT DO NOTHING auf stripe_webhook_events) bereits
  // als verarbeitet markiert; ein manueller Admin-Retry ist davon unabhängig möglich.
  const lead = await getLeadById(quote.lead_id)

  const paidQuoteForBooking = {
    ...quote,
    status: "paid" as const,
    paid_at: new Date().toISOString(),
    fulfillment_status: "angenommen" as const,
  }

  const bookingResult = await finalizeQuoteBookingOnPayment(quoteId, paidQuoteForBooking, {
    leadEmail: lead?.email,
    leadName: lead?.name,
    leadFirma: lead?.firma,
  })
  if (!bookingResult.success) {
    console.error(`Booking finalization failed for quote #${quoteId}:`, bookingResult.error)
    await sql`
      UPDATE quote_requests SET
        notes = COALESCE(notes || E'\n', '') || ${`[System] Buchung fehlgeschlagen: ${bookingResult.error}`},
        updated_at = NOW()
      WHERE id = ${quoteId}
    `
    return {
      success: false,
      error: `Buchung fehlgeschlagen, Status bleibt ${quote.status} (Retry über "Als bezahlt markieren" möglich): ${bookingResult.error}`,
    }
  }

  // C-04: Status-Update und der zugehörige Fulfillment-Event-Eintrag laufen jetzt
  // gemeinsam in EINER nicht-interaktiven HTTP-Transaktion (sql.transaction) — beide
  // Schreibvorgänge committen atomisch zusammen. `mail_sent`/`mail_subject` sind zu diesem
  // Zeitpunkt noch nicht bekannt (der Mailversand ist ein bewusster Seiteneffekt AUSSERHALB
  // der DB-Transaktion, siehe unten) und werden defensiv mit `false`/`NULL` vorbelegt, dann
  // per kompensierendem Update nachgetragen, sobald das Mail-Ergebnis vorliegt.
  const [, insertedEvent] = await sql.transaction(
    [
      sql`
        UPDATE quote_requests SET
          status = 'paid',
          paid_at = NOW(),
          payment_method = ${options.paymentMethod},
          payment_note = ${options.paymentNote?.trim() || null},
          stripe_event_id = ${options.stripeEventId || null},
          fulfillment_status = 'angenommen',
          updated_at = NOW()
        WHERE id = ${quoteId}
      `,
      sql`
        INSERT INTO quote_fulfillment_events (
          quote_id, from_status, to_status, comment, mail_sent, mail_subject, created_by
        ) VALUES (
          ${quoteId},
          NULL,
          'angenommen',
          'Zahlung eingegangen',
          false,
          NULL,
          ${options.paymentMethod === "stripe" ? "stripe" : "admin"}
        )
        RETURNING id
      `,
    ],
    { isolationLevel: "ReadCommitted" },
  )
  const fulfillmentEventId = insertedEvent[0]?.id as number | undefined

  const paidQuote = await getQuoteByIdInternal(quoteId)
  const shouldSendMail = options.sendMail ?? true
  let mailSent = false

  if (shouldSendMail && lead && paidQuote) {
    try {
      const pdf = await getQuoteOfferPdfForEmail(quoteId)
      const mailResult = await sendCustomerPaidEmail({
        email: lead.email,
        quote: paidQuote,
        paymentNote: options.paymentNote,
        attachments: pdf ? [{ filename: pdf.filename, content: pdf.data }] : undefined,
      })
      mailSent = mailResult.success
      if (!mailResult.success) {
        console.error("Paid email failed:", mailResult.error)
      }
    } catch (e) {
      console.error("Paid email failed:", e)
    }
  }

  if (mailSent && fulfillmentEventId) {
    await sql`
      UPDATE quote_fulfillment_events SET
        mail_sent = true,
        mail_subject = 'Zahlung eingegangen'
      WHERE id = ${fulfillmentEventId}
    `
  }

  revalidatePath("/warenverwaltung/auftraege")
  revalidatePath(`/warenverwaltung/auftraege/${quoteId}`)
  return { success: true }
}

