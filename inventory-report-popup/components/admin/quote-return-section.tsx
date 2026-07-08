"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookingModal } from "@/components/booking/booking-modal"
import { setReturnBookingId } from "@/lib/actions/fulfillment"
import type { BookingWithRelations, BatchRow } from "@/lib/types"
import type { FulfillmentStatus } from "@/lib/konfigurator/types"
import Link from "next/link"

export function QuoteReturnSection({
  quoteId,
  fulfillmentStatus,
  returnBookingId,
  rentalBooking,
  bookingModalProps,
}: {
  quoteId: number
  fulfillmentStatus: FulfillmentStatus | null
  returnBookingId: number | null
  rentalBooking: BookingWithRelations | null
  bookingModalProps: {
    groups: Array<{ id: number; name: string }>
    batches: BatchRow[]
    customers: Array<{ id: number; name: string; email: string | null; telefon: string | null }>
    bases: Array<{
      id: number
      bezeichnung: string
      hersteller: string
      kanalanzahl: number
      firmwareversion: string | null
      funktionsumfang: string | null
      batch_id?: number | null
    }>
    inventoryLots: Array<Record<string, unknown>>
    openRentals: Array<Record<string, unknown>>
  }
}) {
  const router = useRouter()
  const [openReturn, setOpenReturn] = useState(false)

  if (fulfillmentStatus !== "zurueckgepackt" || !rentalBooking) return null

  async function handleBookingCreated(bookingId: number) {
    await setReturnBookingId(quoteId, bookingId)
    router.refresh()
  }

  if (returnBookingId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rückgabe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Rückgabe-Buchung erfasst: #{returnBookingId}</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/protocol/${returnBookingId}`}>Protokoll öffnen</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Rückgabe buchen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Die physische Rückgabe kann jetzt in der Warenverwaltung erfasst werden.
            Die Vermietungsbuchung #{rentalBooking.id} wird vorausgefüllt.
          </p>
          <Button onClick={() => setOpenReturn(true)}>Rückgabe erfassen</Button>
        </CardContent>
      </Card>
      {openReturn && (
        <BookingModal
          {...bookingModalProps}
          prefilledBooking={rentalBooking}
          onBookingCreated={handleBookingCreated}
          onClose={() => setOpenReturn(false)}
        />
      )}
    </>
  )
}
