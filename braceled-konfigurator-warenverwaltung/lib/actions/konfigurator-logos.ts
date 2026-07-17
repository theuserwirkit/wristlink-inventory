"use server"

import { getDb } from "@/lib/db"
import { getVerifiedLead } from "@/lib/actions/leads"
import { requireRole } from "@/lib/auth"

const MAX_LOGO_BYTES = 2 * 1024 * 1024

// B-07: PNG-Signatur (8-Byte-Magic-Number laut PNG-Spezifikation). Der bisherige
// Check verließ sich ausschließlich auf den vom Client gesendeten `file.type`
// (MIME-Type), der beliebig fälschbar ist (z. B. eine umbenannte .html/.svg-Datei
// mit `Content-Type: image/png`). Diese zusätzliche Inhaltsprüfung verhindert, dass
// Nicht-PNG-Inhalte unter dem PNG-Content-Type in der DB landen und später (Logo-
// Route, E-Mail-Anhänge) mit falschem Content-Type ausgeliefert werden.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function hasPngSignature(buffer: Buffer): boolean {
  return buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
}

export async function saveKonfiguratorLogo(
  file: File,
): Promise<{ success: true; logoId: string } | { success: false; error: string }> {
  const lead = await getVerifiedLead()
  if (!lead) {
    return { success: false, error: "Nicht verifiziert" }
  }

  if (file.type !== "image/png") {
    return { success: false, error: "Nur PNG-Dateien mit transparentem Hintergrund erlaubt" }
  }

  if (file.size > MAX_LOGO_BYTES) {
    return { success: false, error: "Datei zu groß (max. 2 MB)" }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!hasPngSignature(buffer)) {
    return { success: false, error: "Datei ist kein gültiges PNG" }
  }

  const sql = getDb()

  const rows = await sql`
    INSERT INTO konfigurator_logos (lead_id, filename, mime_type, file_data)
    VALUES (${lead.id}, ${file.name || "logo.png"}, ${file.type}, ${buffer})
    RETURNING id
  `

  return { success: true, logoId: String(rows[0].id) }
}

export async function getKonfiguratorLogoForLead(
  logoId: string,
): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
  const lead = await getVerifiedLead()
  if (!lead) return null

  const sql = getDb()
  const rows = await sql`
    SELECT file_data, mime_type, filename
    FROM konfigurator_logos
    WHERE id = ${logoId}::uuid AND lead_id = ${lead.id}
    LIMIT 1
  `

  if (!rows.length) return null

  return {
    data: rows[0].file_data as Buffer,
    mimeType: String(rows[0].mime_type),
    filename: String(rows[0].filename),
  }
}

/**
 * C-18: Admin-Fallback-Pfad (Logo-Route erlaubt Admins Zugriff auf Logos beliebiger
 * Leads). Bisher schützte nur die aufrufende Route (`requireRole` vor dem Aufruf) –
 * Defense-in-Depth: der Check ist jetzt auch direkt in der Funktion selbst, damit ein
 * fehlender/vergessener Auth-Check an einer zukünftigen Aufrufstelle nicht zu einem
 * ungeschützten Datenzugriff führt.
 */
export async function getKonfiguratorLogoById(
  logoId: string,
): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
  await requireRole(["ADMIN"])
  const sql = getDb()
  const rows = await sql`
    SELECT file_data, mime_type, filename
    FROM konfigurator_logos
    WHERE id = ${logoId}::uuid
    LIMIT 1
  `

  if (!rows.length) return null

  return {
    data: rows[0].file_data as Buffer,
    mimeType: String(rows[0].mime_type),
    filename: String(rows[0].filename),
  }
}
