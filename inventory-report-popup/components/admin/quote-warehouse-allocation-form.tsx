"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  saveQuoteBandAllocations,
  updateQuoteBookingBaseAllocation,
  type QuoteStationInfo,
  type QuoteWarehouseBaseOption,
} from "@/lib/actions/quote-warehouse"
import {
  suggestBandAllocation,
  type BandAllocationLine,
  type BandBatchPool,
} from "@/lib/konfigurator/band-allocation"
import {
  isBaseStationTyp,
  STATION_TYP_LABELS,
  type BaseStationTyp,
} from "@/lib/konfigurator/station-types"
import { modusAnzeige } from "@/lib/konfigurator/product-info"
import type { BookingWithRelations } from "@/lib/types"
import { formatDate } from "@/lib/utils/date"
import { getBookingTypeLabel } from "@/lib/utils/booking"
import { Loader2, Package, Plus, Trash2 } from "lucide-react"

type QuoteWarehouseAllocationFormProps = {
  quoteId: number
  requiredMenge: number
  booking: BookingWithRelations
  bandBatchPools: BandBatchPool[]
  stationInfo: QuoteStationInfo | null
  availableBases: QuoteWarehouseBaseOption[]
  onSuccess: () => void
}

function getPool(
  bandBatchPools: BandBatchPool[],
  groupId: number,
  batchId: number,
): BandBatchPool | undefined {
  return bandBatchPools.find((p) => p.groupId === groupId && p.batchId === batchId)
}

export function QuoteWarehouseAllocationForm({
  quoteId,
  requiredMenge,
  booking,
  bandBatchPools,
  stationInfo,
  availableBases,
  onSuccess,
}: QuoteWarehouseAllocationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const currentAllocations = useMemo(() => {
    return booking.items
      .filter((item) => item.group_id != null)
      .map((item) => ({
        groupId: item.group_id as number,
        batchId: item.batch_id as number,
        anzahl: item.anzahl || 0,
        groupName: item.group?.name || "",
        batchCode: item.batch?.code || "",
      }))
  }, [booking.items])

  const [rows, setRows] = useState<BandAllocationLine[]>([])

  const existingBaseItem = booking.items.find((item) => item.base_id != null)
  const defaultBaseAnzahl =
    stationInfo?.station === "pro" ? Math.max(stationInfo.gruppen, 1) : 1
  const [baseId, setBaseId] = useState(
    existingBaseItem?.base_id
      ? String(existingBaseItem.base_id)
      : availableBases.length > 0
        ? String(availableBases[0].id)
        : "",
  )
  const [baseAnzahl, setBaseAnzahl] = useState(
    String(existingBaseItem?.anzahl_basen ?? existingBaseItem?.anzahl ?? defaultBaseAnzahl),
  )

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
  const needsBase = stationInfo != null
  const selectedBase = availableBases.find((b) => String(b.id) === baseId)

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

  const poolLabel = (groupId: number, batchId: number) => {
    const pool = getPool(bandBatchPools, groupId, batchId)
    return pool ? `${pool.groupName} · ${pool.batchCode}` : "–"
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading || !sumOk || rows.length === 0) return

    if (needsBase && !baseId) {
      toast({
        title: "Fehler",
        description: "Bitte eine Basis-Station auswählen.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const bandResult = await saveQuoteBandAllocations(
        quoteId,
        rows.map((row) => ({
          groupId: row.groupId,
          batchId: row.batchId,
          anzahl: Number(row.anzahl),
        })),
      )

      if (!bandResult.success) {
        toast({
          title: "Fehler",
          description: bandResult.error || "Zuweisung konnte nicht gespeichert werden.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (needsBase && baseId) {
        const parsedBaseId = Number(baseId)
        const parsedAnzahl = Number(baseAnzahl)
        const baseResult = await updateQuoteBookingBaseAllocation(quoteId, {
          baseId: parsedBaseId,
          anzahl: parsedAnzahl,
        })
        if (!baseResult.success) {
          toast({
            title: "Bänder gespeichert",
            description:
              baseResult.error || "Basis-Zuweisung fehlgeschlagen — bitte erneut versuchen.",
            variant: "destructive",
          })
          setLoading(false)
          router.refresh()
          return
        }
      }

      toast({
        title: "Gespeichert",
        description: "Material-Zuweisung wurde für den Auftrag gespeichert.",
      })
      router.refresh()
      onSuccess()
    } catch {
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const stationLabel =
    stationInfo && isBaseStationTyp(stationInfo.station)
      ? STATION_TYP_LABELS[stationInfo.station as BaseStationTyp]
      : stationInfo?.station

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
        <div>
          <span className="text-muted-foreground">Buchungstyp</span>
          <p className="font-medium">{getBookingTypeLabel(booking.booking_type)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Auftragsmenge</span>
          <p className="font-medium font-mono">{requiredMenge} Bänder</p>
        </div>
        {booking.customer?.name && (
          <div>
            <span className="text-muted-foreground">Kunde</span>
            <p className="font-medium">{booking.customer.name}</p>
          </div>
        )}
        {booking.datum_ausgabe && (
          <div>
            <span className="text-muted-foreground">Zeitraum</span>
            <p className="font-medium">
              {formatDate(booking.datum_ausgabe)}
              {booking.datum_rueckgabe_geplant
                ? ` – ${formatDate(booking.datum_rueckgabe_geplant)}`
                : ""}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-wristlink-cyan" />
            Leuchtgruppen <span className="text-destructive">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applySuggestion}
              disabled={loading}
              className="border-2 border-wristlink-cyan/30 hover:border-wristlink-cyan hover:bg-wristlink-cyan/10"
            >
              Vorschlag übernehmen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={loading}
              className="gap-2 border-2 border-wristlink-cyan/30 hover:border-wristlink-cyan hover:bg-wristlink-cyan/10"
            >
              <Plus className="h-4 w-4" />
              Zeile hinzufügen
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Summe muss exakt <span className="font-mono">{requiredMenge}</span> ergeben. Aufteilung
          frei wählbar über mehrere Chargen.
        </p>

        <div className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Chargen mit Bestand verfügbar.</p>
          ) : (
            rows.map((row, index) => {
              const pool = getPool(bandBatchPools, row.groupId, row.batchId)
              const verfuegbar = pool?.verfuegbar ?? 0
              const overAllocated = row.anzahl > verfuegbar

              return (
                <Card
                  key={`alloc-${index}`}
                  className={`p-5 border-2 transition-all shadow-sm hover:shadow-md ${
                    overAllocated
                      ? "border-amber-400 hover:border-amber-500"
                      : "hover:border-wristlink-cyan/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Leuchtgruppe · Charge {index + 1}
                          </Label>
                          <Select
                            value={`${row.groupId}:${row.batchId}`}
                            onValueChange={(value) => {
                              const [g, b] = value.split(":").map(Number)
                              const p = getPool(bandBatchPools, g, b)
                              updateRow(index, {
                                groupId: g,
                                batchId: b,
                                groupName: p?.groupName || "",
                                batchCode: p?.batchCode || "",
                              })
                            }}
                            disabled={loading}
                          >
                            <SelectTrigger className="h-11 border-2 hover:border-wristlink-cyan/50 transition-colors">
                              <SelectValue placeholder="Gruppe · Charge" />
                            </SelectTrigger>
                            <SelectContent>
                              {bandBatchPools.map((p) => (
                                <SelectItem
                                  key={`${p.groupId}-${p.batchId}`}
                                  value={`${p.groupId}:${p.batchId}`}
                                >
                                  {poolLabel(p.groupId, p.batchId)} (frei {p.verfuegbar})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Anzahl Bänder
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={row.anzahl}
                            onChange={(e) =>
                              updateRow(index, { anzahl: Number(e.target.value) || 0 })
                            }
                            disabled={loading}
                            className="h-11 border-2 hover:border-wristlink-cyan/50 transition-colors"
                          />
                        </div>
                      </div>

                      {pool && (
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Verfügbar
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  verfuegbar >= row.anzahl
                                    ? "text-green-600 dark:text-green-500"
                                    : "text-red-600 dark:text-red-500"
                                }`}
                              >
                                {verfuegbar} Stück
                              </span>
                            </div>
                            {pool.inVermietung > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-amber-600 dark:text-amber-500">
                                  In Vermietung
                                </span>
                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">
                                  {pool.inVermietung} Stück
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Gesamt
                              </span>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {pool.gesamtsumme} Stück
                              </span>
                            </div>
                            {overAllocated && (
                              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium pt-1">
                                Zu wenig Bestand für diese Menge
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={loading}
                        className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>

        <p
          className={`text-sm ${sumOk ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"}`}
        >
          Summe: <span className="font-mono">{assignedTotal}</span> / {requiredMenge}
        </p>
      </div>

      {needsBase && (
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-wristlink-purple" />
            Basis-Station <span className="text-destructive">*</span>
          </Label>

          {stationInfo && stationLabel && (
            <p className="text-xs text-muted-foreground">
              {stationLabel} · {modusAnzeige(stationInfo.stationModus)}
              {stationInfo.station === "pro" && stationInfo.gruppen > 0
                ? ` · ${stationInfo.gruppen} Gruppe(n)`
                : ""}
            </p>
          )}

          {availableBases.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Keine passenden Basis-Stationen im Bestand — bitte unter Admin pflegen.
            </p>
          ) : (
            <Card className="p-5 border-2 border-wristlink-purple/20 hover:border-wristlink-purple/30 transition-all shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Basis-Station
                    </Label>
                    <Select value={baseId} onValueChange={setBaseId} disabled={loading}>
                      <SelectTrigger className="h-11 border-2 hover:border-wristlink-purple/50 transition-colors">
                        <SelectValue placeholder="Basis wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBases.map((base) => (
                          <SelectItem key={base.id} value={String(base.id)}>
                            {base.bezeichnung}
                            {base.seriennummer ? ` · SN ${base.seriennummer}` : ""} (
                            {base.hersteller}, frei {base.verfuegbar})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Anzahl Basen
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={baseAnzahl}
                      onChange={(e) => setBaseAnzahl(e.target.value)}
                      disabled={loading}
                      className="h-11 border-2 hover:border-wristlink-purple/50 transition-colors"
                    />
                  </div>
                </div>

                {selectedBase && (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Verfügbar
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            selectedBase.verfuegbar >= Number(baseAnzahl)
                              ? "text-green-600 dark:text-green-500"
                              : "text-red-600 dark:text-red-500"
                          }`}
                        >
                          {selectedBase.verfuegbar} Stück
                        </span>
                      </div>
                      {selectedBase.seriennummer && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Seriennummer
                          </span>
                          <span className="text-sm font-mono font-semibold">
                            {selectedBase.seriennummer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="submit"
          disabled={
            loading ||
            !sumOk ||
            rows.length === 0 ||
            (needsBase && (availableBases.length === 0 || !baseId))
          }
          size="lg"
          className="min-w-[240px] h-12 bg-gradient-to-r from-wristlink-cyan to-wristlink-purple hover:from-wristlink-cyan/90 hover:to-wristlink-purple/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Wird gespeichert…" : "Zuweisung speichern"}
        </Button>
      </div>
    </form>
  )
}
