import "server-only"

import { getDb } from "@/lib/db"

/**
 * A-12: Interner Helper, bewusst NICHT aus einer "use server"-Datei exportiert.
 * `getQuoteOfferPdfForEmail` liefert das hinterlegte Angebots-PDF anhand einer
 * rohen `quoteId` ohne eigenen Auth-Check (der E-Mail-Versand-Flow, der diese
 * Funktion nutzt, läuft bereits serverseitig nach erfolgter Freigabe/Zahlung).
 * Durch das Verschieben aus `lib/actions/quote-offer-pdf.ts` (dort weiterhin
 * "use server") in dieses `server-only`-Modul entsteht keine Server-Action-
 * Oberfläche mehr dafür; genutzt wird sie ausschließlich von
 * `lib/quotes-internal.ts` (Angebots-/Zahlungs-Workflow).
 */
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
