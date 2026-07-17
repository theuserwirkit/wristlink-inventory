import "server-only"

import { getDb } from "@/lib/db"
import type { Lead } from "@/lib/konfigurator/types"

/**
 * A-12: Interner Helper, bewusst NICHT aus einer "use server"-Datei exportiert.
 * `getLeadById` liest einen Lead ohne eigenen Auth-Check anhand einer rohen ID –
 * als Server Action (wie zuvor in `lib/actions/leads.ts`) wäre die Funktion
 * theoretisch direkt aufrufbar, ohne dass die aufrufende Seite (Angebots-/
 * Zahlungs-Workflow, immer bereits serverseitig autorisiert) dazwischenliegt.
 * Durch das Verschieben in dieses `server-only`-Modul (ohne "use server") entsteht
 * dafür keine Server-Action-Oberfläche mehr; nutzbar bleibt sie ausschließlich für
 * serverseitigen Code (`lib/quotes-internal.ts`, `lib/actions/fulfillment.ts`,
 * `lib/actions/quotes.ts`), die jeweils bereits eigene Auth-Checks vor dem Zugriff
 * auf zugehörige Anfragen/Buchungen durchführen.
 */
export async function getLeadById(id: number): Promise<Lead | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, email, name, firma, telefon, verified_at, marketing_consent, consent_text_version, consent_ip, customer_id, created_at
    FROM leads WHERE id = ${id} LIMIT 1
  `
  return rows.length ? (rows[0] as Lead) : null
}
