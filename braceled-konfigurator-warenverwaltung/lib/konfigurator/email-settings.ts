import { cache } from "react"
import { getDb } from "@/lib/db"

const GLOBAL_CC_SETTING_KEY = "global_cc_email"

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmailAddress(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export const getGlobalCcEmail = cache(async (): Promise<string | null> => {
  const sql = getDb()
  const rows = await sql`
    SELECT value FROM system_settings WHERE key = ${GLOBAL_CC_SETTING_KEY} LIMIT 1
  `
  if (!rows.length) return null
  const value = String(rows[0].value).trim()
  return value || null
})

export function resolveCcRecipients(to: string, globalCc: string | null): string[] | undefined {
  if (!globalCc) return undefined
  if (normalizeEmail(to) === normalizeEmail(globalCc)) return undefined
  return [globalCc.trim()]
}
