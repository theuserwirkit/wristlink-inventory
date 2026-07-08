"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import type { EmailTemplate } from "@/lib/konfigurator/types"
import {
  getEmailTemplateByKey,
  listEmailTemplatesFromDb,
  updateEmailTemplateInDb,
} from "@/lib/konfigurator/email-template-store"

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  await requireRole(["ADMIN"])
  return listEmailTemplatesFromDb()
}

export async function updateEmailTemplate(
  templateKey: string,
  input: { subject: string; body: string; send_by_default: boolean },
): Promise<{ success: boolean; error?: string }> {
  await requireRole(["ADMIN"])
  const ok = await updateEmailTemplateInDb(templateKey, input)
  if (!ok) return { success: false, error: "Template nicht gefunden" }
  revalidatePath("/admin/einstellungen/e-mails")
  return { success: true }
}

export { getEmailTemplateByKey }
