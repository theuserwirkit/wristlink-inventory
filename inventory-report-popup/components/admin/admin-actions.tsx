"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createGroup, createBatch, createBase, syncSKUsAndLots, updateSystemSetting } from "@/lib/actions/admin"
import { getBufferSettings } from "@/lib/actions/bookings"
import { BASE_STATION_TYP_OPTIONS } from "@/lib/konfigurator/station-types"
import { KANALANZAHL_OPTIONS } from "@/lib/konfigurator/kanalanzahl"
import {
  formatLeuchtgruppeName,
  formatLeuchtgruppeSlotLabel,
  LEUCHTGRUPPE_SLOTS,
} from "@/lib/konfigurator/leuchtgruppen"
import { Loader2, Plus, RefreshCw, Settings } from "lucide-react"

interface AdminActionsProps {
  batches: Array<{ id: number; code: string; funktionsumfang: string }>
  existingGroups: Array<{ name: string }>
}

export function AdminActions({ batches, existingGroups }: AdminActionsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  const [groupSlot, setGroupSlot] = useState("")
  const [groupKanalanzahl, setGroupKanalanzahl] = useState("")

  const [batchCode, setBatchCode] = useState("")
  const [batchFunktionsumfang, setBatchFunktionsumfang] = useState("")
  const [batchLieferant, setBatchLieferant] = useState("")
  const [batchLieferdatum, setBatchLieferdatum] = useState("")

  const [baseBezeichnung, setBaseBezeichnung] = useState("")
  const [baseHersteller, setBaseHersteller] = useState("")
  const [baseKanalanzahl, setBaseKanalanzahl] = useState("")
  const [baseBatchId, setBaseBatchId] = useState<string>("")
  const [baseFirmwareversion, setBaseFirmwareversion] = useState("")
  const [baseFunktionsumfang, setBaseFunktionsumfang] = useState("")
  const [baseAnzahl, setBaseAnzahl] = useState("1")
  const [baseStationTyp, setBaseStationTyp] = useState("")

  // System settings state
  const [departureBufferDays, setDepartureBufferDays] = useState("6")
  const [returnBufferDays, setReturnBufferDays] = useState("5")
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    getBufferSettings().then((settings) => {
      setDepartureBufferDays(String(settings.departureBufferDays))
      setReturnBufferDays(String(settings.returnBufferDays))
      setSettingsLoaded(true)
    })
  }, [])

  const handleSaveSettings = async () => {
    setSettingsLoading(true)
    const r1 = await updateSystemSetting("departure_buffer_days", departureBufferDays)
    const r2 = await updateSystemSetting("return_buffer_days", returnBufferDays)
    setSettingsLoading(false)
    if (r1.success && r2.success) {
      toast({ title: "Erfolg", description: "Systemeinstellungen gespeichert" })
    } else {
      toast({ title: "Fehler", description: r1.error || r2.error, variant: "destructive" })
    }
  }

  const existingGroupNames = new Set(existingGroups.map((g) => g.name))

  const previewGroupName =
    groupSlot && groupKanalanzahl
      ? formatLeuchtgruppeName(parseInt(groupSlot, 10), parseInt(groupKanalanzahl, 10) as 40 | 80)
      : null

  const isGroupComboTaken = previewGroupName ? existingGroupNames.has(previewGroupName) : false

  const handleCreateGroup = async () => {
    if (!groupSlot || !groupKanalanzahl) return
    setLoading(true)
    const result = await createGroup({
      slot: parseInt(groupSlot, 10),
      kanalanzahl: parseInt(groupKanalanzahl, 10),
    })
    setLoading(false)
    if (result.success) {
      toast({ title: "Erfolg", description: `Leuchtgruppe ${previewGroupName} wurde erstellt` })
      setGroupSlot("")
      setGroupKanalanzahl("")
    } else {
      toast({ title: "Fehler", description: result.error, variant: "destructive" })
    }
  }

  const handleCreateBatch = async () => {
    if (!batchCode.trim() || !batchFunktionsumfang.trim() || !batchLieferdatum) return
    setLoading(true)
    const result = await createBatch({
      code: batchCode.trim(),
      funktionsumfang: batchFunktionsumfang.trim(),
      lieferant: batchLieferant.trim() || undefined,
      lieferdatum: new Date(batchLieferdatum),
    })
    setLoading(false)
    if (result.success) {
      toast({ title: "Erfolg", description: "Charge wurde erstellt" })
      setBatchCode("")
      setBatchFunktionsumfang("")
      setBatchLieferant("")
      setBatchLieferdatum("")
    } else {
      toast({ title: "Fehler", description: result.error, variant: "destructive" })
    }
  }

  const handleCreateBase = async () => {
    if (
      !baseBezeichnung.trim() ||
      !baseHersteller.trim() ||
      !baseKanalanzahl ||
      !baseBatchId ||
      !baseStationTyp
    ) {
      return
    }
    const anzahl = Math.min(Math.max(parseInt(baseAnzahl, 10) || 1, 1), 100)
    setLoading(true)
    const result = await createBase({
      bezeichnung: baseBezeichnung.trim(),
      hersteller: baseHersteller.trim(),
      kanalanzahl: parseInt(baseKanalanzahl),
      stationTyp: baseStationTyp,
      batchId: parseInt(baseBatchId),
      firmwareversion: baseFirmwareversion.trim() || undefined,
      funktionsumfang: baseFunktionsumfang.trim() || undefined,
      count: anzahl,
    })
    setLoading(false)
    if (result.success) {
      const created = result.count ?? 1
      toast({
        title: "Erfolg",
        description:
          created === 1
            ? "Basis wurde erstellt"
            : `${created} Basen wurden erstellt (${baseBezeichnung.trim()} 1–${created})`,
      })
      setBaseBezeichnung("")
      setBaseHersteller("")
      setBaseKanalanzahl("")
      setBaseBatchId("")
      setBaseFirmwareversion("")
      setBaseFunktionsumfang("")
      setBaseAnzahl("1")
      setBaseStationTyp("")
    } else {
      toast({ title: "Fehler", description: result.error, variant: "destructive" })
    }
  }

  const handleSync = async () => {
    setSyncLoading(true)
    const result = await syncSKUsAndLots()
    setSyncLoading(false)
    if (result.success) {
      toast({ title: "Erfolg", description: result.message })
    } else {
      toast({ title: "Fehler", description: result.error, variant: "destructive" })
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sync SKUs & Lots */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            SKUs & Bestände synchronisieren
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Erstellt fehlende SKUs und Inventory Lots für alle Gruppen und Chargen.
            </p>
            <Button onClick={handleSync} disabled={syncLoading} variant="outline" size="lg">
              {syncLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {syncLoading ? "Synchronisiere..." : "SKUs & Bestände synchronisieren"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Systemeinstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Vorlauf und Nachlauf beeinflussen die Verfügbarkeitsberechnung im Kalender, in der Auslastungsansicht und im Buchungsformular.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="departureBuffer">Vorlauf (Werktage vor Ausgabe)</Label>
                <Input
                  id="departureBuffer"
                  type="number"
                  min={0}
                  max={30}
                  value={departureBufferDays}
                  onChange={(e) => setDepartureBufferDays(e.target.value)}
                  disabled={!settingsLoaded}
                />
                <p className="text-xs text-muted-foreground">
                  Artikel verlassen das Lager X Werktage vor dem Ausgabedatum.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="returnBuffer">Nachlauf (Tage nach Rückgabe)</Label>
                <Input
                  id="returnBuffer"
                  type="number"
                  min={0}
                  max={30}
                  value={returnBufferDays}
                  onChange={(e) => setReturnBufferDays(e.target.value)}
                  disabled={!settingsLoaded}
                />
                <p className="text-xs text-muted-foreground">
                  Artikel sind erst X Tage nach Rückgabe wieder verfügbar.
                </p>
              </div>
            </div>
            <Button onClick={handleSaveSettings} disabled={settingsLoading || !settingsLoaded}>
              {settingsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
              {settingsLoading ? "Speichere..." : "Einstellungen speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Group */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Neue Leuchtgruppe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Leuchtgruppen G1–G20 mit 40 CH oder 80 CH. Gespeichert wird die Kombination, z. B.{" "}
              <span className="font-mono">G1_40ch</span>.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="groupSlot">Gruppe (G1–G20)</Label>
              <Select value={groupSlot} onValueChange={setGroupSlot}>
                <SelectTrigger id="groupSlot">
                  <SelectValue placeholder="Gruppe wählen …" />
                </SelectTrigger>
                <SelectContent>
                  {LEUCHTGRUPPE_SLOTS.map((slot) => {
                    const taken40 = existingGroupNames.has(formatLeuchtgruppeName(slot, 40))
                    const taken80 = existingGroupNames.has(formatLeuchtgruppeName(slot, 80))
                    const fullyTaken = taken40 && taken80
                    return (
                      <SelectItem
                        key={slot}
                        value={String(slot)}
                        disabled={fullyTaken}
                      >
                        {formatLeuchtgruppeSlotLabel(slot)}
                        {fullyTaken ? " (belegt)" : taken40 || taken80 ? " (teilweise)" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="groupKanalanzahl">Kanalanzahl (Pflicht)</Label>
              <Select value={groupKanalanzahl} onValueChange={setGroupKanalanzahl}>
                <SelectTrigger id="groupKanalanzahl">
                  <SelectValue placeholder="40 CH oder 80 CH …" />
                </SelectTrigger>
                <SelectContent>
                  {KANALANZAHL_OPTIONS.map((ch) => {
                    const taken =
                      groupSlot &&
                      existingGroupNames.has(
                        formatLeuchtgruppeName(parseInt(groupSlot, 10), ch),
                      )
                    return (
                      <SelectItem key={ch} value={String(ch)} disabled={Boolean(taken)}>
                        {ch} CH Bändchen{taken ? " (existiert bereits)" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {previewGroupName && (
              <p className="text-sm">
                Wird gespeichert als:{" "}
                <span className="font-mono font-medium">{previewGroupName}</span>
                {isGroupComboTaken && (
                  <span className="text-destructive ml-2">– existiert bereits</span>
                )}
              </p>
            )}
            <Button
              onClick={handleCreateGroup}
              disabled={loading || !groupSlot || !groupKanalanzahl || isGroupComboTaken}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Leuchtgruppe erstellen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Batch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Neue Charge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="batchCode">Charge-Code</Label>
              <Input
                id="batchCode"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="z.B. 2025Q1"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="batchFunktionsumfang">Funktionsumfang</Label>
              <Input
                id="batchFunktionsumfang"
                value={batchFunktionsumfang}
                onChange={(e) => setBatchFunktionsumfang(e.target.value)}
                placeholder="z.B. RGB Flash DMX"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="batchLieferant">Lieferant (optional)</Label>
              <Input
                id="batchLieferant"
                value={batchLieferant}
                onChange={(e) => setBatchLieferant(e.target.value)}
                placeholder="z.B. Lieferant GmbH"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="batchLieferdatum">Lieferdatum</Label>
              <Input
                id="batchLieferdatum"
                type="date"
                value={batchLieferdatum}
                onChange={(e) => setBatchLieferdatum(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreateBatch}
              disabled={loading || !batchCode.trim() || !batchFunktionsumfang.trim() || !batchLieferdatum}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Charge erstellen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Neue Basis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseBezeichnung">Bezeichnung</Label>
              <Input
                id="baseBezeichnung"
                value={baseBezeichnung}
                onChange={(e) => setBaseBezeichnung(e.target.value)}
                placeholder="z.B. Base Pro 500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseBatchId">Charge (Pflicht)</Label>
              <Select value={baseBatchId} onValueChange={setBaseBatchId}>
                <SelectTrigger id="baseBatchId">
                  <SelectValue placeholder="Charge auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.code} – {b.funktionsumfang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseStationTyp">Stationstyp (Pflicht)</Label>
              <Select value={baseStationTyp} onValueChange={setBaseStationTyp}>
                <SelectTrigger id="baseStationTyp">
                  <SelectValue placeholder="Stationstyp wählen …" />
                </SelectTrigger>
                <SelectContent>
                  {BASE_STATION_TYP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Steuert, welcher Konfigurator-Option (ECO/PRO) diese Basis zugeordnet wird.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseHersteller">Hersteller</Label>
              <Input
                id="baseHersteller"
                value={baseHersteller}
                onChange={(e) => setBaseHersteller(e.target.value)}
                placeholder="z.B. Wristlink GmbH"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseKanalanzahl">Kanalanzahl (Pflicht)</Label>
              <Select value={baseKanalanzahl} onValueChange={setBaseKanalanzahl}>
                <SelectTrigger id="baseKanalanzahl">
                  <SelectValue placeholder="40 CH oder 80 CH …" />
                </SelectTrigger>
                <SelectContent>
                  {KANALANZAHL_OPTIONS.map((ch) => (
                    <SelectItem key={ch} value={String(ch)}>
                      {ch} CH – passend zu {ch === 40 ? "40CH" : "80CH"} Bändchen
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseFirmwareversion">Firmwareversion (optional)</Label>
              <Input
                id="baseFirmwareversion"
                value={baseFirmwareversion}
                onChange={(e) => setBaseFirmwareversion(e.target.value)}
                placeholder="z.B. v2.1.0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseFunktionsumfang">Funktionsumfang (optional)</Label>
              <Input
                id="baseFunktionsumfang"
                value={baseFunktionsumfang}
                onChange={(e) => setBaseFunktionsumfang(e.target.value)}
                placeholder="z.B. RGB Flash DMX ArtNet"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseAnzahl">Anzahl</Label>
              <Input
                id="baseAnzahl"
                type="number"
                min={1}
                max={100}
                value={baseAnzahl}
                onChange={(e) => setBaseAnzahl(e.target.value)}
                placeholder="z.B. 10"
              />
              <p className="text-xs text-muted-foreground">
                Bei mehreren Stück werden die Bezeichnungen automatisch nummeriert (z. B. „ECO Handcontroller 1“, „ECO Handcontroller 2“).
              </p>
            </div>
            <Button
              onClick={handleCreateBase}
              disabled={
                loading ||
                !baseBezeichnung.trim() ||
                !baseHersteller.trim() ||
                !baseKanalanzahl ||
                !baseBatchId ||
                !baseStationTyp
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {(parseInt(baseAnzahl, 10) || 1) > 1
                ? `${Math.min(Math.max(parseInt(baseAnzahl, 10) || 1, 1), 100)} Basen erstellen`
                : "Basis erstellen"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
