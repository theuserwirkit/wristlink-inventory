import { neon, neonConfig, Pool, type PoolClient } from "@neondatabase/serverless"

// Suppress browser warning in v0 preview (server actions run server-side but
// the preview sandbox environment can trigger Neon's browser detection)
neonConfig.disableWarningInBrowsers = true

export type SqlRow = Record<string, any>

export type TxIsolationLevel = "ReadCommitted" | "RepeatableRead" | "Serializable"

// Deckt neben dem Tagged-Template-Aufruf auch `.query()` (positionsbasierte Parameter,
// siehe `dbQuery()`) und `.transaction()` (nicht-interaktive HTTP-Transaktion, siehe
// C-04/C-07) ab — beides stellt @neondatabase/serverless zur Laufzeit auf dem von
// `neon()` zurückgegebenen Funktionsobjekt bereit.
type SqlTag = {
  (strings: TemplateStringsArray, ...params: unknown[]): Promise<SqlRow[]>
  query: (text: string, params?: unknown[]) => Promise<SqlRow[]>
  transaction: (
    queries: Promise<SqlRow[]>[],
    opts?: { isolationLevel?: TxIsolationLevel },
  ) => Promise<SqlRow[][]>
}

let sqlClient: SqlTag | null = null

function getDatabaseUrl(): string {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) {
    throw new Error("Keine Datenbank-URL gesetzt (NEON_DATABASE_URL, DATABASE_URL oder POSTGRES_URL)")
  }
  return url
}

export function getDb(): SqlTag {
  if (sqlClient) return sqlClient
  // `neon()`s tatsächliche `.transaction()`-Signatur ist generischer (ArrayMode/FullResults-
  // Overrides) als unser bewusst vereinfachter `SqlTag`-Typ — Laufzeitverhalten ist
  // unverändert, nur die Typannotation wird hier vereinfacht.
  sqlClient = neon(getDatabaseUrl()) as unknown as SqlTag
  return sqlClient
}

// ---------------------------------------------------------------------------
// Phase 4b (C-04/C-05/C-06): echte interaktive Transaktionen für Race-kritische
// Check-then-Write-Flows (Lagerzuweisung, Buchungsanlage).
//
// `sql.transaction([...])` (Methode auf dem von `getDb()` zurückgegebenen
// Funktionsobjekt, siehe C-04/C-07-Nutzung in quotes-internal.ts/quote-warehouse.ts)
// ist eine NICHT-interaktive HTTP-Transaktion: alle Statements müssen vorab feststehen,
// ein SELECT-Ergebnis kann also nicht innerhalb derselben Transaktion über eine
// Verzweigung entscheiden, welches Statement als nächstes läuft. Für
// TOCTOU-kritische Stellen (Verfügbarkeits-Check + Schreiben desselben
// Bestands) reicht das nicht aus. `withInteractiveTransaction` öffnet dafür
// eine echte WebSocket-Session (BEGIN…COMMIT/ROLLBACK) über den Neon-`Pool`.
//
// Voraussetzung: Node.js-Runtime mit globalem `WebSocket` (Node >= 22, siehe
// `package.json` "engines" sowie @neondatabase/serverless-Doku). Ohne globales
// WebSocket wirft `getPool()` einen klaren Fehler statt eines stillen Fallbacks
// auf ungesicherte Zugriffe.
let pool: Pool | null = null

function getPool(): Pool {
  if (pool) return pool
  if (typeof WebSocket === "undefined") {
    throw new Error(
      "Interaktive DB-Transaktionen benötigen eine Node.js-Runtime mit globalem " +
        "WebSocket (Node >= 22). Bitte Runtime aktualisieren oder `ws` als " +
        "neonConfig.webSocketConstructor konfigurieren.",
    )
  }
  pool = new Pool({ connectionString: getDatabaseUrl() })
  return pool
}

export type TxQuery = (text: string, params?: unknown[]) => Promise<SqlRow[]>

function isolationClause(level?: TxIsolationLevel): string {
  switch (level) {
    case "RepeatableRead":
      return " ISOLATION LEVEL REPEATABLE READ"
    case "Serializable":
      return " ISOLATION LEVEL SERIALIZABLE"
    case "ReadCommitted":
      return " ISOLATION LEVEL READ COMMITTED"
    default:
      return ""
  }
}

/**
 * Führt `fn` innerhalb einer echten, interaktiven Postgres-Transaktion aus
 * (dedizierte WebSocket-Verbindung, BEGIN…COMMIT). `fn` erhält eine
 * `query(text, params)`-Funktion (node-postgres-Stil mit `$1`, `$2`, …), über
 * die sowohl der Verfügbarkeits-Check als auch der eigentliche Schreibvorgang
 * auf derselben Session laufen können. Bei einem Fehler wird ROLLBACK
 * ausgeführt und der Fehler weitergereicht (kein Teilzustand committet). Die
 * Connection wird in jedem Fall (Erfolg wie Fehler) ans Pool zurückgegeben.
 */
export async function withInteractiveTransaction<T>(
  fn: (query: TxQuery) => Promise<T>,
  options?: { isolationLevel?: TxIsolationLevel },
): Promise<T> {
  const client: PoolClient = await getPool().connect()
  let committed = false
  try {
    await client.query(`BEGIN${isolationClause(options?.isolationLevel)}`)
    const query: TxQuery = async (text, params = []) => {
      const result = await client.query(text, params as any[])
      return (result.rows ?? []) as SqlRow[]
    }
    const result = await fn(query)
    await client.query("COMMIT")
    committed = true
    return result
  } finally {
    if (!committed) {
      try {
        await client.query("ROLLBACK")
      } catch {
        // Verbindung ist evtl. bereits invalide (z. B. nach Fehler) – Rollback
        // best-effort, `client.release()` unten gibt die Connection trotzdem frei.
      }
    }
    client.release()
  }
}

/**
 * Postgres Advisory Lock als Mutex pro logischer Ressource (z. B.
 * `"band:12:3"` für Leuchtgruppe 12 / Charge 3, `"base:7"` für Basis 7).
 * `pg_advisory_xact_lock` hält den Lock bis COMMIT/ROLLBACK der umgebenden
 * Transaktion — parallele Schreibzugriffe auf dieselbe Ressource werden so
 * serialisiert, OHNE die bestehende (Ledger-basierte) Verfügbarkeitsberechnung
 * anzufassen: Der fachliche Verfügbarkeits-Check läuft unverändert über die
 * bestehenden Funktionen, findet aber garantiert NACH Lock-Erwerb statt, sodass
 * kein zweiter Schreibvorgang für dieselbe Ressource mehr dazwischenkommen kann,
 * bevor committet wurde. Schlüssel werden sortiert gesperrt, um Deadlocks bei
 * Mehrfach-Ressourcen-Buchungen (z. B. mehrere Leuchtgruppen in einer Buchung)
 * zu vermeiden.
 */
export async function acquireResourceLocks(query: TxQuery, resourceKeys: string[]): Promise<void> {
  const sorted = Array.from(new Set(resourceKeys)).sort()
  for (const key of sorted) {
    await query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [key])
  }
}
