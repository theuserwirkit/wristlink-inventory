import { neon, neonConfig } from "@neondatabase/serverless"

// Suppress browser warning in v0 preview (server actions run server-side but
// the preview sandbox environment can trigger Neon's browser detection)
neonConfig.disableWarningInBrowsers = true

export type SqlRow = Record<string, any>

type SqlTag = (strings: TemplateStringsArray, ...params: unknown[]) => Promise<SqlRow[]>

let sqlClient: SqlTag | null = null

export function getDb(): SqlTag {
  if (sqlClient) return sqlClient

  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) {
    throw new Error("Keine Datenbank-URL gesetzt (NEON_DATABASE_URL, DATABASE_URL oder POSTGRES_URL)")
  }

  sqlClient = neon(url) as SqlTag
  return sqlClient
}
