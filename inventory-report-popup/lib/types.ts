export type BookingType = "ZUGANG" | "MIETE_AUSGABE" | "MIETE_RUECKGABE" | "VERKAUF"
export type BookingStatus = "ANFRAGE" | "BESTAETIGT"

export interface Base {
  id: number
  bezeichnung: string
  hersteller: string
  kanalanzahl: number
  firmwareversion: string | null
  funktionsumfang: string | null
  created_at: string
}

export interface AvailabilityStats {
  groupId: number
  groupName: string
  verfuegbar: number
  inVermietung: number
  gesamtsumme: number
  verkauft: number
  defekt: number // Added defekt field to track defective/lost items
}

export interface BookingWithRelations {
  id: number
  booking_type: BookingType
  status?: BookingStatus
  customer_id?: number | null
  bemerkung?: string | null
  datum_ausgabe?: string | null
  datum_rueckgabe_geplant?: string | null
  datum_rueckgabe_ist?: string | null
  reference_rental_id?: number | null
  created_at?: string
  customer: { id: number; name: string } | null
  items: Array<{
    id: number
    group_id: number | null
    batch_id: number | null
    base_id?: number | null
    anzahl: number
    anzahl_fehlt?: number | null
    anzahl_basen?: number | null
    group?: { id: number; name: string } | null
    batch?: { id: number; code: string; funktionsumfang: string } | null
    base?: { id: number; bezeichnung: string; hersteller: string; kanalanzahl: number } | null
  }>
  /** Legacy-Felder für ältere Komponenten */
  typ?: string
  menge?: number
  datumAusgabe?: Date | null
  datumRueckgabeGeplant?: Date | null
  datumRueckgabeIst?: Date | null
  createdAt?: Date
  lot?: {
    id: number
    group: { id: number; name: string }
    batch: { code: string; funktionsumfang: string }
  } | null
  referenceRental?: { id: number } | null
}

export interface CreateBookingInput {
  bookingType: BookingType
  status?: BookingStatus
  batchId?: number
  items: Array<{
    groupId: number
    batchId?: number
    anzahl: number
    anzahlFehlt?: number
  }>
  baseItems?: Array<{
    baseId: number
    anzahl: number
    anzahlFehlt?: number
  }>
  customerName?: string
  datumAusgabe?: Date
  datumRueckgabeGeplant?: Date
  datumRueckgabeIst?: Date
  referenceRentalId?: number
  bemerkung?: string
}

export interface StatsFilters {
  groupId?: number
}

export type ItemType = "LED_BAND" | "LED_LICHT"

export interface GroupRow {
  id: number
  name: string
  kanalanzahl?: number
}

export interface BatchRow {
  id: number
  code: string
  funktionsumfang: string
  lieferant?: string | null
  lieferdatum?: string
}

export interface CustomerRow {
  id: number
  name: string
  email: string | null
  telefon: string | null
}

export interface BaseRow {
  id: number
  bezeichnung: string
  hersteller: string
  kanalanzahl: number
  firmwareversion: string | null
  funktionsumfang: string | null
  batch_id?: number | null
  batch_code?: string | null
  batch_funktionsumfang?: string | null
}

// DB row types for typed query results
export interface BookingRow {
  id: number
  booking_type: BookingType
  status: BookingStatus
  customer_name: string | null
  bemerkung: string | null
  datum_ausgabe: string | null
  datum_rueckgabe_geplant: string | null
  datum_rueckgabe_ist: string | null
  reference_rental_id: number | null
  created_at: string
}

export interface BookingItemRow {
  id: number
  booking_id: number
  group_id: number | null
  batch_id: number | null
  base_id: number | null
  anzahl: number
  anzahl_basen: number | null
  anzahl_fehlt: number | null
}

export interface StockItemRow {
  anzahl: number
  anzahl_fehlt: number | null
  anzahl_basen: number | null
  booking_type: string
}

export interface RentalRow {
  id: number
  datum_ausgabe: string | null
  datum_rueckgabe_geplant: string | null
  datum_rueckgabe_ist: string | null
  reference_rental_id: number | null
  status: string
  anzahl: number
  anzahl_basen: number | null
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          email: string
          password: string
          name: string
          role: "VIEWER" | "EDITOR" | "ADMIN"
          created_at: string
          updated_at: string
        }
      }
      groups: {
        Row: {
          id: number
          name: string
        }
      }
      batches: {
        Row: {
          id: number
          code: string
          funktionsumfang: string
          lieferant: string | null
          lieferdatum: string
          created_at: string
        }
      }
      inventory_lots: {
        Row: {
          id: number
          group_id: number
          batch_id: number
          menge: number
          created_at: string
          updated_at: string
        }
      }
      customers: {
        Row: {
          id: number
          name: string
          email: string | null
          telefon: string | null
        }
      }
      bookings: {
        Row: {
          id: number
          typ: string
          lot_id: number | null
          customer_id: number | null
          menge: number
          datum_ausgabe: string | null
          datum_rueckgabe_geplant: string | null
          datum_rueckgabe_ist: string | null
          rental_reference_id: number | null
          bemerkung: string | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
