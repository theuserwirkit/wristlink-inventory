import { getDb } from "@/lib/db"
import type { EmailTemplate } from "@/lib/konfigurator/types"

function mapRow(row: Record<string, unknown>): EmailTemplate {
  return {
    id: row.id as number,
    template_key: row.template_key as string,
    label: row.label as string,
    category: row.category as string,
    subject: row.subject as string,
    body: row.body as string,
    send_by_default: Boolean(row.send_by_default),
    updated_at: row.updated_at as string,
  }
}

export async function getEmailTemplateByKey(key: string): Promise<EmailTemplate | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM email_templates WHERE template_key = ${key} LIMIT 1
  `
  if (!rows.length) return null
  return mapRow(rows[0])
}

export async function listEmailTemplatesFromDb(): Promise<EmailTemplate[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM email_templates ORDER BY category, label
  `
  return rows.map((row) => mapRow(row))
}

export async function updateEmailTemplateInDb(
  templateKey: string,
  input: { subject: string; body: string; send_by_default: boolean },
): Promise<boolean> {
  const sql = getDb()
  const result = await sql`
    UPDATE email_templates SET
      subject = ${input.subject},
      body = ${input.body},
      send_by_default = ${input.send_by_default},
      updated_at = NOW()
    WHERE template_key = ${templateKey}
    RETURNING id
  `
  return result.length > 0
}
