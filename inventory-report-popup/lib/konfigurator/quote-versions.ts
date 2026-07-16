import { getDb } from "@/lib/db"
import type { QuoteConfig } from "@/lib/konfigurator/types"
import type { AvailabilityStressLevel } from "@/lib/konfigurator/availability-stress"

export type QuoteVersionRow = {
  id: number
  quote_request_id: number
  version_number: number
  config_json: QuoteConfig
  price_snapshot_json: Record<string, unknown>
  availability_level: AvailabilityStressLevel
  availability_label: string | null
  changed_by: "customer" | "admin" | "system"
  change_summary: string
  created_at: string
  offer_pdf_filename: string | null
  has_offer_pdf: boolean
}

export async function listQuoteVersions(quoteRequestId: number): Promise<QuoteVersionRow[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT
      id,
      quote_request_id,
      version_number,
      config_json,
      price_snapshot_json,
      availability_level,
      availability_label,
      changed_by,
      change_summary,
      created_at,
      offer_pdf_filename,
      (offer_pdf_data IS NOT NULL) AS has_offer_pdf
    FROM quote_request_versions
    WHERE quote_request_id = ${quoteRequestId}
    ORDER BY version_number DESC
  `
  return rows.map((r) => ({
    ...(r as Omit<QuoteVersionRow, "has_offer_pdf">),
    has_offer_pdf: Boolean(r.has_offer_pdf),
    offer_pdf_filename: (r.offer_pdf_filename as string | null) ?? null,
  }))
}

export async function getNextVersionNumber(quoteRequestId: number): Promise<number> {
  const sql = getDb()
  const rows = await sql`
    SELECT COALESCE(MAX(version_number), 0) AS max_v
    FROM quote_request_versions
    WHERE quote_request_id = ${quoteRequestId}
  `
  return Number(rows[0]?.max_v ?? 0) + 1
}

export async function insertQuoteVersion(input: {
  quoteRequestId: number
  versionNumber: number
  config: QuoteConfig
  price: Record<string, unknown>
  availabilityLevel: AvailabilityStressLevel
  availabilityLabel?: string | null
  changedBy: "customer" | "admin" | "system"
  changeSummary: string
}): Promise<void> {
  const sql = getDb()
  await sql`
    INSERT INTO quote_request_versions (
      quote_request_id, version_number, config_json, price_snapshot_json,
      availability_level, availability_label, changed_by, change_summary
    ) VALUES (
      ${input.quoteRequestId},
      ${input.versionNumber},
      ${JSON.stringify(input.config)},
      ${JSON.stringify(input.price)},
      ${input.availabilityLevel},
      ${input.availabilityLabel ?? null},
      ${input.changedBy},
      ${input.changeSummary}
    )
  `
}

/** Legt Version 1 aus aktuellem Stand an, falls noch keine Version existiert. */
export async function ensureInitialQuoteVersion(input: {
  quoteRequestId: number
  config: QuoteConfig
  price: Record<string, unknown>
  changedBy?: "customer" | "admin" | "system"
}): Promise<void> {
  const sql = getDb()
  const existing = await sql`
    SELECT id FROM quote_request_versions
    WHERE quote_request_id = ${input.quoteRequestId}
    LIMIT 1
  `
  if (existing.length > 0) return
  await insertQuoteVersion({
    quoteRequestId: input.quoteRequestId,
    versionNumber: 1,
    config: input.config,
    price: input.price,
    availabilityLevel: "green",
    availabilityLabel: null,
    changedBy: input.changedBy ?? "system",
    changeSummary: "Erst-Anfrage",
  })
}

/** Kopiert aktuelles Anfrage-PDF auf die höchste existierende Version. No-op wenn kein PDF. */
export async function snapshotOfferPdfOntoLatestVersion(quoteRequestId: number): Promise<void> {
  const sql = getDb()
  await sql`
    UPDATE quote_request_versions AS v
    SET
      offer_pdf_filename = q.offer_pdf_filename,
      offer_pdf_data = q.offer_pdf_data,
      offer_pdf_mime_type = q.offer_pdf_mime_type
    FROM quote_requests AS q
    WHERE q.id = ${quoteRequestId}
      AND v.quote_request_id = q.id
      AND v.version_number = (
        SELECT MAX(version_number) FROM quote_request_versions WHERE quote_request_id = ${quoteRequestId}
      )
      AND q.offer_pdf_data IS NOT NULL
  `
}

export async function getOfferPdfByPublicToken(publicToken: string): Promise<{
  data: Buffer
  mimeType: string
  filename: string
} | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT offer_pdf_data, offer_pdf_mime_type, offer_pdf_filename
    FROM quote_requests
    WHERE public_token = ${publicToken}
    LIMIT 1
  `
  if (!rows.length || !rows[0].offer_pdf_data) return null
  return {
    data: rows[0].offer_pdf_data as Buffer,
    mimeType: String(rows[0].offer_pdf_mime_type || "application/pdf"),
    filename: String(rows[0].offer_pdf_filename || "angebot.pdf"),
  }
}

export async function getVersionOfferPdfByPublicToken(
  publicToken: string,
  versionNumber: number,
): Promise<{
  data: Buffer
  mimeType: string
  filename: string
} | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT v.offer_pdf_data, v.offer_pdf_mime_type, v.offer_pdf_filename
    FROM quote_request_versions v
    JOIN quote_requests q ON q.id = v.quote_request_id
    WHERE q.public_token = ${publicToken}
      AND v.version_number = ${versionNumber}
    LIMIT 1
  `
  if (!rows.length || !rows[0].offer_pdf_data) return null
  return {
    data: rows[0].offer_pdf_data as Buffer,
    mimeType: String(rows[0].offer_pdf_mime_type || "application/pdf"),
    filename: String(rows[0].offer_pdf_filename || "angebot.pdf"),
  }
}
