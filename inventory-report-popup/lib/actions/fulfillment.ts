"use server"

import { revalidatePath } from "next/cache"
import { getDb } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { getLeadById } from "@/lib/actions/leads"
import { getQuoteByIdInternal } from "@/lib/quotes-internal"
import { getEmailTemplateByKey } from "@/lib/konfigurator/email-template-store"
import {
  buildQuoteTemplateVars,
  formatKommentarBlock,
} from "@/lib/konfigurator/email-template-render"
import { sendFulfillmentStepEmail, renderEmailPreview } from "@/lib/konfigurator/email"
import {
  fulfillmentTemplateKey,
  getNextFulfillmentStep,
  isFulfillmentComplete,
} from "@/lib/konfigurator/fulfillment-status"
import { isVersandDienstleister } from "@/lib/konfigurator/versand-dienstleister"
import type { FulfillmentStatus, QuoteFulfillmentEvent, VersandDienstleister } from "@/lib/konfigurator/types"

function mapEventRow(row: Record<string, unknown>): QuoteFulfillmentEvent {
  return {
    id: row.id as number,
    quote_id: row.quote_id as number,
    from_status: (row.from_status as FulfillmentStatus | null) ?? null,
    to_status: row.to_status as FulfillmentStatus,
    comment: (row.comment as string | null) ?? null,
    tracking_number: (row.tracking_number as string | null) ?? null,
    versand_dienstleister: (row.versand_dienstleister as VersandDienstleister | null) ?? null,
    mail_sent: Boolean(row.mail_sent),
    mail_subject: (row.mail_subject as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

export async function listFulfillmentEvents(quoteId: number): Promise<QuoteFulfillmentEvent[]> {
  await requireRole(["ADMIN"])
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM quote_fulfillment_events
    WHERE quote_id = ${quoteId}
    ORDER BY created_at ASC
  `
  return rows.map((row) => mapEventRow(row))
}

export async function advanceFulfillmentStep(
  quoteId: number,
  input: {
    comment?: string
    trackingNumber?: string
    versandDienstleister?: VersandDienstleister
    sendMail?: boolean
    mailSubject?: string
    mailBody?: string
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["ADMIN"])
  } catch {
    return { success: false, error: "Nicht authentifiziert" }
  }

  try {
    const quote = await getQuoteByIdInternal(quoteId)
    if (!quote) return { success: false, error: "Anfrage nicht gefunden" }
    if (quote.status !== "paid") {
      return { success: false, error: "Fulfillment nur nach Zahlung möglich" }
    }

    const hasDruck = Boolean(quote.config_json.druck)
    const next = getNextFulfillmentStep(quote.fulfillment_status, hasDruck)
    if (!next) {
      return { success: false, error: "Kein weiterer Schritt verfügbar" }
    }

    if (next === "versand_beauftragt") {
      if (!input.trackingNumber?.trim()) {
        return { success: false, error: "Tracking-Nummer erforderlich für Versand beauftragt" }
      }
      if (!input.versandDienstleister || !isVersandDienstleister(input.versandDienstleister)) {
        return { success: false, error: "Versand-Dienstleister erforderlich für Versand beauftragt" }
      }
    }

    const versandDienstleister =
      input.versandDienstleister || quote.versand_dienstleister || null

    const lead = await getLeadById(quote.lead_id)
    if (!lead) return { success: false, error: "Lead nicht gefunden" }

    const templateKey = fulfillmentTemplateKey(next)
    const template = await getEmailTemplateByKey(templateKey)
    const shouldSend = input.sendMail ?? template?.send_by_default ?? false

    const extraVars = {
      kommentar: formatKommentarBlock(input.comment),
      tracking_nr: input.trackingNumber?.trim() || quote.tracking_number || "",
      versand_dienstleister: versandDienstleister || "",
    }

    let mailSent = false
    let mailSubject: string | null = null

    if (shouldSend && (template || (input.mailSubject?.trim() && input.mailBody?.trim()))) {
      const vars = buildQuoteTemplateVars(quote, lead.email, extraVars)
      const rendered = await sendFulfillmentStepEmail({
        email: lead.email,
        quote,
        templateKey,
        comment: input.comment,
        trackingNumber: input.trackingNumber,
        versandDienstleister: versandDienstleister || undefined,
        customSubject: input.mailSubject,
        customBody: input.mailBody,
      })
      mailSent = rendered.success
      mailSubject =
        input.mailSubject?.trim() ||
        (template
          ? template.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "")
          : null)
      if (shouldSend && !mailSent) {
        console.error("Fulfillment mail failed for quote", quoteId, next)
      }
    }

    const sql = getDb()
    const fromStatus = quote.fulfillment_status

    await sql`
      UPDATE quote_requests SET
        fulfillment_status = ${next},
        tracking_number = COALESCE(${input.trackingNumber?.trim() || null}, tracking_number),
        versand_dienstleister = COALESCE(${versandDienstleister}, versand_dienstleister),
        updated_at = NOW()
      WHERE id = ${quoteId}
    `

    await sql`
      INSERT INTO quote_fulfillment_events (
        quote_id, from_status, to_status, comment, tracking_number, versand_dienstleister,
        mail_sent, mail_subject, created_by
      ) VALUES (
        ${quoteId},
        ${fromStatus},
        ${next},
        ${input.comment?.trim() || null},
        ${input.trackingNumber?.trim() || null},
        ${versandDienstleister},
        ${mailSent},
        ${mailSubject},
        'admin'
      )
    `

    revalidatePath(`/admin/anfragen/${quoteId}`)
    revalidatePath("/admin/anfragen")
    return { success: true }
  } catch (error) {
    console.error("advanceFulfillmentStep failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Schritt konnte nicht gespeichert werden",
    }
  }
}

export async function previewFulfillmentEmail(
  quoteId: number,
  toStatus: FulfillmentStatus,
  input?: { comment?: string; trackingNumber?: string; versandDienstleister?: VersandDienstleister },
) {
  await requireRole(["ADMIN"])
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return null
  const lead = await getLeadById(quote.lead_id)
  if (!lead) return null

  const versandDienstleister =
    input?.versandDienstleister || quote.versand_dienstleister || null

  return renderEmailPreview({
    templateKey: fulfillmentTemplateKey(toStatus),
    quote,
    leadEmail: lead.email,
    extraVars: {
      kommentar: formatKommentarBlock(input?.comment),
      tracking_nr: input?.trackingNumber?.trim() || quote.tracking_number || "",
      versand_dienstleister: versandDienstleister || "",
    },
  })
}

export async function getFulfillmentTemplateDefaults(toStatus: FulfillmentStatus) {
  await requireRole(["ADMIN"])
  const template = await getEmailTemplateByKey(fulfillmentTemplateKey(toStatus))
  return template ? { sendByDefault: template.send_by_default } : { sendByDefault: false }
}

export async function setReturnBookingId(
  quoteId: number,
  returnBookingId: number,
): Promise<void> {
  await requireRole(["ADMIN"])
  const sql = getDb()
  await sql`
    UPDATE quote_requests SET
      return_booking_id = ${returnBookingId},
      updated_at = NOW()
    WHERE id = ${quoteId}
  `
  revalidatePath(`/admin/anfragen/${quoteId}`)
}

export async function getFulfillmentProgress(quoteId: number) {
  const quote = await getQuoteByIdInternal(quoteId)
  if (!quote) return null
  const hasDruck = Boolean(quote.config_json.druck)
  const next = getNextFulfillmentStep(quote.fulfillment_status, hasDruck)
  const complete = isFulfillmentComplete(quote.fulfillment_status, hasDruck)
  const events = await listFulfillmentEvents(quoteId)
  return { quote, hasDruck, next, complete, events }
}
