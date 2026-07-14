"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BookingModal } from "@/components/booking/booking-modal"
import { useToast } from "@/hooks/use-toast"
import {
  saveQuoteBandAllocations,
  updateQuoteBookingBaseAllocation,
  type QuoteStationInfo,
  type QuoteWarehouseBaseOption,
} from "@/lib/actions/quote-warehouse"
import { ensureQuoteBooking } from "@/lib/actions/quote-booking"
import {
  suggestBandAllocation,
  type BandAllocationLine,
  type BandBatchPool,
} from "@/lib/konfigurator/band-allocation"
import { modusAnzeige } from "@/lib/konfigurator/product-info"
import {
  isBaseStationTyp,
  STATION_TYP_LABELS,
  type BaseStationTyp,
} from "@/lib/konfigurator/station-types"
import { setReturnBookingId } from "@/lib/actions/fulfillment"
import { isFulfillmentComplete } from "@/lib/konfigurator/fulfillment-status"
import { ACTIVE_STATUSES } from "@/lib/konfigurator/quote-status"
import type { FulfillmentStatus, QuoteStatus } from "@/lib/konfigurator/types"
import type { BatchRow, BookingStatus, BookingWithRelations, GroupRow } from "@/lib/types"
import { formatDate } from "@/lib/utils/date"
import { getBookingTypeColor, getBookingTypeLabel } from "@/lib/utils/booking"
import { ExternalLink, FileText } from "lucide-react"

const STATUS_META: Record<BookingStatus, { label: string; className: string }> = {
  ANFRAGE: {
    label: "Anfrage",
    className:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  },
  BESTAETIGT: {
    label: "Bestätigt",
    className:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300",
  },
}

type BookingModalPropsInput = {
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

export interface QuoteWarehousePanelProps {
  quoteId: number
  quoteStatus: QuoteStatus
  modus: string
  requiredMenge: number
  hasDruck?: boolean
  fulfillmentStatus: FulfillmentStatus | null
  bookingId?: number | null
  eventVon?: string | null
  warehouseData: {
    primaryBooking: BookingWithRelations | null
    returnBooking: BookingWithRelations | null
    remainingByGroup: Record<number, number>
    stationInfo: QuoteStationInfo | null
    availableBases: QuoteWarehouseBaseOption[]
    bandBatchPools: BandBatchPool[]
  }
  groups: GroupRow[]
  batches: BatchRow[]
  bookingModalProps: BookingModalPropsInput | null
}

function isActiveQuoteStatus(status: QuoteStatus): boolean {
  return ACTIVE_STATUSES.includes(status) || status === "paid"
}

function shouldShowPanel(props: QuoteWarehousePanelProps): boolean {
  const { modus, quoteStatus, warehouseData, bookingId, eventVon } = props
  const { primaryBooking } = warehouseData

  if (primaryBooking) return true
  if (bookingId != null && !primaryBooking) return true
  if (modus === "miete" && Boolean(eventVon) && isActiveQuoteStatus(quoteStatus)) return true
  if (modus === "kauf" && quoteStatus === "paid" && !primaryBooking) return true

  return false
}

function BandAllocationPlanner({
  quoteId,
  requiredMenge,
  booking,
  groups,
  batches,
  bandBatchPools,
  isEditable,
}: {
  quoteId: number
  requiredMenge: number
  booking: BookingWithRelations
  groups: GroupRow[]
  batches: BatchRow[]
  bandBatchPools: BandBatchPool[]
  isEditable: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const currentAllocations = useMemo(() => {
    return booking.items
      .filter((item) => item.group_id != null)
      .map((item) => ({
        groupId: item.group_id as number,
        batchId: item.batch_id as number,
        anzahl: item.anzahl || 0,
        groupName: item.group?.name || groups.find((g) => g.id === item.group_id)?.name || "",
        batchCode: item.batch?.code || batches.find((b) => b.id === item.batch_id)?.code || "",
      }))
  }, [booking.items, groups, batches])

  const [rows, setRows] = useState<BandAllocationLine[]>([])

  useEffect(() => {
    if (currentAllocations.length > 0 && currentAllocations.every((row) => row.batchId)) {
      setRows(currentAllocations)
      return
    }
    const suggestion = suggestBandAllocation(requiredMenge, bandBatchPools)
    if (suggestion.length > 0) setRows(suggestion)
  }, [currentAllocations, requiredMenge, bandBatchPools])

  const assignedTotal = rows.reduce((sum, row) => sum + (Number(row.anzahl) || 0), 0)
  const sumOk = assignedTotal === requiredMenge

  const applySuggestion = () => {
    setRows(suggestBandAllocation(requiredMenge, bandBatchPools))
  }

  const updateRow = (index: number, patch: Partial<BandAllocationLine>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addRow = () => {
    const firstPool = bandBatchPools[0]
    if (!firstPool) return
    setRows((prev) => [
      ...prev,
      {
        groupId: firstPool.groupId,
        batchId: firstPool.batchId,
        anzahl: Math.max(0, requiredMenge - assignedTotal),
        groupName: firstPool.groupName,
        batchCode: firstPool.batchCode,
      },
    ])
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveQuoteBandAllocations(
        quoteId,
        rows.map((row) => ({
          groupId: row.groupId,
          batchId: row.batchId,
          anzahl: Number(row.anzahl),
        })),
      )
      if (result.success) {
        toast({ title: "Gespeichert", description: "Chargen-Zuweisung wurde gespeichert." })
        router.refresh()
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Zuweisung konnte nicht gespeichert werden.",
          variant: "destructive",
        })
      }
    })
  }

  const poolLabel = (groupId: number, batchId: number) => {
    const pool = bandBatchPools.find((p) => p.groupId === groupId && p.batchId === batchId)
    return pool ? `${pool.groupName} · ${pool.batchCode} (frei ${pool.verfuegbar})` : "–"
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <h4 className="text-sm font-semibold mb-2">Verfügbarkeit je Charge</h4>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leuchtgruppe</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead className="text-right">Verfügbar</TableHead>
                <TableHead className="text-right">In Vermietung</TableHead>
                <TableHead className="text-right">Gesamt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bandBatchPools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Keine Chargen mit Bestand gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                bandBatchPools.map((pool) => (
                  <TableRow key={`${pool.groupId}-${pool.batchId}`}>
                    <TableCell className="font-medium">{pool.groupName}</TableCell>
                    <TableCell className="font-mono text-xs">{pool.batchCode}</TableCell>
                    <TableCell className="text-right font-mono">{pool.verfuegbar}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {pool.inVermietung}
                    </TableCell>
                    <TableCell className="text-right font-mono">{pool.gesamtsumme}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isEditable && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Chargen-Zuweisung</h4>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={applySuggestion} disabled={isPending}>
                Vorschlag übernehmen
              </Button>
              <Button size="sm" variant="outline" onClick={addRow} disabled={isPending}>
                Zeile hinzufügen
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Aufteilung frei wählbar (z. B. 100× G1 + 200× G2). Summe muss{" "}
            <span className="font-mono">{requiredMenge}</span> ergeben.
          </p>

          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={`alloc-${index}`} className="flex flex-wrap items-center gap-2">
                <Select
                  value={`${row.groupId}:${row.batchId}`}
                  onValueChange={(value) => {
                    const [g, b] = value.split(":").map(Number)
                    const pool = bandBatchPools.find((p) => p.groupId === g && p.batchId === b)
                    updateRow(index, {
                      groupId: g,
                      batchId: b,
                      groupName: pool?.groupName || "",
                      batchCode: pool?.batchCode || "",
                    })
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 w-[280px]">
                    <SelectValue placeholder="Gruppe · Charge" />
                  </SelectTrigger>
                  <SelectContent>
                    {bandBatchPools.map((pool) => (
                      <SelectItem
                        key={`${pool.groupId}-${pool.batchId}`}
                        value={`${pool.groupId}:${pool.batchId}`}
                      >
                        {poolLabel(pool.groupId, pool.batchId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={row.anzahl}
                  onChange={(e) => updateRow(index, { anzahl: Number(e.target.value) })}
                  disabled={isPending}
                  className="h-8 w-24"
                />
                {rows.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeRow(index)}
                    disabled={isPending}
                  >
                    Entfernen
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`text-sm ${sumOk ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"}`}
            >
              Summe: <span className="font-mono">{assignedTotal}</span> / {requiredMenge}
            </span>
            <Button size="sm" onClick={handleSave} disabled={isPending || !sumOk || rows.length === 0}>
              {isPending ? "Speichern…" : "Zuweisung speichern"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PrimaryBookingSection({
  quoteId,
  quoteStatus,
  booking,
  groups,
  batches,
  requiredMenge,
  bandBatchPools,
}: {
  quoteId: number
  quoteStatus: QuoteStatus
  booking: BookingWithRelations
  groups: GroupRow[]
  batches: BatchRow[]
  requiredMenge: number
  bandBatchPools: BandBatchPool[]
}) {
  const isEditable =
    quoteStatus === "paid" || (quoteStatus === "approved" && booking != null)
  const bandItems = booking.items.filter((item) => item.group_id != null)
  const status = (booking.status as BookingStatus) || "BESTAETIGT"

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={getBookingTypeColor(booking.booking_type)}>
            {getBookingTypeLabel(booking.booking_type)}
          </Badge>
          {booking.booking_type === "MIETE_AUSGABE" && (
            <span className="text-xs text-muted-foreground">
              {booking.datum_ausgabe && <>Ausgabe: {formatDate(booking.datum_ausgabe)}</>}
              {booking.datum_rueckgabe_geplant && (
                <> · Rückgabe geplant: {formatDate(booking.datum_rueckgabe_geplant)}</>
              )}
            </span>
          )}
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
          <Link href={`/warenverwaltung/buchungen?highlight=${booking.id}`}>
            Im Protokoll
            <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Leuchtgruppe</TableHead>
              <TableHead>Charge</TableHead>
              <TableHead className="text-right">Anzahl</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bandItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-sm">
                  Keine Positionen
                </TableCell>
              </TableRow>
            ) : (
              bandItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{item.group?.name || "–"}</span>
                      {item.batch?.funktionsumfang && (
                        <span className="text-xs text-muted-foreground">
                          {item.batch.funktionsumfang}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.batch?.code ? (
                      <span className="font-mono text-xs">{item.batch.code}</span>
                    ) : (
                      "–"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">{item.anzahl}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${STATUS_META[status]?.className}`}
                    >
                      {STATUS_META[status]?.label}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BandAllocationPlanner
        quoteId={quoteId}
        requiredMenge={requiredMenge}
        booking={booking}
        groups={groups}
        batches={batches}
        bandBatchPools={bandBatchPools}
        isEditable={isEditable}
      />
    </div>
  )
}

function FulfillmentReadinessHint({
  quoteStatus,
  fulfillmentStatus,
  hasDruck,
  primaryBooking,
  stationInfo,
  requiredMenge,
}: {
  quoteStatus: QuoteStatus
  fulfillmentStatus: FulfillmentStatus | null
  hasDruck: boolean
  primaryBooking: BookingWithRelations | null
  stationInfo: QuoteStationInfo | null
  requiredMenge: number
}) {
  const fulfillmentActive =
    quoteStatus === "paid" &&
    fulfillmentStatus != null &&
    !isFulfillmentComplete(fulfillmentStatus, hasDruck)

  if (!fulfillmentActive) return null

  const hasBooking = primaryBooking != null
  const bandItems = primaryBooking?.items.filter((item) => item.group_id != null) ?? []
  const bandAllocationComplete =
    bandItems.length > 0 &&
    bandItems.every((item) => item.group_id != null && item.batch_id != null) &&
    bandItems.reduce((sum, item) => sum + (item.anzahl || 0), 0) === requiredMenge
  const baseItems = primaryBooking?.items.filter((item) => item.base_id) ?? []
  const baseAllocationComplete =
    baseItems.length > 0 &&
    baseItems.some((item) => (item.anzahl_basen ?? item.anzahl ?? 0) >= 1)
  const needsBase = stationInfo != null

  function CheckItem({ ok, label }: { ok: boolean; label: string }) {
    return (
      <span className={ok ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"}>
        {ok ? "✓" : "✗"} {label}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-b pb-3">
      <CheckItem ok={hasBooking} label="Buchung verknüpft" />
      <CheckItem ok={bandAllocationComplete} label="Leuchtgruppe + Charge" />
      {needsBase && <CheckItem ok={baseAllocationComplete} label="Basis" />}
    </div>
  )
}

function BaseAllocationEditor({
  quoteId,
  stationInfo,
  availableBases,
}: {
  quoteId: number
  stationInfo: QuoteStationInfo
  availableBases: QuoteWarehouseBaseOption[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const defaultAnzahl =
    stationInfo.station === "pro" ? Math.max(stationInfo.gruppen, 1) : 1
  const [baseId, setBaseId] = useState(
    availableBases.length > 0 ? String(availableBases[0].id) : "",
  )
  const [anzahl, setAnzahl] = useState(String(defaultAnzahl))

  const handleAssign = () => {
    const parsedBaseId = Number(baseId)
    const parsedAnzahl = Number(anzahl)
    if (!Number.isFinite(parsedBaseId) || !Number.isFinite(parsedAnzahl) || parsedAnzahl < 1) {
      toast({
        title: "Fehler",
        description: "Bitte Basis und Anzahl auswählen.",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      const result = await updateQuoteBookingBaseAllocation(quoteId, {
        baseId: parsedBaseId,
        anzahl: parsedAnzahl,
      })
      if (result.success) {
        toast({ title: "Gespeichert", description: "Basis-Station wurde zugewiesen." })
        router.refresh()
      } else {
        toast({
          title: "Fehler",
          description: result.error || "Basis konnte nicht zugewiesen werden.",
          variant: "destructive",
        })
      }
    })
  }

  if (availableBases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine passenden Basis-Stationen im Bestand hinterlegt.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={baseId} onValueChange={setBaseId} disabled={isPending}>
        <SelectTrigger className="h-8 w-[220px]">
          <SelectValue placeholder="Basis-Station" />
        </SelectTrigger>
        <SelectContent>
          {availableBases.map((base) => (
            <SelectItem key={base.id} value={String(base.id)}>
              {base.seriennummer ? `${base.seriennummer} · ` : ""}
              {base.bezeichnung} · frei {base.verfuegbar}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={1}
        value={anzahl}
        onChange={(e) => setAnzahl(e.target.value)}
        disabled={isPending}
        className="h-8 w-20"
      />
      <Button size="sm" variant="outline" onClick={handleAssign} disabled={isPending}>
        Basis zuweisen
      </Button>
    </div>
  )
}

function StationBasesSection({
  quoteId,
  quoteStatus,
  stationInfo,
  primaryBooking,
  availableBases,
}: {
  quoteId: number
  quoteStatus: QuoteStatus
  stationInfo: QuoteStationInfo | null
  primaryBooking: BookingWithRelations | null
  availableBases: QuoteWarehouseBaseOption[]
}) {
  const baseItems = primaryBooking?.items.filter((item) => item.base_id) ?? []
  const shouldShow = stationInfo != null || baseItems.length > 0
  if (!shouldShow) return null

  const isEditable =
    quoteStatus === "paid" || (quoteStatus === "approved" && primaryBooking != null)

  const stationLabel =
    stationInfo && isBaseStationTyp(stationInfo.station)
      ? STATION_TYP_LABELS[stationInfo.station as BaseStationTyp]
      : stationInfo?.station

  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-semibold">Station & Basen</h4>

      {stationInfo && stationLabel && (
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">{stationLabel}</span>
            {" · "}
            {modusAnzeige(stationInfo.stationModus)}
          </p>
          {stationInfo.station === "pro" && stationInfo.gruppen > 0 && (
            <p className="text-muted-foreground">
              {stationInfo.gruppen} Gruppe{stationInfo.gruppen === 1 ? "" : "n"}
              {stationInfo.baenderProGruppe > 0
                ? ` × ${stationInfo.baenderProGruppe} Bänder`
                : ""}
            </p>
          )}
        </div>
      )}

      {baseItems.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Basis-Station</TableHead>
                <TableHead>Seriennummer</TableHead>
                <TableHead>Hersteller</TableHead>
                <TableHead className="text-right">Anzahl</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baseItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.base?.bezeichnung || "–"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.base?.seriennummer || "–"}</TableCell>
                  <TableCell>{item.base?.hersteller || "–"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {item.anzahl_basen ?? item.anzahl ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : isEditable && stationInfo && primaryBooking ? (
        <BaseAllocationEditor
          quoteId={quoteId}
          stationInfo={stationInfo}
          availableBases={availableBases}
        />
      ) : stationInfo && !primaryBooking ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Zuerst Buchung anlegen (siehe oben), dann Basis-Station zuweisen.
        </p>
      ) : stationInfo ? (
        <p className="text-sm text-muted-foreground">
          Basis-Station im Auftrag gebucht — Zuweisung bei Packen
        </p>
      ) : null}
    </div>
  )
}

function ReturnSection({
  quoteId,
  quoteStatus,
  fulfillmentStatus,
  primaryBooking,
  returnBooking,
  remainingByGroup,
  groups,
  bookingModalProps,
}: {
  quoteId: number
  quoteStatus: QuoteStatus
  fulfillmentStatus: FulfillmentStatus | null
  primaryBooking: BookingWithRelations | null
  returnBooking: BookingWithRelations | null
  remainingByGroup: Record<number, number>
  groups: GroupRow[]
  bookingModalProps: BookingModalPropsInput | null
}) {
  const router = useRouter()
  const [openReturn, setOpenReturn] = useState(false)

  const groupNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const group of groups) map.set(group.id, group.name)
    return map
  }, [groups])

  const remainingEntries = Object.entries(remainingByGroup).filter(([, amount]) => amount > 0)

  const canCaptureReturn =
    !returnBooking &&
    primaryBooking &&
    (fulfillmentStatus === "ruecksendung_angekommen" ||
      fulfillmentStatus === "zurueckgepackt" ||
      quoteStatus === "paid")

  async function handleBookingCreated(bookingId: number) {
    await setReturnBookingId(quoteId, bookingId)
    router.refresh()
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-semibold">Rückgabe</h4>

      {returnBooking ? (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leuchtgruppe</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead className="text-right">Anzahl</TableHead>
                  <TableHead className="text-right">Fehlt</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnBooking.items
                  .filter((item) => item.group_id != null)
                  .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.group?.name || "–"}</TableCell>
                      <TableCell>
                        {item.batch?.code ? (
                          <span className="font-mono text-xs">{item.batch.code}</span>
                        ) : (
                          "–"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{item.anzahl}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {item.anzahl_fehlt ?? 0}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/protocol/${returnBooking.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Protokoll öffnen"
                          className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-wristlink-cyan/10 text-muted-foreground hover:text-wristlink-cyan transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : canCaptureReturn && bookingModalProps ? (
        <div className="space-y-2">
          <Button size="sm" onClick={() => setOpenReturn(true)}>
            Rückgabe erfassen
          </Button>
          {openReturn && (
            <BookingModal
              {...bookingModalProps}
              prefilledBooking={primaryBooking}
              onBookingCreated={handleBookingCreated}
              onClose={() => setOpenReturn(false)}
            />
          )}
        </div>
      ) : null}

      {remainingEntries.length > 0 && (
        <div className="space-y-1 text-sm text-muted-foreground">
          {remainingEntries.map(([groupId, amount]) => (
            <p key={groupId}>
              Noch ausstehend: {amount} Stück (
              {groupNameById.get(Number(groupId)) || `Gruppe ${groupId}`})
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function MissingBookingState({
  quoteId,
  modus,
  quoteStatus,
}: {
  quoteId: number
  modus: string
  quoteStatus: QuoteStatus
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const canRetry =
    quoteStatus === "paid" ||
    (modus === "miete" && isActiveQuoteStatus(quoteStatus))

  const handleRetry = () => {
    startTransition(async () => {
      const result = await ensureQuoteBooking(quoteId)
      if (result.success) {
        toast({
          title: "Buchung angelegt",
          description: result.bookingId
            ? `Buchung #${result.bookingId} wurde verknüpft.`
            : "Buchung wurde verknüpft.",
        })
        router.refresh()
      } else {
        toast({
          title: "Buchung fehlgeschlagen",
          description: result.error || "Unbekannter Fehler",
          variant: "destructive",
        })
      }
    })
  }

  if (modus === "miete" && quoteStatus === "submitted") {
    return (
      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-950/20">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Keine Miet-Reservierung verknüpft. Ohne Reservierung erscheint der Auftrag nicht im
          Kalender und nicht unter Buchungen.
        </p>
        <Button size="sm" variant="outline" onClick={handleRetry} disabled={isPending}>
          {isPending ? "Wird angelegt…" : "Reservierung jetzt anlegen"}
        </Button>
      </div>
    )
  }

  if (modus === "kauf" && quoteStatus === "paid") {
    return (
      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-950/20">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          <strong>Verkaufsbuchung fehlt.</strong> Bei der Zahlung konnte keine Bestandsbuchung
          angelegt werden (z. B. noch kein Zugang im Bestand). Ohne Buchung können Charge und
          Basis-Station nicht zugewiesen werden.
        </p>
        <p className="text-xs text-muted-foreground">
          Hinweis: Dies ist ein <strong>Kauf</strong>-Auftrag. Eine Miet-Reservierung (Status
          „Anfrage“) gibt es nur bei Produktmodus Miete — nicht bei Kauf mit gemieteter
          Basis-Station.
        </p>
        {canRetry && (
          <Button size="sm" onClick={handleRetry} disabled={isPending}>
            {isPending ? "Wird angelegt…" : "Verkaufsbuchung jetzt anlegen"}
          </Button>
        )}
      </div>
    )
  }

  if (modus === "miete" && isActiveQuoteStatus(quoteStatus)) {
    return (
      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-950/20">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Noch keine Miet-Buchung verknüpft.
        </p>
        {canRetry && (
          <Button size="sm" variant="outline" onClick={handleRetry} disabled={isPending}>
            {isPending ? "Wird angelegt…" : "Miet-Buchung jetzt anlegen"}
          </Button>
        )}
      </div>
    )
  }

  return <p className="text-sm text-muted-foreground">Noch keine Buchung verknüpft.</p>
}

function EmptyWarehouseState({
  modus,
  quoteStatus,
}: {
  modus: string
  quoteStatus: QuoteStatus
}) {
  if (modus === "miete" && quoteStatus === "submitted") {
    return (
      <p className="text-sm text-muted-foreground">
        Reservierung wird normalerweise beim Absenden angelegt.
      </p>
    )
  }

  if (modus === "kauf" && quoteStatus !== "paid") {
    return (
      <p className="text-sm text-muted-foreground">
        Verkaufsbuchung wird bei Zahlung angelegt.
      </p>
    )
  }

  return <p className="text-sm text-muted-foreground">Noch keine Buchung verknüpft.</p>
}

export function QuoteWarehousePanel(props: QuoteWarehousePanelProps) {
  const {
    quoteId,
    quoteStatus,
    modus,
    requiredMenge,
    hasDruck = false,
    fulfillmentStatus,
    warehouseData,
    groups,
    batches,
    bookingModalProps,
  } = props
  const { primaryBooking, returnBooking, remainingByGroup, stationInfo, availableBases, bandBatchPools } =
    warehouseData

  if (!shouldShowPanel(props)) return null

  return (
    <Card id="lager-bestand">
      <CardHeader>
        <CardTitle>Lager & Bestand</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FulfillmentReadinessHint
          quoteStatus={quoteStatus}
          fulfillmentStatus={fulfillmentStatus}
          hasDruck={hasDruck}
          primaryBooking={primaryBooking}
          stationInfo={stationInfo}
          requiredMenge={requiredMenge}
        />

        {primaryBooking ? (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Ausgabe / Reservierung</h4>
            <PrimaryBookingSection
              quoteId={quoteId}
              quoteStatus={quoteStatus}
              booking={primaryBooking}
              groups={groups}
              batches={batches}
              requiredMenge={requiredMenge}
              bandBatchPools={bandBatchPools}
            />
          </div>
        ) : quoteStatus === "paid" ||
          (modus === "miete" && isActiveQuoteStatus(quoteStatus)) ? (
          <MissingBookingState quoteId={quoteId} modus={modus} quoteStatus={quoteStatus} />
        ) : (
          <EmptyWarehouseState modus={modus} quoteStatus={quoteStatus} />
        )}

        <StationBasesSection
          quoteId={quoteId}
          quoteStatus={quoteStatus}
          stationInfo={stationInfo}
          primaryBooking={primaryBooking}
          availableBases={availableBases}
        />

        {modus === "miete" && (
          <ReturnSection
            quoteId={quoteId}
            quoteStatus={quoteStatus}
            fulfillmentStatus={fulfillmentStatus}
            primaryBooking={primaryBooking}
            returnBooking={returnBooking}
            remainingByGroup={remainingByGroup}
            groups={groups}
            bookingModalProps={bookingModalProps}
          />
        )}
      </CardContent>
    </Card>
  )
}
