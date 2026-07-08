"use server"

import { getDb } from "@/lib/db"
import { getVerifiedLead } from "@/lib/actions/leads"

const MAX_LOGO_BYTES = 2 * 1024 * 1024

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

export async function getKonfiguratorLogoById(
  logoId: string,
): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
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
