"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  createBooking,
  getAvailabilityForGroup,
  getBaseAvailability,
  getRentedItemsByGroup,
  getRemainingRentalAmounts,
  getBasesByBatch,
  getAvailabilityForGroupByDateRange,
  getBaseAvailabilityByDateRange,
} from "@/lib/actions/bookings"
import type { BaseRow, BookingType, BookingWithRelations, BookingStatus } from "@/lib/types"
import { Loader2, Plus, Trash2, Package } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"

interface BookingFormProps {
  groups: Array<{ id: number; name: string }>
  batches: Array<{ id: number; code: string; funktionsumfang: string; lieferant?: string | null; lieferdatum?: string | Date }>
  customers: Array<{ id: number; name: string; email: string | null; telefon: string | null }>
  bases: Array<{ id: number; bezeichnung: string; hersteller: string; kanalanzahl: number; firmwareversion: string | null; funktionsumfang: string | null; batch_id?: number | null }>
  onSuccess: () => void
  onBookingCreated?: (bookingId: number) => void
  prefilledBooking?: BookingWithRelations | null
  prefilledBookingType?: BookingType | null
}

export function BookingForm({
  groups,
  batches,
  customers,
  bases,
  onSuccess,
  onBookingCreated,
  prefilledBooking,
  prefilledBookingType,
}: BookingFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [bookingType, setBookingType] = useState<BookingType>(prefilledBookingType || "ZUGANG")
  const [batchId, setBatchId] = useState<number | "">("")
  const [customerName, setCustomerName] = useState<string>("")
  const [datumAusgabe, setDatumAusgabe] = useState<string>("")
  const [datumRueckgabeGeplant, setDatumRueckgabeGeplant] = useState<string>("")
  const [bemerkung, setBemerkung] = useState<string>("")
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("BESTAETIGT")

  const [bookingItems, setBookingItems] = useState<BookingItemInput[]>([
    { id: crypto.randomUUID(), groupId: "", anzahl: 1, anzahlFehlt: 0, availability: null },
  ])

  const [baseItems, setBaseItems] = useState<BaseItemInput[]>([])

  const addBaseItem = () => {
    setBaseItems([...baseItems, { id: crypto.randomUUID(), baseId: "", anzahl: 1, anzahlFehlt: 0, availability: null }])
  }

  const removeBaseItem = (id: string) => {
    setBaseItems(baseItems.filter((item) => item.id !== id))
  }

  const updateBaseItem = async <K extends keyof BaseItemInput>(id: string, field: K, value: BaseItemInput[K]) => {
    setBaseItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))

    if (field === "baseId" && value) {
      const hasBothDates = datumAusgabe && datumRueckgabeGeplant
      let availability
      if (hasBothDates && bookingType === "MIETE_AUSGABE") {
        availability = await getBaseAvailabilityByDateRange(
          value as number, new Date(datumAusgabe), new Date(datumRueckgabeGeplant),
        )
      } else {
        availability = await getBaseAvailability(value as number)
      }
      setBaseItems((items) => items.map((item) => (item.id === id ? { ...item, availability } : item)))
    }
  }

  const [prefilledCustomerName, setPrefilledCustomerName] = useState<string>("")
  const [prefilledBatchId, setPrefilledBatchId] = useState<number | null>(null)
  const [isPrefilledReturn, setIsPrefilledReturn] = useState(false)
  const [currentlyInRental, setCurrentlyInRental] = useState<Map<number, number>>(new Map())
  const [referenceRentalId, setReferenceRentalId] = useState<number | null>(null)
  const [filteredBases, setFilteredBases] = useState(bases)

  // When batchId or prefilledBatchId changes, reload bases filtered for that batch
  useEffect(() => {
    const effectiveBatchId = prefilledBatchId || batchId
    if (effectiveBatchId) {
      getBasesByBatch(effectiveBatchId as number).then((data) => setFilteredBases(data as unknown as BaseRow[]))
    } else {
      setFilteredBases(bases)
    }
  }, [batchId, prefilledBatchId, bases])

  useEffect(() => {
    if (prefilledBookingType) {
      setBookingType(prefilledBookingType)
    }
  }, [prefilledBookingType])

  useEffect(() => {
    if (prefilledBooking && prefilledBooking.booking_type === "MIETE_AUSGABE") {
      setBookingType("MIETE_RUECKGABE")
      setIsPrefilledReturn(true)
      setReferenceRentalId(prefilledBooking.id)

      if (prefilledBooking.customer?.name) {
        setCustomerName(prefilledBooking.customer.name)
        setPrefilledCustomerName(prefilledBooking.customer.name)
      }

      const firstItem = prefilledBooking.items?.[0]
      if (firstItem?.batch_id) {
        setBatchId(firstItem.batch_id)
        setPrefilledBatchId(firstItem.batch_id)
      }

      if (prefilledBooking.items && prefilledBooking.items.length > 0) {
        getRemainingRentalAmounts(prefilledBooking.id).then((remainingAmounts) => {
          const prefilledItems = prefilledBooking.items
            .filter((item): item is typeof item & { group_id: number } => Boolean(item.group_id))
            .map((item) => {
              const remaining = remainingAmounts.get(item.group_id) || item.anzahl
              return {
                id: crypto.randomUUID(),
                groupId: item.group_id,
                anzahl: 0,
                anzahlFehlt: 0,
                availability: null,
                maxRentedAmount: remaining,
              }
            })
          setBookingItems(prefilledItems.length > 0 ? prefilledItems : [{ id: crypto.randomUUID(), groupId: "", anzahl: 0, anzahlFehlt: 0, availability: null }])

          // Pre-fill base items from the original rental
          const prefilledBaseItems = prefilledBooking.items
            .filter((item): item is typeof item & { base_id: number } => Boolean(item.base_id))
            .map((item) => ({
              id: crypto.randomUUID(),
              baseId: item.base_id,
              anzahl: 0,
              anzahlFehlt: 0,
              availability: null,
              maxRentedAmount: item.anzahl_basen || item.anzahl || 0,
              isPrefilledReturn: true,
            }))
          if (prefilledBaseItems.length > 0) {
            setBaseItems(prefilledBaseItems)
          }
        })
      }
    }
  }, [prefilledBooking])

  useEffect(() => {
    const fetchRentedItems = async () => {
      const effectiveBatchId = prefilledBatchId || batchId
      if (bookingType !== "MIETE_RUECKGABE" || !effectiveBatchId) return

      const rentedItems = await getRentedItemsByGroup(effectiveBatchId as number)

      setCurrentlyInRental(rentedItems)

      if (!isPrefilledReturn) {
        setBookingItems((currentItems) => {
          return currentItems.map((item) => {
            if (!item.groupId) return item
            const maxRentedAmount = rentedItems.get(item.groupId as number) || 0
            return { ...item, maxRentedAmount }
          })
        })
      }
    }

    fetchRentedItems()
  }, [batchId, prefilledBatchId, bookingType, isPrefilledReturn])

  useEffect(() => {
    const fetchAvailability = async () => {
      const effectiveBatchId = prefilledBatchId || batchId
      if (!effectiveBatchId) return

      const hasBothDates = datumAusgabe && datumRueckgabeGeplant
      const useRangeAvailability = (bookingType === "MIETE_AUSGABE") && hasBothDates

      const updatedItems = await Promise.all(
        bookingItems.map(async (item) => {
          if (!item.groupId) return item

          if (useRangeAvailability) {
            const availability = await getAvailabilityForGroupByDateRange(
              item.groupId as number,
              effectiveBatchId as number,
              new Date(datumAusgabe),
              new Date(datumRueckgabeGeplant),
            )
            return { ...item, availability }
          } else {
            const availability = await getAvailabilityForGroup(item.groupId as number, effectiveBatchId as number)
            return { ...item, availability }
          }
        }),
      )

      setBookingItems(updatedItems)

      // Also update base items availability
      if (hasBothDates && bookingType === "MIETE_AUSGABE") {
        const updatedBaseItems = await Promise.all(
          baseItems.map(async (item) => {
            if (!item.baseId) return item
            const availability = await getBaseAvailabilityByDateRange(
              item.baseId as number,
              new Date(datumAusgabe),
              new Date(datumRueckgabeGeplant),
            )
            return { ...item, availability }
          }),
        )
        setBaseItems(updatedBaseItems)
      }
    }

    if (bookingType === "VERKAUF" || bookingType === "MIETE_AUSGABE") {
      fetchAvailability()
    }
  }, [batchId, prefilledBatchId, bookingType, datumAusgabe, datumRueckgabeGeplant])

  useEffect(() => {
    if (bookingType === "MIETE_AUSGABE" && batches.length > 0 && !batchId && !prefilledBatchId) {
      // Sort batches by lieferdatum descending and select the newest
      const sortedBatches = [...batches].sort((a, b) => {
        return new Date(b.lieferdatum ?? 0).getTime() - new Date(a.lieferdatum ?? 0).getTime()
      })
        const newestBatch = sortedBatches[0]
        if (newestBatch) {
          setBatchId(newestBatch.id)
        }
    }
  }, [bookingType, batches, batchId, prefilledBatchId])

  const addBookingItem = () => {
    setBookingItems([
      ...bookingItems,
      { id: crypto.randomUUID(), groupId: "", anzahl: 1, anzahlFehlt: 0, availability: null },
    ])
  }

  const removeBookingItem = (id: string) => {
    const remaining = bookingItems.filter((item) => item.id !== id)
    // Allow removing all group items only for ZUGANG (can be base-only)
    if (remaining.length === 0 && bookingType !== "ZUGANG") return
    setBookingItems(remaining.length === 0 ? [] : remaining)
  }

  const updateBookingItem = async <K extends keyof BookingItemInput>(id: string, field: K, value: BookingItemInput[K]) => {
    const updatedItems = bookingItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    setBookingItems(updatedItems)

    if (field === "groupId" && value && batchId) {
      if (bookingType === "VERKAUF" || bookingType === "MIETE_AUSGABE") {
        const hasBothDates = datumAusgabe && datumRueckgabeGeplant
        let availability
        if (hasBothDates && bookingType === "MIETE_AUSGABE") {
          availability = await getAvailabilityForGroupByDateRange(
            value as number, batchId as number,
            new Date(datumAusgabe), new Date(datumRueckgabeGeplant),
          )
        } else {
          availability = await getAvailabilityForGroup(value as number, batchId as number)
        }
        setBookingItems((items) => items.map((item) => (item.id === id ? { ...item, availability } : item)))
      } else if (bookingType === "MIETE_RUECKGABE") {
        const rentedItems = await getRentedItemsByGroup(batchId as number)
        const maxRentedAmount = rentedItems.get(value as number) || 0
        setBookingItems((items) => items.map((item) => (item.id === id ? { ...item, maxRentedAmount } : item)))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    const invalidItems = bookingItems.filter((item) => item.groupId && item.anzahl < 1)
    if (invalidItems.length > 0) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Leuchtgruppen und Anzahlen aus.",
        variant: "destructive",
      })
      return
    }

    const hasGroups = bookingItems.some((item) => item.groupId)
    const hasBases = baseItems.some((item) => item.baseId)
    if (!hasGroups && !hasBases) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie mindestens eine Leuchtgruppe oder eine Basis hinzu.",
        variant: "destructive",
      })
      return
    }

    if (bookingType === "MIETE_RUECKGABE") {
      const invalidReturns = bookingItems.filter(
        (item) => item.maxRentedAmount !== undefined && item.anzahl + item.anzahlFehlt > item.maxRentedAmount,
      )
      if (invalidReturns.length > 0) {
        toast({
          title: "Fehler",
          description: "Die Summe aus funktionierenden und defekten Bändern überschreitet die vermietete Menge.",
          variant: "destructive",
        })
        return
      }
    }

    if (bookingType === "VERKAUF" || bookingType === "MIETE_AUSGABE") {
      const invalidAvailability = bookingItems.filter(
        (item) => item.availability && item.availability.verfuegbar < item.anzahl,
      )
      if (invalidAvailability.length > 0) {
        toast({
          title: "Fehler",
          description: "Die gewünschte Anzahl übersteigt die Verfügbarkeit.",
          variant: "destructive",
        })
        return
      }
    }

    const customerNameToUse =
      bookingType === "MIETE_RUECKGABE" && prefilledCustomerName ? prefilledCustomerName : customerName

    const effectiveBatchId = prefilledBatchId || batchId

    setLoading(true)

    try {
      const result = await createBooking({
        bookingType,
        status: bookingType === "MIETE_AUSGABE" ? bookingStatus : "BESTAETIGT",
        items: bookingItems.filter((item) => item.groupId).map((item) => ({
          groupId: item.groupId as number,
          batchId: effectiveBatchId as number,
          anzahl: item.anzahl,
          anzahlFehlt: item.anzahlFehlt,
        })),
        baseItems: baseItems.filter((item) => item.baseId).map((item) => ({
          baseId: item.baseId as number,
          anzahl: item.anzahl,
          anzahlFehlt: item.anzahlFehlt,
        })),
        customerName: customerNameToUse || undefined,
        datumAusgabe: datumAusgabe ? new Date(datumAusgabe) : undefined,
        datumRueckgabeGeplant: datumRueckgabeGeplant ? new Date(datumRueckgabeGeplant) : undefined,
        datumRueckgabeIst: bookingType === "MIETE_RUECKGABE" ? new Date() : undefined,
        bemerkung: bemerkung || undefined,
        referenceRentalId: referenceRentalId || undefined,
      })

      if (result.success) {
        toast({
          title: "Buchung erfolgreich",
          description: `${bookingItems.length} Leuchtgruppe(n) wurden gebucht.`,
        })

        if (bookingType === "MIETE_AUSGABE" && result.success && "data" in result && result.data) {
          window.open(`/protocol/${result.data.id}`, "_blank")
        }

        if ("data" in result && result.data?.id) {
          onBookingCreated?.(result.data.id)
        }

        onSuccess()
      } else {
        toast({
          title: "Fehler",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating booking:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    const effectiveBatchId = prefilledBatchId || batchId
    const hasGroups = bookingItems.some((item) => item.groupId)
    const hasBases = baseItems.some((item) => item.baseId)

    // Must have at least one group or base
    if (!hasGroups && !hasBases) return false

    // Validate group items that are filled
    if (hasGroups && bookingItems.some((item) => item.groupId && item.anzahl < 1)) return false

    if (bookingType === "ZUGANG" && !effectiveBatchId) return false
    if ((bookingType === "VERKAUF" || bookingType === "MIETE_AUSGABE") && !effectiveBatchId) return false

    if (bookingType === "MIETE_RUECKGABE") {
      for (const item of bookingItems) {
        if (item.maxRentedAmount !== undefined && item.anzahl + item.anzahlFehlt > item.maxRentedAmount) return false
      }
      // Validate prefilled base returns
      for (const item of baseItems) {
        if (item.isPrefilledReturn && item.maxRentedAmount !== undefined) {
          if (item.anzahl + item.anzahlFehlt > item.maxRentedAmount) return false
        }
      }
    }

    if (bookingType === "VERKAUF" || bookingType === "MIETE_AUSGABE") {
      for (const item of bookingItems) {
        if (item.availability && item.availability.verfuegbar < item.anzahl) return false
      }
    }

    return true
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-4">
      {!prefilledBookingType && !prefilledBooking && (
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="bookingType" className="text-sm font-semibold text-foreground">
            Buchungsart *
          </Label>
          <Select value={bookingType} onValueChange={(value) => setBookingType(value as BookingType)}>
            <SelectTrigger id="bookingType" className="h-12 border-2 hover:border-wristlink-cyan/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ZUGANG">📦 Zugang</SelectItem>
              <SelectItem value="MIETE_AUSGABE">📤 Miete - Ausgabe</SelectItem>
              <SelectItem value="MIETE_RUECKGABE">📥 Miete - Rückgabe</SelectItem>
              <SelectItem value="VERKAUF">💰 Verkauf</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(bookingType === "ZUGANG" ||
          bookingType === "VERKAUF" ||
          bookingType === "MIETE_AUSGABE" ||
          bookingType === "MIETE_RUECKGABE") && (
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="batchId" className="text-sm font-semibold text-foreground">
              Liefercharge (Funktionsumfang) *
            </Label>
            <Select
              value={batchId ? batchId.toString() : prefilledBatchId ? prefilledBatchId.toString() : ""}
              onValueChange={(value) => {
                if (isPrefilledReturn) return
                setBatchId(value ? Number.parseInt(value) : "")
              }}
              disabled={isPrefilledReturn}
            >
              <SelectTrigger id="batchId" className="h-12 border-2 hover:border-wristlink-cyan/50 transition-colors">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                {batches.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">Keine Chargen verfügbar</div>
                ) : (
                  batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id.toString()}>
                      📋 {batch.code} - ⚡ {batch.funktionsumfang}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {(bookingType === "VERKAUF" || bookingType === "MIETE_AUSGABE") && (
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="customerName" className="text-sm font-semibold text-foreground">
              Kunde <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Combobox
              value={customerName}
              onValueChange={setCustomerName}
              options={customers.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="Kunde auswählen oder neu eingeben..."
              searchPlaceholder="Kunde suchen..."
              emptyText="Kein Kunde gefunden."
              allowCustom={true}
            />
          </div>
        )}

        {bookingType === "MIETE_AUSGABE" && (
          <div className="flex flex-col gap-2.5 lg:col-span-2">
            <Label className="text-sm font-semibold text-foreground">Status</Label>
            <div className="flex gap-2">
              {(["ANFRAGE", "BESTAETIGT"] as BookingStatus[]).map((s) => {
                const labels: Record<BookingStatus, string> = {
                  ANFRAGE: "Anfrage / Angebot",
                  BESTAETIGT: "Bestatigt",
                }
                const colors: Record<BookingStatus, string> = {
                  ANFRAGE: bookingStatus === s ? "bg-slate-600 text-white border-slate-600" : "border-slate-300 text-slate-600 hover:border-slate-400",
                  BESTAETIGT: bookingStatus === s ? "bg-green-600 text-white border-green-600" : "border-green-300 text-green-700 hover:border-green-400",
                }
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBookingStatus(s)}
                    className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${colors[s]}`}
                  >
                    {labels[s]}
                  </button>
                )
              })}
            </div>
            {bookingStatus === "ANFRAGE" && (
              <p className="text-xs text-muted-foreground">Anfragen werden im Kalender-Forecast als Soft-Reservierung angezeigt.</p>
            )}
          </div>
        )}

        {(bookingType === "MIETE_AUSGABE" || bookingType === "VERKAUF") && (
          <>
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="datumAusgabe" className="text-sm font-semibold text-foreground">
                Ausgabedatum
              </Label>
              <Input
                id="datumAusgabe"
                type="date"
                value={datumAusgabe}
                onChange={(e) => setDatumAusgabe(e.target.value)}
                className="h-12 border-2 hover:border-wristlink-cyan/50 transition-colors"
              />
            </div>

            {bookingType === "MIETE_AUSGABE" && (
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="datumRueckgabeGeplant" className="text-sm font-semibold text-foreground">
                  Rückgabedatum (geplant)
                </Label>
                <Input
                  id="datumRueckgabeGeplant"
                  type="date"
                  value={datumRueckgabeGeplant}
                  onChange={(e) => setDatumRueckgabeGeplant(e.target.value)}
                  className="h-12 border-2 hover:border-wristlink-cyan/50 transition-colors"
                />
              </div>
            )}
          </>
        )}

        {bookingType === "MIETE_RUECKGABE" && prefilledCustomerName && (
          <div className="flex flex-col gap-2.5">
            <Label className="text-sm font-semibold text-foreground">Kunde</Label>
            <div className="h-12 px-3 py-2 border-2 rounded-md bg-muted text-muted-foreground flex items-center">
              {prefilledCustomerName}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-wristlink-cyan" />
              Leuchtgruppen{" "}
              {bookingType === "ZUGANG"
                ? <span className="text-muted-foreground font-normal">(optional)</span>
                : <span className="text-destructive">*</span>
              }
            </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBookingItem}
            className="gap-2 border-2 border-wristlink-cyan/30 hover:border-wristlink-cyan hover:bg-wristlink-cyan/10 transition-all bg-transparent"
          >
            <Plus className="h-4 w-4" />
            Gruppe hinzufügen
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {bookingItems.map((item, index) => {
            const showAvailability =
              (bookingType === "VERKAUF" || bookingType === "MIETE_AUSGABE") && item.availability !== null
            const showRentedAmount = bookingType === "MIETE_RUECKGABE" && item.maxRentedAmount !== undefined
            const currentInRental = item.groupId ? currentlyInRental.get(item.groupId as number) || 0 : 0

            return (
              <Card
                key={item.id}
                className="p-5 border-2 hover:border-wristlink-cyan/30 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Leuchtgruppe {index + 1}
                        </Label>
                        <Select
                          value={item.groupId.toString()}
                          onValueChange={(value) => updateBookingItem(item.id, "groupId", Number.parseInt(value))}
                        >
                          <SelectTrigger className="h-11 border-2 hover:border-wristlink-cyan/50 transition-colors">
                            <SelectValue placeholder="Bitte wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {bookingType === "MIETE_RUECKGABE" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Funktionierend
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={item.anzahl}
                              onChange={(e) => {
                                const value = e.target.value === "" ? 0 : Number(e.target.value)
                                updateBookingItem(item.id, "anzahl", isNaN(value) ? 0 : value)
                              }}
                              className="h-11 border-2 hover:border-wristlink-cyan/50 transition-colors"
                              placeholder="75"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Defekt/Verloren
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={item.anzahlFehlt}
                              onChange={(e) => {
                                const value = e.target.value === "" ? 0 : Number(e.target.value)
                                updateBookingItem(item.id, "anzahlFehlt", isNaN(value) ? 0 : value)
                              }}
                              className="h-11 border-2 hover:border-wristlink-cyan/50 transition-colors"
                              placeholder="25"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Anzahl Bänder
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.anzahl}
                            onChange={(e) => {
                              const value = e.target.value === "" ? 1 : Number(e.target.value)
                              updateBookingItem(item.id, "anzahl", isNaN(value) ? 1 : value)
                            }}
                            className="h-11 border-2 hover:border-wristlink-cyan/50 transition-colors"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      {showAvailability && item.availability && (
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                          <div className="space-y-2.5">
                            {datumAusgabe && datumRueckgabeGeplant && bookingType === "MIETE_AUSGABE" && (
                              <p className="text-[11px] text-muted-foreground font-medium">
                                Verfügbarkeit für {new Date(datumAusgabe).toLocaleDateString("de-DE")} – {new Date(datumRueckgabeGeplant).toLocaleDateString("de-DE")}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Verfügbar</span>
                              <span
                                className={`text-sm font-semibold ${item.availability.verfuegbar >= item.anzahl ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
                              >
                                {item.availability.verfuegbar} Stück
                              </span>
                            </div>
                            {item.availability.inVermietung > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-amber-600 dark:text-amber-500">
                                  In Vermietung
                                </span>
                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">
                                  {item.availability.inVermietung} Stück
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Gesamt</span>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {item.availability.gesamtsumme} Stück
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {showRentedAmount && (
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                Bei dieser Vermietung
                              </span>
                              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                                {item.maxRentedAmount} Stück
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Aktuell vermietet
                              </span>
                              <span
                                className={`text-sm font-semibold ${currentInRental > 0 ? "text-amber-600 dark:text-amber-500" : "text-green-600 dark:text-green-500"}`}
                              >
                                {currentInRental} Stück
                              </span>
                            </div>
                            {item.anzahl + item.anzahlFehlt > item.maxRentedAmount! && (
                              <div className="pt-2 border-t border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-600 dark:text-red-500 font-medium">
                                  ⚠️ Überschreitet Menge!
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(bookingItems.length > 1 || bookingType === "ZUGANG") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBookingItem(item.id)}
                      className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Basen Section */}
      {(bases.length > 0 || filteredBases.length > 0) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-wristlink-purple" />
              Basen{" "}
              {isPrefilledReturn && baseItems.some((b) => b.isPrefilledReturn)
                ? <span className="text-destructive font-normal">*</span>
                : <span className="text-muted-foreground font-normal">(optional)</span>
              }
            </Label>
            {!isPrefilledReturn && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBaseItem}
                className="gap-2 border-2 border-wristlink-purple/30 hover:border-wristlink-purple hover:bg-wristlink-purple/10 transition-all bg-transparent"
              >
                <Plus className="h-4 w-4" />
                Basis hinzufügen
              </Button>
            )}
          </div>

          {baseItems.length > 0 && (
            <div className="flex flex-col gap-3">
              {baseItems.map((item, index) => {
                const showBaseAvailability = !!item.baseId && item.availability !== undefined && item.availability !== null
                const showBaseRented = bookingType === "MIETE_RUECKGABE" && item.maxRentedAmount !== undefined

                return (
                  <Card key={item.id} className="p-5 border-2 border-wristlink-purple/20 hover:border-wristlink-purple/30 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Basis {index + 1}
                            </Label>
                            <Select
                              value={item.baseId.toString()}
                              onValueChange={(value) => updateBaseItem(item.id, "baseId", Number.parseInt(value))}
                              disabled={item.isPrefilledReturn}
                            >
                              <SelectTrigger className="h-11 border-2 hover:border-wristlink-purple/50 transition-colors">
                                <SelectValue placeholder="Basis waehlen" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredBases.map((base) => (
                                  <SelectItem key={base.id} value={base.id.toString()}>
                                    {base.bezeichnung} ({base.hersteller}, {base.kanalanzahl} Kan.)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {bookingType === "MIETE_RUECKGABE" ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Funktionierend
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.anzahl}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? 0 : Number(e.target.value)
                                    updateBaseItem(item.id, "anzahl", isNaN(value) ? 0 : value)
                                  }}
                                  className="h-11 border-2 hover:border-wristlink-purple/50 transition-colors"
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Defekt/Verloren
                                </Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.anzahlFehlt}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? 0 : Number(e.target.value)
                                    updateBaseItem(item.id, "anzahlFehlt", isNaN(value) ? 0 : value)
                                  }}
                                  className="h-11 border-2 hover:border-wristlink-purple/50 transition-colors"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Anzahl Basen
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                value={item.anzahl}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? 1 : Number(e.target.value)
                                  updateBaseItem(item.id, "anzahl", isNaN(value) ? 1 : value)
                                }}
                                className="h-11 border-2 hover:border-wristlink-purple/50 transition-colors"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-3">
                          {showBaseAvailability && item.availability && (
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                              <div className="space-y-2.5">
                                {datumAusgabe && datumRueckgabeGeplant && bookingType === "MIETE_AUSGABE" && (
                                  <p className="text-[11px] text-muted-foreground font-medium">
                                    Verfügbarkeit für {new Date(datumAusgabe).toLocaleDateString("de-DE")} – {new Date(datumRueckgabeGeplant).toLocaleDateString("de-DE")}
                                  </p>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Verfügbar</span>
                                  <span className={`text-sm font-semibold ${item.availability.verfuegbar >= item.anzahl ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                                    {item.availability.verfuegbar} Stück
                                  </span>
                                </div>
                                {item.availability.inVermietung > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-amber-600 dark:text-amber-500">In Vermietung</span>
                                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">
                                      {item.availability.inVermietung} Stück
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Gesamt</span>
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {item.availability.gesamtsumme} Stück
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          {showBaseRented && (
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Bei dieser Vermietung</span>
                                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">{item.maxRentedAmount} Stück</span>
                                </div>
                                {item.anzahl + item.anzahlFehlt > item.maxRentedAmount! && (
                                  <div className="pt-2 border-t border-red-200 dark:border-red-800">
                                    <p className="text-sm text-red-600 dark:text-red-500 font-medium">Überschreitet Menge!</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!item.isPrefilledReturn && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBaseItem(item.id)}
                          className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}



      <div className="flex flex-col gap-2.5">
        <Label htmlFor="bemerkung" className="text-sm font-medium">
          Bemerkung <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="bemerkung"
          type="text"
          value={bemerkung}
          onChange={(e) => setBemerkung(e.target.value)}
          placeholder="Optionale Notiz zur Buchung..."
          className="h-11"
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          type="submit"
          disabled={loading || !isFormValid()}
          size="lg"
          className="min-w-[200px] h-12 bg-gradient-to-r from-wristlink-cyan to-wristlink-purple hover:from-wristlink-cyan/90 hover:to-wristlink-purple/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Wird erstellt..." : "Buchung erstellen"}
        </Button>
      </div>
    </form>
  )
}

interface BookingItemInput {
  id: string
  groupId: number | ""
  anzahl: number
  anzahlFehlt: number
  availability?: { verfuegbar: number; inVermietung: number; gesamtsumme: number } | null
  maxRentedAmount?: number
}

interface BaseItemInput {
  id: string
  baseId: number | ""
  anzahl: number
  anzahlFehlt: number
  availability?: { verfuegbar: number; inVermietung: number; gesamtsumme: number } | null
  maxRentedAmount?: number
  isPrefilledReturn?: boolean
}
