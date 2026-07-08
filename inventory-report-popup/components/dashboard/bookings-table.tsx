"use client"

import { useState, useMemo, useTransition } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { BookingWithRelations } from "@/lib/types"
import { formatDateTime } from "@/lib/utils/date"
import { getBookingTypeLabel, getBookingTypeColor } from "@/lib/utils/booking"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileText, ChevronDown } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { updateBookingStatus } from "@/lib/actions/bookings"
import type { BookingStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface BookingsTableProps {
  bookings: BookingWithRelations[]
  onReturnClick?: (booking: BookingWithRelations) => void
}

type SortField = "date" | "type" | "group" | "batch" | "customer" | "amount" | "notes"
type SortDirection = "asc" | "desc"
type FilterMode = "all" | "aktuell_vermietet"

export function BookingsTable({ bookings, onReturnClick }: BookingsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [isPending, startTransition] = useTransition()

  const STATUS_META: Record<BookingStatus, { label: string; className: string }> = {
    ANFRAGE:    { label: "Anfrage",   className: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300" },
    BESTAETIGT: { label: "Bestatigt", className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300" },
  }

  const handleStatusChange = (bookingId: number, status: BookingStatus) => {
    startTransition(() => { updateBookingStatus(bookingId, status) })
  }

  // Set of rental IDs that have already been returned
  const returnedRentalIds = useMemo(() => {
    const ids = new Set<number>()
    for (const b of bookings) {
      if (b.booking_type === "MIETE_RUECKGABE" && b.reference_rental_id) {
        ids.add(b.reference_rental_id)
      }
    }
    return ids
  }, [bookings])

  const activeRentalCount = useMemo(() => {
    return bookings.filter(
      (b) => b.booking_type === "MIETE_AUSGABE" && !returnedRentalIds.has(b.id)
    ).length
  }, [bookings, returnedRentalIds])

  const flattenedBookings = useMemo(() => {
    return bookings.flatMap((booking) => {
      if (!booking.items || booking.items.length === 0) {
        return [{ ...booking, item: null }]
      }
      return booking.items.map((item: any) => ({ ...booking, item }))
    })
  }, [bookings])

  const filteredAndSortedBookings = useMemo(() => {
    let filtered = flattenedBookings

    // Filter by "aktuell vermietet"
    if (filterMode === "aktuell_vermietet") {
      filtered = filtered.filter((row: any) =>
        row.booking_type === "MIETE_AUSGABE" && !returnedRentalIds.has(row.id)
      )
    }

    // Filter by search term (customer and notes)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((row: any) => {
        const customerName = row.customer?.name?.toLowerCase() || ""
        const notes = row.bemerkung?.toLowerCase() || ""
        return customerName.includes(term) || notes.includes(term)
      })
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case "date":
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case "type":
          aValue = getBookingTypeLabel(a.booking_type)
          bValue = getBookingTypeLabel(b.booking_type)
          break
        case "group":
          aValue = a.item?.group?.name || ""
          bValue = b.item?.group?.name || ""
          break
        case "batch":
          aValue = a.item?.batch?.code || ""
          bValue = b.item?.batch?.code || ""
          break
        case "customer":
          aValue = a.customer?.name || ""
          bValue = b.customer?.name || ""
          break
        case "amount":
          aValue = a.item?.anzahl || 0
          bValue = b.item?.anzahl || 0
          break
        case "notes":
          aValue = a.bemerkung || ""
          bValue = b.bemerkung || ""
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [flattenedBookings, searchTerm, sortField, sortDirection, filterMode, returnedRentalIds])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1 text-wristlink-cyan" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 text-wristlink-cyan" />
    )
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buchungen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Keine Buchungen gefunden.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>Buchungen</CardTitle>
            {activeRentalCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {activeRentalCount} aktiv
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={filterMode === "aktuell_vermietet" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode(filterMode === "aktuell_vermietet" ? "all" : "aktuell_vermietet")}
              className={
                filterMode === "aktuell_vermietet"
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-0"
                  : "border-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
              }
            >
              Aktuell vermietet
              {filterMode === "aktuell_vermietet" && activeRentalCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
                  {activeRentalCount}
                </span>
              )}
            </Button>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Kunde oder Bemerkung..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-2 hover:border-wristlink-cyan/50 transition-colors"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("date")}
                    className="h-8 px-2 hover:bg-wristlink-cyan/10"
                  >
                    Datum
                    <SortIcon field="date" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("type")}
                    className="h-8 px-2 hover:bg-wristlink-cyan/10"
                  >
                    Typ
                    <SortIcon field="type" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("group")}
                    className="h-8 px-2 hover:bg-wristlink-cyan/10"
                  >
                    Leuchtgruppe
                    <SortIcon field="group" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("batch")}
                    className="h-8 px-2 hover:bg-wristlink-cyan/10"
                  >
                    Charge
                    <SortIcon field="batch" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("customer")}
                    className="h-8 px-2 hover:bg-wristlink-cyan/10"
                  >
                    Kunde
                    <SortIcon field="customer" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("amount")}
                    className="h-8 px-2 hover:bg-wristlink-cyan/10"
                  >
                    Anzahl
                    <SortIcon field="amount" />
                  </Button>
                </TableHead>
                <TableHead>Bemerkung</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[60px]">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Keine Ergebnisse gefunden
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedBookings.map((row, index) => {
                  const booking = row as any
                  const item = booking.item
                  const isRental = booking.booking_type === "MIETE_AUSGABE"
                  const isActiveRental = isRental && !returnedRentalIds.has(booking.id)
                  const handleClick = isRental && onReturnClick ? () => onReturnClick(booking) : undefined

                  return (
                    <TableRow
                      key={`${booking.id}-${index}`}
                      onClick={handleClick}
                      className={[
                        isRental && onReturnClick ? "cursor-pointer" : "",
                        isActiveRental ? "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30" : "hover:bg-muted/30",
                      ].join(" ").trim()}
                    >
                      <TableCell className="whitespace-nowrap">{formatDateTime(booking.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getBookingTypeColor(booking.booking_type)}>
                          {getBookingTypeLabel(booking.booking_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {item?.group ? (
                            <>
                              <span className="font-medium">{item.group.name}</span>
                              {item?.batch?.funktionsumfang && (
                                <span className="text-xs text-muted-foreground">{item.batch.funktionsumfang}</span>
                              )}
                            </>
                          ) : item?.base ? (
                            <>
                              <span className="font-medium">{item.base.bezeichnung}</span>
                              <span className="text-xs text-muted-foreground">Basis - {item.base.hersteller}</span>
                            </>
                          ) : (
                            <span className="font-medium text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item?.batch?.code ? <span className="font-mono text-xs">{item.batch.code}</span> : "-"}
                      </TableCell>
                      <TableCell>{booking.customer?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono">{item?.base ? (item.anzahl_basen || 0) : (item?.anzahl || 0)}</span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{booking.bemerkung || "-"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isRental ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-opacity ${STATUS_META[(booking.status as BookingStatus) || "BESTAETIGT"]?.className} ${isPending ? "opacity-50" : ""}`}
                              >
                                {STATUS_META[(booking.status as BookingStatus) || "BESTAETIGT"]?.label}
                                <ChevronDown className="h-3 w-3 opacity-60" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(["ANFRAGE", "BESTAETIGT"] as BookingStatus[]).map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleStatusChange(booking.id, s)}
                                  className="text-sm"
                                >
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${s === "ANFRAGE" ? "bg-slate-400" : "bg-green-500"}`} />
                                  {STATUS_META[s].label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isRental && (
                          <Link
                            href={`/protocol/${booking.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Lieferschein öffnen"
                            className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-wristlink-cyan/10 text-muted-foreground hover:text-wristlink-cyan transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
