import { getCalendarData, getBufferSettings } from "@/lib/actions/bookings"
import { CalendarView } from "@/components/calendar/calendar-view"
import { isAuthenticated } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function KalenderPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) redirect("/login")

  const [calendarData, bufferSettings] = await Promise.all([
    getCalendarData(),
    getBufferSettings(),
  ])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-primary shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/warenverwaltung">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">
                  WIRKUNG.<span className="text-gradient-wristlink">wristlink</span>
                </h1>
                <p className="text-sm text-primary-foreground/70">Auslastungskalender</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <CalendarView
          rentalEvents={calendarData.rentalEvents}
          bandStock={calendarData.bandStock}
          baseStock={calendarData.baseStock}
          departureBufferDays={bufferSettings.departureBufferDays}
          returnBufferDays={bufferSettings.returnBufferDays}
        />
      </main>
    </div>
  )
}
