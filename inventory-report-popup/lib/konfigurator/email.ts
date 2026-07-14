import { Resend } from "resend"
import { EMAIL_KONFIGURATOR, EMAIL_TECH, RESEND_FROM_DEFAULT } from "@/lib/contact-emails"
import { buildEmailBodies } from "@/lib/konfigurator/email-html"
import { getAppBaseUrl } from "@/lib/konfigurator/lead-auth"
import { getEmailTemplateByKey } from "@/lib/konfigurator/email-template-store"
import {
  buildQuoteTemplateVars,
  formatAblehnungsgrundBlock,
  appendCustomerCommentToEmail,
  renderTemplateText,
  type TemplateVars,
} from "@/lib/konfigurator/email-template-render"
import type { QuoteRequest, VersandDienstleister } from "@/lib/konfigurator/types"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY nicht gesetzt")
  return new Resend(key)
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || RESEND_FROM_DEFAULT
}

function getTeamEmail(): string {
  return process.env.TEAM_NOTIFICATION_EMAIL || EMAIL_KONFIGURATOR
}

function buildEmailContent(text: string) {
  return buildEmailBodies(text)
}

export type EmailAttachment = {
  filename: string
  content: Buffer
}

export async function sendTemplatedEmail(params: {
  email: string
  subject: string
  text: string
  attachments?: EmailAttachment[]
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend()
    await resend.emails.send({
      from: getFromEmail(),
      to: params.email,
      subject: params.subject,
      ...buildEmailContent(params.text),
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    })
    return { success: true }
  } catch (e) {
    console.error("Email send failed:", e)
    return { success: false, error: e instanceof Error ? e.message : "E-Mail fehlgeschlagen" }
  }
}

export async function sendFromTemplateKey(params: {
  templateKey: string
  email: string
  quote: QuoteRequest
  extraVars?: TemplateVars
  attachments?: EmailAttachment[]
}): Promise<{ success: boolean; error?: string }> {
  const template = await getEmailTemplateByKey(params.templateKey)
  if (!template) {
    return { success: false, error: `Template ${params.templateKey} nicht gefunden` }
  }
  const vars = buildQuoteTemplateVars(params.quote, params.email, params.extraVars)
  return sendTemplatedEmail({
    email: params.email,
    subject: renderTemplateText(template.subject, vars),
    attachments: params.attachments,
    text: renderTemplateText(template.body, vars),
  })
}

export async function renderEmailPreview(params: {
  templateKey: string
  quote: QuoteRequest
  leadEmail: string
  extraVars?: TemplateVars
}): Promise<{ subject: string; body: string } | null> {
  const template = await getEmailTemplateByKey(params.templateKey)
  if (!template) return null
  const vars = buildQuoteTemplateVars(params.quote, params.leadEmail, params.extraVars)
  return {
    subject: renderTemplateText(template.subject, vars),
    body: renderTemplateText(template.body, vars),
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${getAppBaseUrl()}/konfigurator/verify?token=${token}`
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV] RESEND_API_KEY fehlt – Bestätigungslink:", verifyUrl)
      return
    }
    throw new Error("RESEND_API_KEY nicht gesetzt")
  }

  const body = `Hallo,

bitte bestätige deine E-Mail-Adresse, um den WIRKUNG Wristlink Konfigurator zu nutzen:

${verifyUrl}

Der Link ist 24 Stunden gültig.

Bitte nicht auf diese E-Mail antworten. Fragen bitte an ${EMAIL_TECH}

Viele Grüße
Dein WIRKUNG-Team`
  const result = await sendTemplatedEmail({
    email,
    subject: "Bitte bestätige deine E-Mail – WIRKUNG Wristlink",
    text: body,
  })

  if (!result.success) {
    throw new Error(result.error || "E-Mail-Versand fehlgeschlagen")
  }
}

export async function sendTeamQuoteNotification(params: {
  quoteId: number
  email: string
  configSummary: string
  totalNetto: number
  totalBrutto: number
  adminUrl: string
}) {
  const body = `Neue Angebotsanfrage über den Konfigurator (B2B):

Anfrage-ID: ${params.quoteId}
Kunde: ${params.email}

${params.configSummary}

Gesamt netto: ${params.totalNetto.toFixed(2)} EUR
Zahlungsbetrag (inkl. 19 % MwSt.): ${params.totalBrutto.toFixed(2)} EUR

Freigabe im Admin-Bereich:
${params.adminUrl}`
  await sendTemplatedEmail({
    email: getTeamEmail(),
    subject: `Neue Konfigurator-Anfrage #${params.quoteId}`,
    text: body,
  })
}

export async function sendCustomerApprovedEmail(params: {
  email: string
  quote: QuoteRequest
  paymentUrl?: string
  attachments?: EmailAttachment[]
}): Promise<{ success: boolean; error?: string }> {
  const quoteWithLink = params.paymentUrl
    ? { ...params.quote, stripe_payment_link_url: params.paymentUrl }
    : params.quote
  return sendFromTemplateKey({
    templateKey: params.paymentUrl ? "quote_approved_stripe" : "quote_approved_manual",
    email: params.email,
    quote: quoteWithLink,
    attachments: params.attachments,
    extraVars: {
      angebot_url: `${getAppBaseUrl()}/angebot/${params.quote.public_token}`,
    },
  })
}

export async function sendCustomerRejectedEmail(params: {
  email: string
  quote: QuoteRequest
  reason?: string
}) {
  const result = await sendFromTemplateKey({
    templateKey: "quote_rejected",
    email: params.email,
    quote: params.quote,
    extraVars: {
      ablehnungsgrund: formatAblehnungsgrundBlock(params.reason),
    },
  })
  if (!result.success) throw new Error(result.error || "Ablehnungs-Mail fehlgeschlagen")
}

export async function sendCustomerPaidEmail(params: {
  email: string
  quote: QuoteRequest
  paymentNote?: string
  attachments?: EmailAttachment[]
}): Promise<{ success: boolean; error?: string }> {
  return sendFromTemplateKey({
    templateKey: "quote_paid",
    email: params.email,
    quote: params.quote,
    attachments: params.attachments,
    extraVars: {
      zahlungsnotiz: params.paymentNote?.trim()
        ? `Hinweis: ${params.paymentNote.trim()}\n\n`
        : "",
    },
  })
}

export async function sendN8nApprovedOfferEmail(params: { email: string; offerText: string }) {
  return sendTemplatedEmail({
    email: params.email,
    subject: "Ihr WIRKUNG Wristlink Angebot",
    text: params.offerText,
  })
}

export async function sendCustomerSubmittedEmail(params: {
  email: string
  quoteId: number
  offerUrl: string
}) {
  const body = `Hallo,

vielen Dank für deine Anfrage #${params.quoteId}. Wir prüfen deine Konfiguration und melden uns in Kürze bei dir – bald wissen wir mehr über die Verfügbarkeit für dein Event.

Status und Angebot findest du hier (Zugang mit der Postleitzahl deiner Firmenadresse):
${params.offerUrl}

Bitte nicht auf diese E-Mail antworten. Fragen bitte an ${EMAIL_TECH}

Viele Grüße
Dein WIRKUNG-Team`
  return sendTemplatedEmail({
    email: params.email,
    subject: "Anfrage eingegangen – WIRKUNG Wristlink",
    text: body,
  })
}

export async function sendFulfillmentStepEmail(params: {
  email: string
  quote: QuoteRequest
  templateKey: string
  comment?: string
  trackingNumber?: string
  versandDienstleister?: VersandDienstleister
  customSubject?: string
  customBody?: string
}) {
  let subject: string
  let text: string

  if (params.customSubject?.trim() && params.customBody?.trim()) {
    subject = params.customSubject.trim()
    text = params.customBody.trim()
  } else {
    const template = await getEmailTemplateByKey(params.templateKey)
    if (!template) {
      return { success: false, error: `Template ${params.templateKey} nicht gefunden` }
    }
    const vars = buildQuoteTemplateVars(params.quote, params.email, {
      tracking_nr: params.trackingNumber || params.quote.tracking_number || "",
      versand_dienstleister:
        params.versandDienstleister || params.quote.versand_dienstleister || "",
    })
    subject = renderTemplateText(template.subject, vars)
    text = renderTemplateText(template.body, vars)
  }

  text = appendCustomerCommentToEmail(text, params.comment)

  return sendTemplatedEmail({
    email: params.email,
    subject,
    text,
  })
}
