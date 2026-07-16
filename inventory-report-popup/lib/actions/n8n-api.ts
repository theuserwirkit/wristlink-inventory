import "server-only"

import { getDb, type SqlRow } from "@/lib/db"
import { getAvailabilityForGroupBatchesByDateRange } from "@/lib/actions/bookings"
import { createBookingInternal } from "@/lib/actions/bookings-internal"
import {
  computeAvailabilityStress,
  daysUntilEvent,
  LONG_LEAD_MONTHS,
  monthsUntilEvent,
  type AvailabilityStressLevel,
} from "@/lib/konfigurator/availability-stress"
import { normalizeKanalanzahl } from "@/lib/konfigurator/kanalanzahl"
import {
  isWristlinkProdukt,
  resolveGroupsForProduct,
  type WristlinkProdukt,
} from "@/lib/product-mapping"
import type { BookingStatus } from "@/lib/types"

export type AvailabilityRequest = {
  produkt: string
  modus: string
  menge: number
  von?: string
  bis?: string
  lieferzeit?: string
  missing_fields?: string[]
  [key: string]: unknown
}

export type AvailabilityResponse = AvailabilityRequest & {
  bestand: number | null
  belegt: number | null
  frei: number | null
  verfuegbar: boolean
  fehlt: number
  hinweis?: string
  standDatum: string
  monthsUntilEvent: number | null
  langfristig: boolean
  pendingInquiries: number
  stressLevel: AvailabilityStressLevel
  stressScore: number
  stressLabel: string
}

export type N8nBookingRequest = {
  produkt: string
  modus: string
  menge: number
  von: string
  bis?: string
  kunde_name?: string
  kunde_email?: string
  event?: string
  status?: BookingStatus
}

function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

async function aggregateProductAvailability(
  produkt: WristlinkProdukt,
  ausgabedatum: Date,
  rueckgabedatum: Date,
  kanalanzahl?: number,
): Promise<{ bestand: number; belegt: number; frei: number }> {
  const groups = await resolveGroupsForProduct(produkt, kanalanzahl)
  if (groups.length === 0) {
    return { bestand: 0, belegt: 0, frei: 0 }
  }

  const stats = await getAvailabilityForGroupBatchesByDateRange(
    groups.map((group) => group.id),
    ausgabedatum,
    rueckgabedatum,
  )

  let bestand = 0
  let belegt = 0
  for (const row of stats) {
    bestand += row.gesamtsumme
    belegt += row.inVermietung
  }

  return { bestand, belegt, frei: Math.max(0, bestand - belegt) }
}

async function countPendingInquiries(produkt: string, von?: string): Promise<number> {
  const sql = getDb()
  if (von) {
    const rows = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM quote_requests
      WHERE status IN ('submitted', 'payment_pending', 'approved')
        AND config_json->>'produkt' = ${produkt}
        AND config_json->>'von' IS NOT NULL
        AND (config_json->>'von')::date BETWEEN (${von}::date - INTERVAL '45 days')
          AND (${von}::date + INTERVAL '45 days')
    `
    return Number(rows[0]?.cnt ?? 0)
  }

  const rows = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM quote_requests
    WHERE status IN ('submitted', 'payment_pending', 'approved')
      AND config_json->>'produkt' = ${produkt}
  `
  return Number(rows[0]?.cnt ?? 0)
}

function finalizeAvailability(
  input: AvailabilityRequest,
  pool: { bestand: number; belegt: number; frei: number },
  opts: {
    von?: string
    bis?: string
    hinweis?: string
    pendingInquiries: number
  },
): AvailabilityResponse {
  const menge = Number(input.menge)
  const months = opts.von ? monthsUntilEvent(opts.von) : null
  const days = opts.von ? daysUntilEvent(opts.von) : null
  const langfristig = months !== null && months >= LONG_LEAD_MONTHS
  const poolVerfuegbar = pool.frei >= menge
  const verfuegbar = langfristig || poolVerfuegbar
  const stress = computeAvailabilityStress({
    verfuegbar,
    frei: pool.frei,
    menge,
    bestand: pool.bestand,
    belegt: pool.belegt,
    pendingInquiries: opts.pendingInquiries,
    monthsUntilEvent: months,
    daysUntilEvent: days,
    langfristig,
  })

  let hinweis = opts.hinweis
  if (langfristig && !poolVerfuegbar) {
    hinweis =
      "Aktuell knapp auf Lager – mit über 4 Monaten Vorlauf voraussichtlich realisierbar."
  }

  return {
    ...input,
    von: opts.von,
    bis: opts.bis,
    bestand: pool.bestand,
    belegt: pool.belegt,
    frei: pool.frei,
    verfuegbar,
    fehlt: verfuegbar ? 0 : Math.max(0, menge - pool.frei),
    hinweis,
    standDatum: new Date().toISOString(),
    monthsUntilEvent: months,
    langfristig,
    pendingInquiries: opts.pendingInquiries,
    ...stress,
  }
}

export async function checkProductAvailability(
  input: AvailabilityRequest,
): Promise<AvailabilityResponse> {
  const modus = String(input.modus || "").toLowerCase()
  const menge = Number(input.menge)
  const von = input.von || (input.datum_von as string | undefined)
  const bis = input.bis || (input.datum_bis as string | undefined) || von

  if (!von) {
    return {
      ...input,
      bestand: 0,
      belegt: 0,
      frei: 0,
      verfuegbar: false,
      fehlt: menge,
      hinweis: "Kein Eventtermin (von) angegeben",
      standDatum: new Date().toISOString(),
      monthsUntilEvent: null,
      langfristig: false,
      pendingInquiries: 0,
      stressLevel: "red",
      stressScore: 85,
      stressLabel: "Angespannt",
    }
  }

  const produkt = String(input.produkt || "").toLowerCase()
  if (!isWristlinkProdukt(produkt)) {
    return {
      ...input,
      von,
      bis,
      bestand: 0,
      belegt: 0,
      frei: 0,
      verfuegbar: false,
      fehlt: menge,
      hinweis: `Unbekanntes Produkt: ${input.produkt}`,
      standDatum: new Date().toISOString(),
      monthsUntilEvent: monthsUntilEvent(von),
      langfristig: false,
      pendingInquiries: 0,
      stressLevel: "red",
      stressScore: 85,
      stressLabel: "Angespannt",
    }
  }

  const kanalanzahl =
    produkt === "armband" ? normalizeKanalanzahl(input.kanalanzahl) : undefined

  const groups = await resolveGroupsForProduct(produkt, kanalanzahl)
  if (groups.length === 0) {
    return {
      ...input,
      von,
      bis,
      bestand: 0,
      belegt: 0,
      frei: 0,
      verfuegbar: false,
      fehlt: menge,
      hinweis:
        produkt === "armband" && kanalanzahl
          ? `Keine Leuchtgruppen mit ${kanalanzahl} CH für '${produkt}' gefunden`
          : `Keine Gruppen für Produkt '${produkt}' gefunden`,
      standDatum: new Date().toISOString(),
      monthsUntilEvent: monthsUntilEvent(von),
      langfristig: monthsUntilEvent(von) >= LONG_LEAD_MONTHS,
      pendingInquiries: 0,
      stressLevel: "red",
      stressScore: 85,
      stressLabel: "Angespannt",
    }
  }

  const pendingInquiries = await countPendingInquiries(produkt, von)
  const ausgabe = parseDate(von)
  const rueckgabe = parseDate(bis!)
  const pool = await aggregateProductAvailability(produkt, ausgabe, rueckgabe, kanalanzahl)

  const modusLabel = modus === "kauf" ? "Kauf" : "Miete"
  return finalizeAvailability(input, pool, {
    von,
    bis,
    pendingInquiries,
    hinweis:
      modus === "kauf"
        ? `${modusLabel}: Verfügbarkeit für Lieferung zum Eventtermin`
        : undefined,
  })
}

async function findBestAllocation(
  produkt: WristlinkProdukt,
  menge: number,
  ausgabedatum: Date,
  rueckgabedatum: Date,
): Promise<{ groupId: number; batchId: number; verfuegbar: number } | null> {
  const groups = await resolveGroupsForProduct(produkt)
  if (groups.length === 0) return null
  const groupIds = groups.map((group) => group.id)
  const stats = await getAvailabilityForGroupBatchesByDateRange(
    groupIds,
    ausgabedatum,
    rueckgabedatum,
  )
  let best: { groupId: number; batchId: number; verfuegbar: number } | null = null

  for (const row of stats) {
    if (row.verfuegbar >= menge && (!best || row.verfuegbar > best.verfuegbar)) {
      best = { groupId: row.groupId, batchId: row.batchId, verfuegbar: row.verfuegbar }
    }
  }

  return best
}

export async function createN8nBooking(
  input: N8nBookingRequest,
): Promise<{ success: true; data: SqlRow } | { success: false; error: string }> {
  const modus = String(input.modus || "").toLowerCase()
  if (modus !== "miete") {
    return { success: false, error: "Buchungs-API unterstuetzt nur modus=miete" }
  }

  const produkt = String(input.produkt || "").toLowerCase()
  if (!isWristlinkProdukt(produkt)) {
    return { success: false, error: `Unbekanntes Produkt: ${input.produkt}` }
  }

  const menge = Number(input.menge)
  if (!Number.isFinite(menge) || menge <= 0) {
    return { success: false, error: "Ungueltige Menge" }
  }

  const bis = input.bis || input.von
  const ausgabe = parseDate(input.von)
  const rueckgabe = parseDate(bis)

  const allocation = await findBestAllocation(produkt, menge, ausgabe, rueckgabe)
  if (!allocation) {
    const availability = await checkProductAvailability({
      produkt,
      modus: "miete",
      menge,
      von: input.von,
      bis,
    })
    return {
      success: false,
      error: `Nicht genuegend verfuegbar. Frei: ${availability.frei ?? 0}, angefordert: ${menge}`,
    }
  }

  const sql = getDb()
  let customerId: number | null = null

  if (input.kunde_email) {
    const byEmail = await sql`
      SELECT id FROM customers WHERE LOWER(email) = LOWER(${input.kunde_email}) LIMIT 1
    `
    if (byEmail.length > 0) {
      customerId = byEmail[0].id
    }
  }

  if (!customerId && input.kunde_name) {
    const byName = await sql`
      SELECT id FROM customers WHERE LOWER(name) = LOWER(${input.kunde_name}) LIMIT 1
    `
    if (byName.length > 0) {
      customerId = byName[0].id
    } else {
      const created = await sql`
        INSERT INTO customers (name, email)
        VALUES (${input.kunde_name}, ${input.kunde_email || null})
        RETURNING id
      `
      customerId = created[0].id
    }
  } else if (customerId && input.kunde_name) {
    await sql`
      UPDATE customers SET name = ${input.kunde_name}
      WHERE id = ${customerId} AND (name IS NULL OR name = '')
    `
  }

  const bemerkung = input.event ? `n8n: ${input.event}` : "n8n: automatische Reservierung"

  return createBookingInternal({
    bookingType: "MIETE_AUSGABE",
    status: input.status || "BESTAETIGT",
    customerName: input.kunde_name,
    datumAusgabe: ausgabe,
    datumRueckgabeGeplant: rueckgabe,
    bemerkung,
    items: [{
      groupId: allocation.groupId,
      batchId: allocation.batchId,
      anzahl: menge,
    }],
  })
}
