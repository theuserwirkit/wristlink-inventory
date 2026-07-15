"use server"

import { getDb } from "@/lib/db"
import {
  generateVerificationToken,
  getAppBaseUrl,
  getLeadSession,
  hashVerificationToken,
  setLeadSession,
} from "@/lib/konfigurator/lead-auth"
import { CONSENT_TEXT_VERSION } from "@/lib/konfigurator/consent"
import { EMAIL_TESTMODE_DEFAULT } from "@/lib/contact-emails"
import { sendVerificationEmail } from "@/lib/konfigurator/email"
import type { Lead } from "@/lib/konfigurator/types"

const TOKEN_TTL_HOURS = 24
const RATE_LIMIT_PER_HOUR = 5

export async function requestEmailVerification(
  email: string,
  marketingConsent: boolean,
  consentIp?: string,
  contact?: { name?: string; firma?: string; telefon?: string },
  b2bConfirmed?: boolean,
): Promise<{ success: boolean; error?: string }> {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false, error: "Ungültige E-Mail-Adresse" }
  }

  const contactName = contact?.name?.trim() || null
  const contactFirma = contact?.firma?.trim() || null
  const contactTelefon = contact?.telefon?.trim() || null
  if (!contactName || !contactFirma || !contactTelefon) {
    return { success: false, error: "Bitte Name, Firma und Telefon angeben" }
  }
  if (!b2bConfirmed) {
    return { success: false, error: "Bitte bestätigen Sie die B2B-Erklärung" }
  }

  const sql = getDb()

  const recent = await sql`
    SELECT COUNT(*)::int AS cnt FROM email_verification_tokens evt
    JOIN leads l ON l.id = evt.lead_id
    WHERE l.email = ${normalized}
      AND evt.created_at > NOW() - INTERVAL '1 hour'
  `
  if (recent[0]?.cnt >= RATE_LIMIT_PER_HOUR) {
    return { success: false, error: "Zu viele Anfragen. Bitte später erneut versuchen." }
  }

  const existing = await sql`
    SELECT id, verified_at FROM leads WHERE email = ${normalized} LIMIT 1
  `

  let leadId: number
  if (existing.length > 0) {
    leadId = existing[0].id
    await sql`
      UPDATE leads SET
        name = ${contactName},
        firma = ${contactFirma},
        telefon = ${contactTelefon},
        b2b_confirmed = true,
        consent_text_version = ${CONSENT_TEXT_VERSION},
        consent_ip = ${consentIp || null},
        updated_at = NOW()
      WHERE id = ${leadId}
    `
    if (existing[0].verified_at) {
      if (marketingConsent) {
        await sql`UPDATE leads SET marketing_consent = true, updated_at = NOW() WHERE id = ${leadId}`
      }
      await setLeadSession(leadId, normalized)
      return { success: true }
    }
  } else {
    const created = await sql`
      INSERT INTO leads (email, name, firma, telefon, marketing_consent, b2b_confirmed, consent_text_version, consent_ip)
      VALUES (${normalized}, ${contactName}, ${contactFirma}, ${contactTelefon}, false, true, ${CONSENT_TEXT_VERSION}, ${consentIp || null})
      RETURNING id
    `
    leadId = created[0].id
  }

  const token = generateVerificationToken()
  const tokenHash = hashVerificationToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

  await sql`
    INSERT INTO email_verification_tokens (lead_id, token_hash, expires_at, marketing_consent_pending)
    VALUES (${leadId}, ${tokenHash}, ${expiresAt.toISOString()}, ${marketingConsent})
  `

  try {
    await sendVerificationEmail(normalized, token)
  } catch (err) {
    console.error("Verification email failed:", err)
    return { success: false, error: "E-Mail konnte nicht gesendet werden" }
  }

  return { success: true }
}

export async function verifyEmailToken(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: "Token fehlt" }

  const tokenHash = hashVerificationToken(token)
  const sql = getDb()

  const rows = await sql`
    SELECT evt.id AS token_id, evt.lead_id, evt.expires_at, evt.used_at, evt.marketing_consent_pending, l.email
    FROM email_verification_tokens evt
    JOIN leads l ON l.id = evt.lead_id
    WHERE evt.token_hash = ${tokenHash}
    LIMIT 1
  `

  if (rows.length === 0) {
    return { success: false, error: "Ungültiger oder abgelaufener Link" }
  }

  const row = rows[0]
  if (row.used_at) {
    const leadRows = await sql`
      SELECT verified_at FROM leads WHERE id = ${row.lead_id} LIMIT 1
    `
    if (leadRows[0]?.verified_at) {
      await setLeadSession(row.lead_id, row.email)
      return { success: true }
    }
    return { success: false, error: "Link wurde bereits verwendet" }
  }
  if (new Date(row.expires_at) < new Date()) {
    return { success: false, error: "Link ist abgelaufen" }
  }

  await sql`
    UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ${row.token_id}
  `
  await sql`
    UPDATE leads SET
      verified_at = NOW(),
      marketing_consent = ${Boolean(row.marketing_consent_pending)},
      updated_at = NOW()
    WHERE id = ${row.lead_id}
  `

  await setLeadSession(row.lead_id, row.email)
  return { success: true }
}

const TESTMODE_DEFAULT_EMAIL = EMAIL_TESTMODE_DEFAULT

/**
 * Testmode ist nur außerhalb von Production erlaubt – oder wenn er in Production
 * explizit über KONFIGURATOR_TESTMODE_ENABLED=true freigeschaltet wurde.
 * Fail-closed: In Production standardmäßig blockiert.
 */
function isTestmodeAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true
  return process.env.KONFIGURATOR_TESTMODE_ENABLED === "true"
}

/** DOI umgehen – nur für interne Tests (Testmode-Button). */
export async function bypassEmailVerificationForTestmode(
  email?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isTestmodeAllowed()) {
    return { success: false, error: "Testmode ist deaktiviert" }
  }

  const normalized = (email?.trim() || TESTMODE_DEFAULT_EMAIL).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { success: false, error: "Ungültige E-Mail-Adresse" }
  }

  const sql = getDb()
  const existing = await sql`
    SELECT id FROM leads WHERE email = ${normalized} LIMIT 1
  `

  let leadId: number
  if (existing.length > 0) {
    leadId = existing[0].id
    await sql`
      UPDATE leads SET verified_at = NOW(), updated_at = NOW() WHERE id = ${leadId}
    `
  } else {
    const created = await sql`
      INSERT INTO leads (email, marketing_consent, consent_text_version, verified_at)
      VALUES (${normalized}, false, ${CONSENT_TEXT_VERSION}, NOW())
      RETURNING id
    `
    leadId = created[0].id
  }

  await setLeadSession(leadId, normalized)
  return { success: true }
}

export async function getVerifiedLead(): Promise<Lead | null> {
  const session = await getLeadSession()
  if (!session) return null

  const sql = getDb()
  const rows = await sql`
    SELECT id, email, name, firma, telefon, verified_at, marketing_consent, consent_text_version, consent_ip, customer_id, created_at
    FROM leads
    WHERE id = ${session.leadId} AND verified_at IS NOT NULL
    LIMIT 1
  `
  if (rows.length === 0) return null
  return rows[0] as Lead
}

export async function getLeadById(id: number): Promise<Lead | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, email, name, firma, telefon, verified_at, marketing_consent, consent_text_version, consent_ip, customer_id, created_at
    FROM leads WHERE id = ${id} LIMIT 1
  `
  return rows.length ? (rows[0] as Lead) : null
}

/** Lead für externe Kanäle (n8n) – automatisch verifiziert. */
export async function getOrCreateVerifiedLeadForEmail(email: string): Promise<Lead> {
  const normalized = email.trim().toLowerCase()
  const sql = getDb()

  const existing = await sql`
    SELECT id, email, name, firma, telefon, verified_at, marketing_consent, consent_text_version, consent_ip, customer_id, created_at
    FROM leads WHERE email = ${normalized} LIMIT 1
  `

  if (existing.length > 0) {
    if (!existing[0].verified_at) {
      await sql`UPDATE leads SET verified_at = NOW(), updated_at = NOW() WHERE id = ${existing[0].id}`
    }
    return { ...existing[0], verified_at: existing[0].verified_at || new Date().toISOString() } as Lead
  }

  const created = await sql`
    INSERT INTO leads (email, marketing_consent, consent_text_version, verified_at)
    VALUES (${normalized}, false, ${CONSENT_TEXT_VERSION}, NOW())
    RETURNING id, email, name, firma, telefon, verified_at, marketing_consent, consent_text_version, consent_ip, customer_id, created_at
  `
  return created[0] as Lead
}
