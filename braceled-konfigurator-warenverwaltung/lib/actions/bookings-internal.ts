import "server-only"

// Interne Buchungslogik ohne "use server"-Export: wird von serverseitigen, nicht
// Session-gebundenen Aufrufern verwendet (n8n-Webhook-Buchungen, Stripe-Zahlungsabschluss
// über lib/actions/quote-booking-internal.ts). Dadurch ist diese Funktion nie Teil der
// Server-Actions-Oberfläche und kann nicht direkt aus dem Client aufgerufen werden.
// Die öffentliche, auth-geschützte Variante ist createBooking in lib/actions/bookings.ts.

import { withInteractiveTransaction, acquireResourceLocks, type TxQuery, type SqlRow } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { CreateBookingInput } from "@/lib/types"
import { getAvailabilityForGroupInternal, getRentedItemsByGroupInternal } from "@/lib/actions/bookings"
import { resolveSkuId, resolveLotId } from "@/lib/actions/sku-lot-internal"

type BookingWriteResult =
  | { success: true; data: SqlRow }
  | { success: false; error: string }

/**
 * C-04/C-06: zentraler Schreib-Choke-Point für alle Buchungsanlagen (n8n-Reservierungen,
 * Verkaufsbuchung beim Zahlungsabschluss, manuelle Admin-Buchungen, Rückgaben). Der
 * Verfügbarkeits-Check (unverändert: getAvailabilityForGroupInternal/getRentedItemsByGroupInternal)
 * und der eigentliche Schreibvorgang laufen jetzt gemeinsam unter einem Advisory-Lock auf die
 * betroffene(n) (Gruppe, Charge)-Ressource(n) in EINER echten, interaktiven Transaktion.
 * Dadurch ist es unerheblich, wer den Aufruf auslöst (n8n-Webhook, Stripe-Payment,
 * Admin-UI) — zwei parallele Aufrufe für dieselbe Ressource können nicht mehr beide den
 * "genug verfügbar"-Zweig durchlaufen, bevor einer von beiden committet hat: der zweite
 * sieht nach Lock-Erwerb den bereits committeten Stand und bekommt ggf. die reguläre
 * "nicht genügend verfügbar"-Fehlermeldung statt eine stille Überbuchung.
 *
 * Fachliche Verfügbarkeitsregeln bleiben unverändert — nur die Reihenfolge/Atomizität
 * von Check und Schreiben wird abgesichert.
 */
export async function createBookingInternal(input: CreateBookingInput): Promise<BookingWriteResult> {
  try {
    if (!input.items || input.items.length === 0) {
      const hasBaseItems = input.baseItems && input.baseItems.length > 0
      if (!hasBaseItems) {
        return { success: false, error: "Mindestens eine Leuchtgruppe oder Basis muss ausgewählt werden" }
      }
    }

    const lockKeys = new Set<string>()
    if (input.bookingType === "MIETE_RUECKGABE" && input.batchId) {
      for (const item of input.items) {
        lockKeys.add(`band:${item.groupId}:${input.batchId}`)
      }
    } else if (input.bookingType === "VERKAUF" || input.bookingType === "MIETE_AUSGABE") {
      for (const item of input.items) {
        const batchId = item.batchId || input.batchId
        if (batchId) lockKeys.add(`band:${item.groupId}:${batchId}`)
      }
    }

    const result = await withInteractiveTransaction<BookingWriteResult>(async (query) => {
      await acquireResourceLocks(query, Array.from(lockKeys))

      if (input.bookingType === "MIETE_RUECKGABE") {
        const rentedItems = await getRentedItemsByGroupInternal(input.batchId)
        for (const item of input.items) {
          const rentedAmount = rentedItems.get(item.groupId) || 0
          const totalReturned = item.anzahl + (item.anzahlFehlt || 0)
          if (rentedAmount < totalReturned) {
            const groups = await query(`SELECT name FROM groups WHERE id = $1`, [item.groupId])
            return {
              success: false,
              error: `Nicht genügend vermietete Artikel für ${groups[0]?.name || "Gruppe"}. In Vermietung: ${rentedAmount}, Rückgabe angefordert: ${totalReturned}`,
            }
          }
        }
      }

      if (input.bookingType === "VERKAUF" || input.bookingType === "MIETE_AUSGABE") {
        for (const item of input.items) {
          const availability = await getAvailabilityForGroupInternal(item.groupId, item.batchId || input.batchId)
          if (availability.verfuegbar < item.anzahl) {
            const groups = await query(`SELECT name FROM groups WHERE id = $1`, [item.groupId])
            const batchId = item.batchId || input.batchId
            const batches = batchId ? await query(`SELECT code FROM batches WHERE id = $1`, [batchId]) : []
            return {
              success: false,
              error: `Nicht genügend verfügbare Artikel für ${groups[0]?.name || "Gruppe"} mit Charge ${batches[0]?.code || ""}. Verfügbar: ${availability.verfuegbar}, Angefordert: ${item.anzahl}`,
            }
          }
        }
      }

      let customerId: number | null = null
      if (input.customerName) {
        const existing = await query(
          `SELECT id, name FROM customers WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [input.customerName],
        )
        if (existing.length > 0) {
          customerId = Number(existing[0].id)
        } else {
          const newCustomer = await query(`INSERT INTO customers (name) VALUES ($1) RETURNING id`, [
            input.customerName,
          ])
          customerId = Number(newCustomer[0].id)
        }
      }

      const bookings = await query(
        `INSERT INTO bookings (booking_type, status, customer_id, datum_ausgabe, datum_rueckgabe_geplant, datum_rueckgabe_ist, reference_rental_id, bemerkung)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          input.bookingType,
          input.status || "BESTAETIGT",
          customerId,
          input.datumAusgabe?.toISOString() || null,
          input.datumRueckgabeGeplant?.toISOString() || null,
          input.datumRueckgabeIst?.toISOString() || null,
          input.referenceRentalId || null,
          input.bemerkung || null,
        ],
      )
      const booking = bookings[0]

      for (const item of input.items) {
        const skuId = await resolveSkuId(query, item.groupId)
        const batchIdToUse = item.batchId || input.batchId
        const lotId = await resolveInventoryLotForBookingItem(query, {
          skuId,
          batchIdToUse,
          bookingType: input.bookingType,
          anzahl: item.anzahl,
        })

        const anzahlFehlt = item.anzahlFehlt !== undefined && item.anzahlFehlt > 0 ? item.anzahlFehlt : 0
        await query(
          `INSERT INTO booking_items (booking_id, group_id, sku_id, lot_id, batch_id, anzahl, anzahl_fehlt)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [booking.id, item.groupId, skuId, lotId, batchIdToUse ?? null, item.anzahl, anzahlFehlt],
        )
      }

      if (input.baseItems && input.baseItems.length > 0) {
        for (const baseItem of input.baseItems) {
          const anzahlFehlt =
            baseItem.anzahlFehlt !== undefined && baseItem.anzahlFehlt > 0 ? baseItem.anzahlFehlt : 0
          await query(
            `INSERT INTO booking_items (booking_id, base_id, anzahl_basen, anzahl, anzahl_fehlt)
             VALUES ($1, $2, $3, $4, $5)`,
            [booking.id, baseItem.baseId, baseItem.anzahl, baseItem.anzahl, anzahlFehlt],
          )
        }
      }

      return { success: true, data: booking }
    }, { isolationLevel: "RepeatableRead" })

    if (result.success) {
      revalidatePath("/")
      revalidatePath("/admin")
    }
    return result
  } catch (error) {
    return { success: false, error: "Fehler beim Erstellen der Buchung" }
  }
}

/**
 * Ersetzt das vorherige Check-then-Update-Pattern (SELECT menge, dann UPDATE menge = alt+delta)
 * durch ein atomares Single-Statement-UPDATE/UPSERT — verhindert einen Lost-Update selbst ohne
 * Advisory-Lock, da Postgres `SET menge = menge + $delta` pro Zeile atomar ausführt. Verhalten
 * bei fehlendem Lot bleibt identisch zur bisherigen Logik (nur ZUGANG legt einen neuen Lot an;
 * VERKAUF/MIETE_RUECKGABE ohne bestehenden Lot ändern nichts; MIETE_AUSGABE liest nur).
 */
async function resolveInventoryLotForBookingItem(
  query: TxQuery,
  params: {
    skuId: number
    batchIdToUse: number | undefined
    bookingType: CreateBookingInput["bookingType"]
    anzahl: number
  },
): Promise<number | null> {
  const { skuId, batchIdToUse, bookingType, anzahl } = params
  if (!batchIdToUse) return null

  if (bookingType === "ZUGANG") {
    const upserted = await query(
      `INSERT INTO inventory_lots (sku_id, batch_id, menge) VALUES ($1, $2, $3)
       ON CONFLICT (sku_id, batch_id) DO UPDATE SET menge = inventory_lots.menge + EXCLUDED.menge
       RETURNING id`,
      [skuId, batchIdToUse, anzahl],
    )
    return Number(upserted[0].id)
  }

  if (bookingType === "VERKAUF") {
    const updated = await query(
      `UPDATE inventory_lots SET menge = menge - $1 WHERE sku_id = $2 AND batch_id = $3 RETURNING id`,
      [anzahl, skuId, batchIdToUse],
    )
    return updated.length > 0 ? Number(updated[0].id) : null
  }

  if (bookingType === "MIETE_RUECKGABE") {
    const updated = await query(
      `UPDATE inventory_lots SET menge = menge + $1 WHERE sku_id = $2 AND batch_id = $3 RETURNING id`,
      [anzahl, skuId, batchIdToUse],
    )
    return updated.length > 0 ? Number(updated[0].id) : null
  }

  // MIETE_AUSGABE: menge (Lagerbestand) bleibt unverändert, nur Lot-Referenz für Nachverfolgung.
  return resolveLotId(query, skuId, batchIdToUse)
}
