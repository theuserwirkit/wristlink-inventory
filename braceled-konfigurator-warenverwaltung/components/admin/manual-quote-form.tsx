"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PRODUCT_OPTIONS,
  SZENARIO_OPTIONS,
  STATION_OPTIONS,
  isProductKonfiguratorAvailable,
} from "@/lib/konfigurator/product-info"
import { maxGruppenAnzahl } from "@/lib/konfigurator/gruppen-config"
import { createManualQuoteRequest } from "@/lib/actions/quotes"
import { toast } from "@/hooks/use-toast"

const PRODUKT_OPTIONS = PRODUCT_OPTIONS.filter((p) => isProductKonfiguratorAvailable(p.value))

export function ManualQuoteForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [email, setEmail] = useState("")
  const [kontaktName, setKontaktName] = useState("")
  const [kontaktFirma, setKontaktFirma] = useState("")
  const [produkt, setProdukt] = useState(PRODUKT_OPTIONS[0]?.value ?? "armband")
  const [modus, setModus] = useState<"miete" | "kauf">("miete")
  const [menge, setMenge] = useState("300")
  const [von, setVon] = useState("")
  const [bis, setBis] = useState("")
  const [station, setStation] = useState("keine")
  const [gruppen, setGruppen] = useState("1")
  const [druck, setDruck] = useState(false)
  const [szenario, setSzenario] = useState("")
  const [notes, setNotes] = useState("")

  const mengeNum = Number(menge)
  const maxGruppen = Number.isFinite(mengeNum) ? maxGruppenAnzahl(mengeNum) : 20

  const stationOptions = useMemo(
    () =>
      STATION_OPTIONS.filter((opt) => {
        if (modus === "kauf" && opt.mieteOnly) return false
        return true
      }),
    [modus],
  )

  useEffect(() => {
    if (modus === "kauf" && station === "pro") {
      setStation("keine")
    }
  }, [modus, station])

  useEffect(() => {
    if (station !== "pro") return
    const parsed = Number(gruppen)
    if (!Number.isFinite(parsed) || parsed < 1) {
      setGruppen("1")
    } else if (parsed > maxGruppen) {
      setGruppen(String(maxGruppen))
    }
  }, [station, gruppen, maxGruppen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    if (!Number.isFinite(mengeNum) || mengeNum <= 0) {
      toast({ title: "Fehler", description: "Bitte gültige Menge eingeben", variant: "destructive" })
      setSubmitting(false)
      return
    }

    if (modus === "kauf" && station === "pro") {
      toast({
        title: "Fehler",
        description: "PRO-Basis-Station ist nur zur Miete verfügbar.",
        variant: "destructive",
      })
      setSubmitting(false)
      return
    }

    const result = await createManualQuoteRequest({
      email,
      kontaktName: kontaktName || undefined,
      kontaktFirma: kontaktFirma || undefined,
      produkt,
      modus,
      menge: mengeNum,
      von: modus === "miete" ? von || undefined : undefined,
      bis: modus === "miete" ? bis || undefined : undefined,
      station,
      gruppen: station === "pro" ? Number(gruppen) : undefined,
      druck,
      szenario: szenario || undefined,
      notes: notes || undefined,
    })

    setSubmitting(false)

    if (!result.success) {
      toast({
        title: "Auftrag konnte nicht erstellt werden",
        description: result.error || "Unbekannter Fehler",
        variant: "destructive",
      })
      return
    }

    toast({ title: "Auftrag erstellt", description: `Anfrage #${result.quoteId} wurde angelegt` })
    router.push(`/warenverwaltung/auftraege/${result.quoteId}`)
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Manuellen Auftrag anlegen</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kunde@firma.de"
                className="border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kontaktName">Name</Label>
              <Input
                id="kontaktName"
                value={kontaktName}
                onChange={(e) => setKontaktName(e.target.value)}
                placeholder="Max Mustermann"
                className="border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kontaktFirma">Firma</Label>
              <Input
                id="kontaktFirma"
                value={kontaktFirma}
                onChange={(e) => setKontaktFirma(e.target.value)}
                placeholder="Firma GmbH"
                className="border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="produkt">Produkt *</Label>
              <Select value={produkt} onValueChange={setProdukt}>
                <SelectTrigger id="produkt" className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUKT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modus">Modus *</Label>
              <Select
                value={modus}
                onValueChange={(v) => setModus(v as "miete" | "kauf")}
              >
                <SelectTrigger id="modus" className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miete">Miete</SelectItem>
                  <SelectItem value="kauf">Kauf</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menge">Menge *</Label>
              <Input
                id="menge"
                type="number"
                required
                min={100}
                step={50}
                value={menge}
                onChange={(e) => setMenge(e.target.value)}
                className="border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="station">Station</Label>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger id="station" className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modus === "kauf" && (
                <p className="text-xs text-muted-foreground">
                  PRO-Basis-Station nur bei Modus „Miete“ verfügbar.
                </p>
              )}
            </div>

            {station === "pro" && (
              <div className="space-y-2">
                <Label htmlFor="gruppen">Gruppen (PRO) *</Label>
                <Input
                  id="gruppen"
                  type="number"
                  required
                  min={1}
                  max={maxGruppen}
                  value={gruppen}
                  onChange={(e) => setGruppen(e.target.value)}
                  className="border-2"
                />
                <p className="text-xs text-muted-foreground">
                  Gruppenprogrammierung: 1–{maxGruppen} Gruppen bei {mengeNum || "…"} Bändern.
                </p>
              </div>
            )}

            {modus === "miete" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="von">Event von *</Label>
                  <Input
                    id="von"
                    type="date"
                    required
                    value={von}
                    onChange={(e) => setVon(e.target.value)}
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bis">Event bis</Label>
                  <Input
                    id="bis"
                    type="date"
                    value={bis}
                    onChange={(e) => setBis(e.target.value)}
                    className="border-2"
                  />
                </div>
              </>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="szenario">Event / Szenario</Label>
              <Select value={szenario || "none"} onValueChange={(v) => setSzenario(v === "none" ? "" : v)}>
                <SelectTrigger id="szenario" className="border-2">
                  <SelectValue placeholder="Optional wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Szenario</SelectItem>
                  {SZENARIO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="druck"
                checked={druck}
                onCheckedChange={(checked) => setDruck(checked === true)}
                disabled={modus === "miete"}
              />
              <Label htmlFor="druck" className="font-normal cursor-pointer">
                Bedruckung (nur Kauf)
              </Label>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Interne Notizen</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optionale Hinweise für das Team"
                rows={3}
                className="border-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Auftrag anlegen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
