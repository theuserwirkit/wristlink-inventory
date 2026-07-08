import { getBookingById } from "@/lib/actions/bookings"
import { notFound } from "next/navigation"
import { RentalProtocol } from "@/components/protocol/rental-protocol"

export default async function ProtocolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bookingId = Number.parseInt(id)

  if (isNaN(bookingId)) {
    notFound()
  }

  const booking = await getBookingById(bookingId)

  if (!booking || booking.booking_type !== "MIETE_AUSGABE") {
    notFound()
  }

  return <RentalProtocol booking={booking} />
}
