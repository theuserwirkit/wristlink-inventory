"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Package, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { addWorkdays, addDays } from "@/lib/utils/date"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RentalEvent {
  id: number
  customerName: string
  bemerkung: string | null
  status: string
  datumAusgabe: string | null
  datumRueckgabePlan: string | null
  datumRueckgabeIst: string | Date | null
  isReturned: boolean
  bands: Array<{ groupId: number; groupName: string; anzahl: number }>
  bases: Array<{ baseId: number; baseBezeichnung: string; anzahl: number }>
}

interface BandStock {
  groupId: number
  groupName: string
  totalStock: number
}

interface BaseStock {
  baseId: number
  baseBezeichnung: string
  totalStock: number
}

interface CalendarViewProps {
  rentalEvents: RentalEvent[]
  bandStock: BandStock[]
  baseStock: BaseStock[]
  departureBufferDays?: number
  returnBufferDays?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFECT_RATE = 0.10 // 10% forecast defect on return

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isInRange(day: Date, from: Date, to: Date) {
  const d = day.getTime()
  return d >= from.setHours(0, 0, 0, 0) && d <= to.setHours(23, 59, 59, 999)
}

// For a given calendar day, compute how many of each resource are committed
function computeDailyLoad(
  day: Date,
  events: RentalEvent[],
  departureBufferDays = 6,
  returnBufferDays = 5,
): {
  bands: Map<number, number>
  bases: Map<number, number>
  tentativeBands: Map<number, number>
  tentativeBases: Map<number, number>
} {
  const bands = new Map<number, number>()
  const bases = new Map<number, number>()
  const tentativeBands = new Map<number, number>()
  const tentativeBases = new Map<number, number>()

  for (const ev of events) {
    if (!ev.datumAusgabe) continue

    const isTentative = ev.status === "ANFRAGE"
    const eventStart = new Date(ev.datumAusgabe)
    const eventEnd = ev.isReturned && ev.datumRueckgabeIst
      ? new Date(ev.datumRueckgabeIst)
      : ev.datumRueckgabePlan
        ? new Date(ev.datumRueckgabePlan)
        : addDays(eventStart, 3) // fallback: assume 3-day event

    // Committed window: departs X working days before, available again Y days after
    const committedFrom = ev.isReturned ? eventStart : addWorkdays(eventStart, -departureBufferDays)
    const committedTo = ev.isReturned ? addDays(eventEnd, 0) : addDays(eventEnd, returnBufferDays)

    if (!isInRange(new Date(day), new Date(committedFrom), new Date(committedTo))) continue

    const bandMap = isTentative ? tentativeBands : bands
    const baseMap = isTentative ? tentativeBases : bases

    // Count bands committed on this day
    for (const b of ev.bands) {
      const prev = bandMap.get(b.groupId) || 0
      // If returned: actual amount; if not returned: apply 10% forecast defect
      const effective = ev.isReturned ? b.anzahl : Math.ceil(b.anzahl * (1 + DEFECT_RATE))
      bandMap.set(b.groupId, prev + effective)
    }

    // Count bases committed
    for (const b of ev.bases) {
      const prev = baseMap.get(b.baseId) || 0
      baseMap.set(b.baseId, prev + b.anzahl)
    }
  }

  return { bands, bases, tentativeBands, tentativeBases }
}

function utilizationColor(used: number, total: number): string {
  if (total === 0) return "bg-muted text-muted-foreground"
  const pct = used / total
  if (pct >= 1) return "bg-red-500 text-white"
  if (pct >= 0.8) return "bg-amber-400 text-white"
  if (pct >= 0.5) return "bg-yellow-300 text-yellow-900"
  return "bg-green-500 text-white"
}

function utilizationBg(used: number, total: number): string {
  if (total === 0) return ""
  const pct = used / total
  if (pct >= 1) return "bg-red-50 dark:bg-red-950/20"
  if (pct >= 0.8) return "bg-amber-50 dark:bg-amber-950/20"
  if (pct >= 0.5) return "bg-yellow-50 dark:bg-yellow-950/10"
  return ""
}

// ─── Calendar Day Cell ─────────────────────────────────────────────────────────

function DayCell({
  date,
  isCurrentMonth,
  isToday,
  events,
  bandStock,
  baseStock,
  onDayClick,
  departureBufferDays,
  returnBufferDays,
}: {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: RentalEvent[]
  bandStock: BandStock[]
  baseStock: BaseStock[]
  onDayClick: (date: Date, events: RentalEvent[]) => void
  departureBufferDays: number
  returnBufferDays: number
}) {
  const { bands, bases, tentativeBands, tentativeBases } = useMemo(() => computeDailyLoad(date, events, departureBufferDays, returnBufferDays), [date, events, departureBufferDays, returnBufferDays])

  // Worst utilisation across all resources for background tint
  // Confirmed load drives the color; tentative adds a secondary indicator
  let maxPct = 0
  let maxPctWithTentative = 0
  for (const bs of bandStock) {
    const confirmed = bands.get(bs.groupId) || 0
    const tentative = tentativeBands.get(bs.groupId) || 0
    if (bs.totalStock > 0) {
      maxPct = Math.max(maxPct, confirmed / bs.totalStock)
      maxPctWithTentative = Math.max(maxPctWithTentative, (confirmed + tentative) / bs.totalStock)
    }
  }
  for (const bs of baseStock) {
    const confirmed = bases.get(bs.baseId) || 0
    const tentative = tentativeBases.get(bs.baseId) || 0
    if (bs.totalStock > 0) {
      maxPct = Math.max(maxPct, confirmed / bs.totalStock)
      maxPctWithTentative = Math.max(maxPctWithTentative, (confirmed + tentative) / bs.totalStock)
    }
  }

  // Events that are active on this day (for dots)
  const activeEvents = events.filter((ev) => {
    if (!ev.datumAusgabe) return false
    const eventStart = new Date(ev.datumAusgabe)
    const eventEnd = ev.isReturned && ev.datumRueckgabeIst
      ? new Date(ev.datumRueckgabeIst)
      : ev.datumRueckgabePlan ? new Date(ev.datumRueckgabePlan) : addDays(eventStart, 3)
    const from = ev.isReturned ? eventStart : addWorkdays(eventStart, -departureBufferDays)
    const to = ev.isReturned ? eventEnd : addDays(eventEnd, returnBufferDays)
    return isInRange(new Date(date), new Date(from), new Date(to))
  })

  const bgClass = maxPct >= 1
    ? "bg-red-50 dark:bg-red-950/30"
    : maxPct >= 0.8
    ? "bg-amber-50 dark:bg-amber-950/20"
    : maxPct >= 0.5
    ? "bg-yellow-50/60 dark:bg-yellow-950/10"
    : maxPctWithTentative >= 0.8
    ? "bg-slate-50 dark:bg-slate-900/30"
    : ""

  return (
    <button
      onClick={() => onDayClick(date, activeEvents)}
      className={cn(
        "relative min-h-[72px] w-full text-left p-1.5 rounded-lg border transition-all hover:border-wristlink-cyan/50 hover:shadow-sm",
        isCurrentMonth ? "border-border/50" : "border-border/20 opacity-40",
        isToday && "border-wristlink-cyan ring-1 ring-wristlink-cyan/30",
        bgClass,
      )}
    >
      <span className={cn(
        "text-xs font-medium leading-none",
        isToday && "bg-wristlink-cyan text-white rounded-full w-5 h-5 flex items-center justify-center",
      )}>
        {date.getDate()}
      </span>

      {/* Event dots: solid = confirmed/returned, dashed ring = tentative */}
      {activeEvents.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {activeEvents.slice(0, 3).map((ev) => {
            const isTentative = ev.status === "ANFRAGE"
            return (
              <span
                key={ev.id}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  ev.isReturned ? "bg-slate-400" :
                  isTentative ? "bg-amber-400 ring-1 ring-amber-400 ring-offset-[1px]" :
                  "bg-wristlink-cyan"
                )}
                title={`${ev.customerName}${isTentative ? " (Anfrage)" : ""}`}
              />
            )
          })}
          {activeEvents.length > 3 && (
            <span className="text-[9px] text-muted-foreground leading-none self-end">+{activeEvents.length - 3}</span>
          )}
        </div>
      )}

      {/* Utilisation bars: confirmed (solid) + tentative (striped) */}
      {(maxPct > 0 || maxPctWithTentative > 0) && (
        <div className="absolute bottom-1 left-1 right-1 h-1 rounded-full bg-muted overflow-hidden">
          {maxPctWithTentative > maxPct && (
            <div
              className="h-full rounded-full bg-amber-200 absolute top-0 left-0"
              style={{ width: `${Math.min(100, maxPctWithTentative * 100)}%` }}
            />
          )}
          <div
            className={cn("h-full rounded-full transition-all relative", maxPct >= 1 ? "bg-red-500" : maxPct >= 0.8 ? "bg-amber-400" : "bg-yellow-300")}
            style={{ width: `${Math.min(100, maxPct * 100)}%` }}
          />
        </div>
      )}
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CalendarView({ rentalEvents, bandStock, baseStock, departureBufferDays = 6, returnBufferDays = 5 }: CalendarViewProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<{ date: Date; events: RentalEvent[] } | null>(null)
  const [viewMode, setViewMode] = useState<"kalender" | "auslastung">("kalender")

  const monthLabel = currentMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Start on Monday
    const startDow = (firstDay.getDay() + 6) % 7
    const days: Date[] = []
    for (let i = startDow - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push(new Date(year, month + 1, d))
    }
    return days
  }, [currentMonth])

  // Compute utilisation per day for the whole month (for the utilisation view)
  const dailyUtilisation = useMemo(() => {
    return calendarDays.map((day) => {
      const { bands, bases } = computeDailyLoad(day, rentalEvents, departureBufferDays, returnBufferDays)
      const bandUtils = bandStock.map((bs) => ({
        name: bs.groupName,
        used: bands.get(bs.groupId) || 0,
        total: bs.totalStock,
      }))
      const baseUtils = baseStock.map((bs) => ({
        name: bs.baseBezeichnung,
        used: bases.get(bs.baseId) || 0,
        total: bs.totalStock,
      }))
      return { day, bandUtils, baseUtils }
    })
  }, [calendarDays, rentalEvents, bandStock, baseStock])

  const handleDayClick = (date: Date, events: RentalEvent[]) => {
    setSelectedDay({ date, events })
  }

  const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[180px] text-center capitalize">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))} className="ml-2 text-muted-foreground">
            Heute
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "kalender" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kalender")}
          >
            Kalender
          </Button>
          <Button
            variant={viewMode === "auslastung" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("auslastung")}
          >
            Auslastung
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Verfügbar</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-300 inline-block" /> 50–80% ausgelastet</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 80–100% ausgelastet</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Überbucht</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-wristlink-cyan inline-block" /> Aktive Vermietung</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> Abgeschlossen</div>
        <div className="ml-auto text-[11px]">inkl. {departureBufferDays} WT Vorlauf · {returnBufferDays} Tage Nachlauf · 10% Schwund-Forecast</div>
      </div>

      {viewMode === "kalender" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="xl:col-span-2">
            <Card>
              <CardContent className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {dayNames.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => (
                    <DayCell
                      key={i}
                      date={day}
                      isCurrentMonth={day.getMonth() === currentMonth.getMonth()}
                      isToday={isSameDay(day, today)}
                      events={rentalEvents}
                      bandStock={bandStock}
                      baseStock={baseStock}
                      onDayClick={handleDayClick}
                      departureBufferDays={departureBufferDays}
                      returnBufferDays={returnBufferDays}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side panel: selected day details or month overview */}
          <div className="flex flex-col gap-4">
            {selectedDay ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {selectedDay.date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)} className="h-7 w-7 p-0 text-muted-foreground">×</Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {selectedDay.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Keine Vermietungen an diesem Tag.</p>
                  ) : (
                    selectedDay.events.map((ev) => {
                      const isTentative = ev.status === "ANFRAGE"
                      const statusLabel = ev.isReturned ? "Zurück" : ev.status === "ANFRAGE" ? "Anfrage" : "Bestatigt"
                      const borderColor = ev.isReturned ? "border-slate-400" : isTentative ? "border-amber-400" : "border-wristlink-cyan"
                      const bgColor = ev.isReturned ? "bg-slate-50 dark:bg-slate-900/30" : isTentative ? "bg-amber-50/50 dark:bg-amber-950/20" : "bg-cyan-50/50 dark:bg-cyan-950/20"
                      return (
                      <div key={ev.id} className={cn("p-3 rounded-lg border-l-4", borderColor, bgColor)}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">{ev.customerName}</span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px]",
                              ev.isReturned ? "border-slate-300 text-slate-500" :
                              isTentative ? "border-amber-300 text-amber-600 bg-amber-50" :
                              "border-green-300 text-green-700 bg-green-50"
                            )}
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                        {ev.bemerkung && <p className="text-xs text-muted-foreground mb-2">{ev.bemerkung}</p>}
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>Ausgabe: {ev.datumAusgabe ? new Date(ev.datumAusgabe).toLocaleDateString("de-DE") : "—"}</div>
                          <div>Rückgabe (plan): {ev.datumRueckgabePlan ? new Date(ev.datumRueckgabePlan).toLocaleDateString("de-DE") : "—"}</div>
                          {ev.isReturned && ev.datumRueckgabeIst && (
                            <div>Rückgabe (ist): {new Date(ev.datumRueckgabeIst).toLocaleDateString("de-DE")}</div>
                          )}
                        </div>
                        {ev.bands.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ev.bands.map((b) => (
                              <span key={b.groupId} className="text-[10px] bg-wristlink-cyan/10 text-wristlink-cyan rounded px-1.5 py-0.5">
                                {b.groupName}: {b.anzahl} St.
                              </span>
                            ))}
                          </div>
                        )}
                        {ev.bases.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {ev.bases.map((b) => (
                              <span key={b.baseId} className="text-[10px] bg-wristlink-purple/10 text-wristlink-purple rounded px-1.5 py-0.5">
                                {b.baseBezeichnung}: {b.anzahl} St.
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      )
                    })
                  )}

                  {/* Stock snapshot for selected day */}
                  {selectedDay.events.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bestand an diesem Tag</p>
                      {(() => {
                        const { bands, bases, tentativeBands, tentativeBases } = computeDailyLoad(selectedDay.date, rentalEvents, departureBufferDays, returnBufferDays)
                        return (
                          <>
                            {bandStock.map((bs) => {
                              const used = bands.get(bs.groupId) || 0
                              const tentative = tentativeBands.get(bs.groupId) || 0
                              const avail = Math.max(0, bs.totalStock - used)
                              return (
                                <div key={bs.groupId} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1"><Radio className="h-3 w-3" />{bs.groupName}</span>
                                  <div className="flex items-center gap-1.5">
                                    {tentative > 0 && (
                                      <span className="font-mono text-[10px] text-amber-600 px-1 py-0.5 rounded bg-amber-100 border border-amber-200">
                                        ~{Math.max(0, bs.totalStock - used - tentative)} inkl. Anf.
                                      </span>
                                    )}
                                    <span className={cn("font-mono font-semibold px-1.5 py-0.5 rounded text-[10px]", utilizationColor(used, bs.totalStock))}>
                                      {avail} / {bs.totalStock}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                            {baseStock.map((bs) => {
                              const used = bases.get(bs.baseId) || 0
                              const tentative = tentativeBases.get(bs.baseId) || 0
                              const avail = Math.max(0, bs.totalStock - used)
                              return (
                                <div key={bs.baseId} className="flex items-center justify-between text-xs">
                                  <span className="flex items-center gap-1"><Package className="h-3 w-3" />{bs.baseBezeichnung}</span>
                                  <div className="flex items-center gap-1.5">
                                    {tentative > 0 && (
                                      <span className="font-mono text-[10px] text-amber-600 px-1 py-0.5 rounded bg-amber-100 border border-amber-200">
                                        ~{Math.max(0, bs.totalStock - used - tentative)} inkl. Anf.
                                      </span>
                                    )}
                                    <span className={cn("font-mono font-semibold px-1.5 py-0.5 rounded text-[10px]", utilizationColor(used, bs.totalStock))}>
                                      {avail} / {bs.totalStock}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Monatszusammenfassung</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Aktive Vermietungen: </span>
                    <span className="font-semibold">{rentalEvents.filter(e => !e.isReturned && e.status === "BESTAETIGT").length}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Anfragen / Angebote: </span>
                    <span className="font-semibold text-amber-600">{rentalEvents.filter(e => !e.isReturned && (e.status === "ANFRAGE" || e.status === "ANGEBOT")).length}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Abgeschlossen: </span>
                    <span className="font-semibold">{rentalEvents.filter(e => e.isReturned).length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tag anklicken für Details und Bestandsübersicht.</p>
                </CardContent>
              </Card>
            )}

            {/* Stock total */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Gesamtbestand</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {bandStock.length === 0 && baseStock.length === 0 && (
                  <p className="text-sm text-muted-foreground">Kein Bestand erfasst.</p>
                )}
                {bandStock.map((bs) => (
                  <div key={bs.groupId} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Radio className="h-3 w-3" />{bs.groupName}</span>
                    <span className="font-mono font-semibold">{bs.totalStock} St.</span>
                  </div>
                ))}
                {baseStock.map((bs) => (
                  <div key={bs.baseId} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Package className="h-3 w-3" />{bs.baseBezeichnung}</span>
                    <span className="font-mono font-semibold">{bs.totalStock} St.</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // Auslastungsansicht: table per resource showing daily load across the month
        <div className="flex flex-col gap-6">
          {bandStock.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4 text-wristlink-cyan" /> LED-Bänder Auslastung</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <UtilisationGrid days={calendarDays} currentMonth={currentMonth} dailyUtils={dailyUtilisation.map(d => ({ day: d.day, items: d.bandUtils }))} />
              </CardContent>
            </Card>
          )}
          {baseStock.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-wristlink-purple" /> Basen Auslastung</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <UtilisationGrid days={calendarDays} currentMonth={currentMonth} dailyUtils={dailyUtilisation.map(d => ({ day: d.day, items: d.baseUtils }))} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Utilisation Grid ─────────────────────────────────────────────────────────

function UtilisationGrid({
  days,
  currentMonth,
  dailyUtils,
}: {
  days: Date[]
  currentMonth: Date
  dailyUtils: Array<{ day: Date; items: Array<{ name: string; used: number; total: number }> }>
}) {
  const today = new Date()
  const monthDays = days.filter(d => d.getMonth() === currentMonth.getMonth())
  const resources = dailyUtils[0]?.items.map(i => i.name) ?? []

  return (
    <table className="text-xs border-collapse w-full min-w-max">
      <thead>
        <tr>
          <th className="text-left py-1 pr-3 font-semibold text-muted-foreground w-32">Ressource</th>
          {monthDays.map((d, i) => (
            <th key={i} className={cn(
              "text-center px-0.5 py-1 font-medium w-8",
              isSameDay(d, today) && "text-wristlink-cyan font-bold"
            )}>
              {d.getDate()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {resources.map((resource) => (
          <tr key={resource}>
            <td className="pr-3 py-1 text-muted-foreground truncate max-w-[120px]" title={resource}>{resource}</td>
            {monthDays.map((day, i) => {
              const dayData = dailyUtils.find(d => isSameDay(d.day, day))
              const item = dayData?.items.find(it => it.name === resource)
              const used = item?.used ?? 0
              const total = item?.total ?? 0
              const avail = Math.max(0, total - used)
              return (
                <td key={i} className="text-center p-0">
                  <div
                    title={`${resource}: ${avail}/${total} verfügbar`}
                    className={cn(
                      "mx-0.5 my-0.5 h-7 rounded flex items-center justify-center font-mono text-[10px] font-semibold",
                      total === 0 ? "bg-muted text-muted-foreground" : utilizationColor(used, total)
                    )}
                  >
                    {total > 0 ? avail : "—"}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
