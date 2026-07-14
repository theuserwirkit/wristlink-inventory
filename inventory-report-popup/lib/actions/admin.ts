"use server"

import { getDb } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import {
  formatLeuchtgruppeName,
  LEUCHTGRUPPE_MAX_SLOT,
} from "@/lib/konfigurator/leuchtgruppen"

/**
 * Loggt den ursprünglichen Fehler serverseitig und gibt eine generische,
 * für den Client sichere Fehlermeldung zurück. Bekannte, bewusst geworfene
 * Fehler (z. B. fehlende Authentifizierung) werden unverändert durchgereicht,
 * da sie keine internen Details (SQL, Stacktraces, o. Ä.) enthalten.
 */
function toSafeErrorMessage(error: unknown, action: string): string {
  const knownMessages = ["Nicht authentifiziert"]
  if (error instanceof Error && knownMessages.includes(error.message)) {
    return error.message
  }
  console.error(`[admin:${action}] failed:`, error)
  return "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es später erneut."
}

export async function createGroup(input: { slot: number; kanalanzahl: number }) {
  try {
    await requireRole(["ADMIN"])
    const sql = getDb()
    const slot = Math.min(Math.max(Math.floor(input.slot), 1), LEUCHTGRUPPE_MAX_SLOT)
    const kanalanzahl = input.kanalanzahl === 80 ? 80 : 40
    const name = formatLeuchtgruppeName(slot, kanalanzahl)

    const existing = await sql`SELECT id FROM groups WHERE name = ${name} LIMIT 1`
    if (existing.length > 0) {
      return { success: false, error: `${name} existiert bereits` }
    }

    const groups = await sql`
      INSERT INTO groups (name, kanalanzahl) VALUES (${name}, ${kanalanzahl}) RETURNING *
    `
    const group = groups[0]

    const skus = await sql`INSERT INTO skus (item_type, group_id) VALUES ('LED_BAND', ${group.id}) RETURNING *`
    const newSKU = skus[0]

    if (newSKU) {
      await sql`
        INSERT INTO inventory_lots (sku_id, batch_id, menge)
        SELECT ${newSKU.id}, b.id, 0
        FROM batches b
      `
    }

    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true, data: group }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "createGroup") }
  }
}

export async function deleteGroup(id: number) {
  try {
    await requireRole(["ADMIN"])
    const sql = getDb()

    await sql`DELETE FROM groups WHERE id = ${id}`

    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "deleteGroup") }
  }
}

export async function createBatch(input: {
  code: string
  funktionsumfang: string
  lieferant?: string
  lieferdatum: Date
}) {
  try {
    await requireRole(["ADMIN"])
    const sql = getDb()

    const batches = await sql`
      INSERT INTO batches (code, funktionsumfang, lieferant, lieferdatum)
      VALUES (${input.code}, ${input.funktionsumfang}, ${input.lieferant || null}, ${input.lieferdatum.toISOString()})
      RETURNING *
    `
    const batch = batches[0]

    await sql`
      INSERT INTO inventory_lots (sku_id, batch_id, menge)
      SELECT s.id, ${batch.id}, 0
      FROM skus s
    `

    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true, data: batch }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "createBatch") }
  }
}

export async function deleteBatch(id: number) {
  try {
    await requireRole(["ADMIN"])
    const sql = getDb()

    await sql`DELETE FROM inventory_lots WHERE batch_id = ${id}`
    await sql`DELETE FROM batches WHERE id = ${id}`

    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "deleteBatch") }
  }
}

export async function createBase(input: {
  bezeichnung: string
  hersteller: string
  kanalanzahl: number
  stationTyp: string
  batchId?: number
  firmwareversion?: string
  funktionsumfang?: string
  count?: number
}) {
  try {
    await requireRole(["ADMIN"])
    const sql = getDb()

    const count = Math.min(Math.max(input.count ?? 1, 1), 100)
    const bezeichnung = input.bezeichnung.trim()
    const hersteller = input.hersteller.trim()
    const firmwareversion = input.firmwareversion?.trim() || ""
    const funktionsumfang = input.funktionsumfang?.trim() || ""
    const batchId = input.batchId || null
    const stationTyp = ["eco", "pro", "keine"].includes(input.stationTyp)
      ? input.stationTyp
      : "keine"

    const prefix = `WL-${stationTyp.toUpperCase()}`
    const latest = await sql`
      SELECT seriennummer FROM bases
      WHERE seriennummer LIKE ${`${prefix}-%`}
      ORDER BY seriennummer DESC
      LIMIT 1
    `
    let nextSeq = 1
    if (latest.length > 0) {
      const match = String(latest[0].seriennummer).match(/(\d+)$/)
      if (match) nextSeq = Number(match[1]) + 1
    }

    const names = Array.from({ length: count }, (_, i) =>
      count > 1 ? `${bezeichnung} ${i + 1}` : bezeichnung,
    )
    const serials = Array.from({ length: count }, (_, i) =>
      `${prefix}-${String(nextSeq + i).padStart(5, "0")}`,
    )

    const created = await sql`
      INSERT INTO bases (bezeichnung, hersteller, kanalanzahl, batch_id, firmwareversion, funktionsumfang, station_typ, seriennummer)
      SELECT
        generated.name,
        ${hersteller},
        ${input.kanalanzahl},
        ${batchId},
        ${firmwareversion},
        ${funktionsumfang},
        ${stationTyp},
        generated.serial
      FROM UNNEST(${names}::text[], ${serials}::text[]) AS generated(name, serial)
      RETURNING *
    `

    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true, data: created, count: created.length }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "createBase") }
  }
}

export async function updateBase(
  id: number,
  input: { bezeichnung: string; stationTyp?: string; seriennummer?: string },
) {
  try {
    await requireRole(["ADMIN"])
    const sql = getDb()

    const stationTyp =
      input.stationTyp && ["eco", "pro", "keine"].includes(input.stationTyp)
        ? input.stationTyp
        : undefined

    const seriennummer = input.seriennummer?.trim() || undefined

    if (seriennummer) {
      const duplicate = await sql`
        SELECT id FROM bases WHERE seriennummer = ${seriennummer} AND id <> ${id} LIMIT 1
      `
      if (duplicate.length > 0) {
        return { success: false, error: `Seriennummer „${seriennummer}“ ist bereits vergeben` }
      }
    }

    if (stationTyp && seriennummer) {
      await sql`
        UPDATE bases
        SET bezeichnung = ${input.bezeichnung}, station_typ = ${stationTyp}, seriennummer = ${seriennummer}
        WHERE id = ${id}
      `
    } else if (stationTyp) {
      await sql`
        UPDATE bases
        SET bezeichnung = ${input.bezeichnung}, station_typ = ${stationTyp}
        WHERE id = ${id}
      `
    } else if (seriennummer) {
      await sql`
        UPDATE bases
        SET bezeichnung = ${input.bezeichnung}, seriennummer = ${seriennummer}
        WHERE id = ${id}
      `
    } else {
      await sql`UPDATE bases SET bezeichnung = ${input.bezeichnung} WHERE id = ${id}`
    }

    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "updateBase") }
  }
}

export async function deleteBase(id: number) {
  try {
    await requireRole(["ADMIN"])
    const sql = getDb()

    await sql`DELETE FROM booking_items WHERE base_id = ${id}`
    await sql`DELETE FROM bases WHERE id = ${id}`

    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "deleteBase") }
  }
}

const ALLOWED_SETTING_KEYS = ["departure_buffer_days", "return_buffer_days"] as const

export async function getSystemSettings(): Promise<Record<string, string>> {
  await requireRole(["ADMIN"])
  const sql = getDb()
  const rows = await sql`SELECT key, value FROM system_settings`
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
}

export async function updateSystemSetting(key: string, value: string) {
  try {
    await requireRole(["ADMIN"])

    if (!ALLOWED_SETTING_KEYS.includes(key as any)) {
      return { success: false, error: `Ungültiger Einstellungsschlüssel: ${key}` }
    }

    const numVal = parseInt(value, 10)
    if (isNaN(numVal) || numVal < 0 || numVal > 30) {
      return { success: false, error: "Wert muss eine Zahl zwischen 0 und 30 sein" }
    }

    const sql = getDb()

    await sql`
      UPDATE system_settings
      SET value = ${String(numVal)}, updated_at = NOW()
      WHERE key = ${key}
    `

    revalidatePath("/admin")
    revalidatePath("/")
    revalidatePath("/kalender")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "updateSystemSetting") }
  }
}

export async function getInventoryChangesReport(year: number, month: number) {
  try {
    await requireRole(["ADMIN"])
    const sql = getDb()

    // Build date range: first to last day of the given month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)
    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    // Fetch all ZUGANG and VERKAUF booking items within the month
    const rows = await sql`
      SELECT
        b.id AS booking_id,
        b.booking_type,
        b.datum_ausgabe,
        b.created_at AS booking_date,
        b.bemerkung,
        g.name AS group_name,
        ba.code AS batch_code,
        ba.lieferant,
        bi.anzahl,
        bi.batch_id,
        bi.group_id
      FROM bookings b
      JOIN booking_items bi ON bi.booking_id = b.id
      LEFT JOIN groups g ON g.id = bi.group_id
      LEFT JOIN batches ba ON ba.id = bi.batch_id
      WHERE b.booking_type IN ('ZUGANG', 'VERKAUF')
        AND b.created_at >= ${startISO}
        AND b.created_at <= ${endISO}
      ORDER BY b.created_at ASC, b.id ASC
    `

    return { success: true, data: rows }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "getInventoryChangesReport") }
  }
}

export async function syncSKUsAndLots() {
  try {
    const sql = getDb()

    const groups = await sql`SELECT * FROM groups`
    const batches = await sql`SELECT * FROM batches`
    const existingSKUs = await sql`SELECT * FROM skus`
    const existingLots = await sql`SELECT * FROM inventory_lots`

    let skusCreated = 0
    let lotsCreated = 0

    for (const group of groups) {
      const exists = existingSKUs.some((sku: any) => sku.item_type === "LED_BAND" && sku.group_id === group.id)
      if (!exists) {
        await sql`INSERT INTO skus (item_type, group_id) VALUES ('LED_BAND', ${group.id})`
        skusCreated++
      }
    }

    const allSKUs = await sql`SELECT * FROM skus`

    for (const sku of allSKUs) {
      for (const batch of batches) {
        const exists = existingLots.some((lot: any) => lot.sku_id === sku.id && lot.batch_id === batch.id)
        if (!exists) {
          await sql`INSERT INTO inventory_lots (sku_id, batch_id, menge) VALUES (${sku.id}, ${batch.id}, 0)`
          lotsCreated++
        }
      }
    }

    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true, message: `${skusCreated} SKUs und ${lotsCreated} Inventory Lots erstellt` }
  } catch (error: any) {
    return { success: false, error: toSafeErrorMessage(error, "syncSKUsAndLots") }
  }
}
