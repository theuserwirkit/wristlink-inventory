"use server"

import { revalidatePath } from "next/cache"
import { getDb } from "@/lib/db"
import { requireRole } from "@/lib/auth"

const MAX_PDF_BYTES = 10 * 1024 * 1024

export async function uploadQuoteOfferPdf(
  quoteId: number,
  file: File,
): Promise<{ success: boolean; error?: string; filename?: string }> {
  await requireRole(["ADMIN"])

  if (file.type !== "application/pdf") {
    return { success: false, error: "Nur PDF-Dateien erlaubt" }
  }
  if (file.size > MAX_PDF_BYTES) {
    return { success: false, error: "Datei zu groß (max. 10 MB)" }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const sql = getDb()
  const rows = await sql`
    UPDATE quote_requests SET
      offer_pdf_filename = ${file.name || "angebot.pdf"},
      offer_pdf_data = ${buffer},
      offer_pdf_mime_type = ${file.type},
      updated_at = NOW()
    WHERE id = ${quoteId}
    RETURNING id
  `

  if (!rows.length) {
    return { success: false, error: "Anfrage nicht gefunden" }
  }

  revalidatePath(`/admin/anfragen/${quoteId}`)
  return { success: true, filename: file.name || "angebot.pdf" }
}

export async function removeQuoteOfferPdf(quoteId: number): Promise<{ success: boolean }> {
  await requireRole(["ADMIN"])
  const sql = getDb()
  await sql`
    UPDATE quote_requests SET
      offer_pdf_filename = NULL,
      offer_pdf_data = NULL,
      offer_pdf_mime_type = NULL,
      updated_at = NOW()
    WHERE id = ${quoteId}
  `
  revalidatePath(`/admin/anfragen/${quoteId}`)
  return { success: true }
}

export async function getQuoteOfferPdf(
  quoteId: number,
): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
  await requireRole(["ADMIN"])
  const sql = getDb()
  const rows = await sql`
    SELECT offer_pdf_data, offer_pdf_mime_type, offer_pdf_filename
    FROM quote_requests
    WHERE id = ${quoteId}
    LIMIT 1
  `
  if (!rows.length || !rows[0].offer_pdf_data) return null
  return {
    data: rows[0].offer_pdf_data as Buffer,
    mimeType: String(rows[0].offer_pdf_mime_type || "application/pdf"),
    filename: String(rows[0].offer_pdf_filename || "angebot.pdf"),
  }
}

export async function getQuoteOfferPdfForEmail(
  quoteId: number,
): Promise<{ data: Buffer; filename: string } | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT offer_pdf_data, offer_pdf_filename
    FROM quote_requests
    WHERE id = ${quoteId}
    LIMIT 1
  `
  if (!rows.length || !rows[0].offer_pdf_data) return null
  return {
    data: rows[0].offer_pdf_data as Buffer,
    filename: String(rows[0].offer_pdf_filename || "angebot.pdf"),
  }
}
