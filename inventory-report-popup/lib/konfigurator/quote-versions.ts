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
}

export async function listQuoteVersions(quoteRequestId: number): Promise<QuoteVersionRow[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM quote_request_versions
    WHERE quote_request_id = ${quoteRequestId}
    ORDER BY version_number DESC
  `
  return rows as QuoteVersionRow[]
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
