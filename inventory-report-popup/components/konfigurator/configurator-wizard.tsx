"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Pencil, AlertCircle } from "lucide-react"
import type { QuoteConfig } from "@/lib/konfigurator/types"
import type { PreisEngineResult } from "@/lib/pricing/types"
import { formatEur } from "@/lib/pricing/preis-engine"
import { displayPositionen, formatPriceSummary } from "@/lib/pricing/display"
import { HOCHZEIT_B2B_NOTICE, PRICING_NOTICE_B2B } from "@/lib/konfigurator/consent"
import {
  STATION_OPTIONS,
  PRODUCT_OPTIONS,
  isProductKonfiguratorAvailable,
  SZENARIO_OPTIONS,
  VARIANTE_OPTIONS,
  LIEFERLAND_INFO,
  GRUPPEN_INFO,
  DRUCK_INFO,
  PROBEDRUCK_OPTIONS,
  TECHNIKER_INFO,
  getProbedruckLabel,
  normalizeProbedruckOption,
  MIN_MENGE,
  MAX_MENGE,
  MENGE_STEP,
  PRODUCT_UNAVAILABLE_HINT,
  type ProbedruckOption,
} from "@/lib/konfigurator/product-info"
import {
  FLEX_RUECKGABE_INFO,
  LIEFERPAKET_OPTIONS,
  applyLieferpaket,
  getLieferpaketLabel,
  getLieferpaketWarning,
  hasAllowedLieferpaket,
  isFlexRueckgabeAllowed,
  isLieferpaketAllowed,
  isTechnikerAllowed,
  normalizeFlexRueckgabe,
  normalizeLieferpaket,
  syncLieferpaketFromEvent,
  type Lieferpaket,
} from "@/lib/konfigurator/lieferpaket"
import { OptionCard } from "@/components/konfigurator/option-card"
import { StickyPriceBox } from "@/components/konfigurator/sticky-price-box"
import { LogoPreview } from "@/components/konfigurator/logo-preview"
import { AvailabilityIndicator } from "@/components/konfigurator/availability-indicator"
import { StationAvailabilityIndicator } from "@/components/konfigurator/station-availability-indicator"
import type { AvailabilityResponse } from "@/lib/actions/n8n-api"
import { formatAvailabilityStandDatum, daysUntilEvent, SHORT_DELIVERY_WARNING_DAYS } from "@/lib/konfigurator/availability-stress"
import type { StationAvailability } from "@/lib/konfigurator/station-availability"
import type { GroupProgrammingAvailability } from "@/lib/konfigurator/group-allocation"
import {
  normalizeGruppenGroessen,
  syncGruppenGroessen,
  maxGroesseForGruppe,
  minGroesseProGruppe,
  gruppenVerteilungGueltig,
  maxGruppenAnzahl,
  GRUPPEN_MIN,
  GRUPPEN_SLIDER_STEP,
} from "@/lib/konfigurator/gruppen-config"
import { MAX_PHYSICAL_GROUPS } from "@/lib/konfigurator/kanalanzahl"

const STEPS = [
  { label: "Event", question: "Was planen Sie?" },
  { label: "Umfang", question: "Wie viele LED-Produkte benötigen Sie?" },
  { label: "Zeitraum", question: "Ist Ihr Wunschtermin verfügbar?" },
  { label: "Steuerung", question: "Wie sollen die Bänder gesteuert werden?" },
  { label: "Extras", question: "Welche Zusatzleistungen wünschen Sie?" },
  { label: "Angebot", question: "Ihre Zusammenfassung" },
] as const

const LAST_STEP = STEPS.length - 1

const DEFAULT_CONFIG: QuoteConfig = {
  kontaktName: "",
  kontaktFirma: "",
  kontaktTelefon: "",
  szenario: "corporate",
  variante: "standard",
  produkt: "armband",
  modus: "miete",
  menge: 300,
  kanalanzahl: 40,
  druck: false,
  probedruckOption: "none",
  probedruck: false,
  flex: false,
  lieferpaket: "regulaer",
  flexRueckgabe: false,
  lieferart: "standard",
  gruppen: 0,
  baenderProGruppe: 50,
  station: "keine",
  stationModus: "miete",
  lieferzeit: "standard",
  land: "DE",
  techniker: false,
  technikerTage: 1,
  technikerAdresse: "",
  technikerKm: undefined,
  gruppenGroessen: [],
}

export function ConfiguratorWizard({
  userEmail,
  initialContact,
}: {
  userEmail: string
  initialContact?: Pick<QuoteConfig, "kontaktName" | "kontaktFirma" | "kontaktTelefon">
}) {
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState<QuoteConfig>({
    ...DEFAULT_CONFIG,
    kontaktName: initialContact?.kontaktName || "",
    kontaktFirma: initialContact?.kontaktFirma || "",
    kontaktTelefon: initialContact?.kontaktTelefon || "",
  })
  const [price, setPrice] = useState<PreisEngineResult | null>(null)
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [stationAvailability, setStationAvailability] = useState<StationAvailability | null>(null)
  const [groupAvailability, setGroupAvailability] = useState<GroupProgrammingAvailability | null>(null)
  const [loadingGroupAvailability, setLoadingGroupAvailability] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedToken, setSubmittedToken] = useState<string | null>(null)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [distanceError, setDistanceError] = useState<string | null>(null)
  const [resolvedKanalanzahl, setResolvedKanalanzahl] = useState<number | null>(null)
  const requestAbortRef = useRef<AbortController | null>(null)

  const updateConfig = (patch: Partial<QuoteConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      if (patch.modus === "miete") {
        next.druck = false
        next.probedruckOption = "none"
        next.probedruck = false
        next.logoId = undefined
      }
      if (patch.produkt && patch.produkt !== "armband") next.variante = "standard"
      if (patch.station === "pro") next.stationModus = "miete"
      if (patch.station === "pro" && (patch.gruppen === undefined ? prev.gruppen : patch.gruppen) <= 0) {
        next.gruppen = GRUPPEN_MIN
      }
      if (patch.station && patch.station !== "pro") {
        next.gruppen = 0
        next.gruppenGroessen = []
      }
      const syncedGroessen = syncGruppenGroessen(prev, patch)
      if (syncedGroessen !== undefined) {
        next.gruppenGroessen = syncedGroessen
      }
      if (patch.lieferpaket !== undefined) {
        const flexRg =
          patch.lieferpaket === "eil"
            ? false
            : (patch.flexRueckgabe ?? next.flexRueckgabe ?? false)
        Object.assign(next, applyLieferpaket(patch.lieferpaket as Lieferpaket, flexRg))
        if (patch.lieferpaket === "eil") {
          next.druck = false
          next.probedruckOption = "none"
          next.probedruck = false
          next.logoId = undefined
        }
      }
      if (patch.probedruckOption !== undefined) {
        next.probedruck = patch.probedruckOption !== "none"
      }
      if (patch.flexRueckgabe !== undefined && normalizeLieferpaket(next) !== "eil") {
        Object.assign(
          next,
          applyLieferpaket(normalizeLieferpaket(next), patch.flexRueckgabe),
        )
      }
      if (patch.lieferzeit === "hyperexpress" || patch.lieferpaket === "eil") {
        next.druck = false
        next.probedruckOption = "none"
        next.probedruck = false
        next.logoId = undefined
      }
      if (patch.druck === false) {
        next.probedruckOption = "none"
        next.probedruck = false
        next.logoId = undefined
      }
      if (patch.gruppen !== undefined && patch.gruppen > 10) {
        next.kanalanzahl = 80
      }
      if (patch.menge !== undefined || patch.gruppen !== undefined) {
        const menge = patch.menge ?? next.menge
        const maxGruppen = maxGruppenAnzahl(menge)
        if (next.gruppen > maxGruppen) {
          next.gruppen = maxGruppen
        }
      }
      if (patch.von !== undefined && patch.von) {
        const tage = daysUntilEvent(patch.von)
        const lieferPatch = syncLieferpaketFromEvent(next, tage)
        Object.assign(next, lieferPatch)
        if (!isTechnikerAllowed(tage)) {
          next.techniker = false
        }
      }
      if (patch.druck !== undefined || patch.modus !== undefined) {
        const von = patch.von ?? next.von
        if (von) {
          const tage = daysUntilEvent(von)
          const lieferPatch = syncLieferpaketFromEvent(next, tage)
          Object.assign(next, lieferPatch)
        }
      }
      if (patch.techniker === false) {
        next.technikerTage = 1
      }
      return next
    })
  }

  const stationModus = config.station === "pro" ? "miete" : config.stationModus

  async function berechneEntfernung() {
    const adresse = config.technikerAdresse?.trim()
    if (!adresse) {
      setDistanceError("Bitte Eventadresse eingeben")
      return
    }
    setDistanceLoading(true)
    setDistanceError(null)
    try {
      const res = await fetch("/api/konfigurator/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adresse }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDistanceError(data.error || "Entfernung konnte nicht berechnet werden")
        return
      }
      updateConfig({ technikerKm: data.km, technikerAdresse: data.displayName || adresse })
    } catch {
      setDistanceError("Netzwerkfehler bei Entfernungsberechnung")
    } finally {
      setDistanceLoading(false)
    }
  }

  const fetchPrice = useCallback(async (cfg: QuoteConfig, signal?: AbortSignal) => {
    setLoadingPrice(true)
    try {
      const res = await fetch("/api/konfigurator/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "price", config: cfg }),
        signal,
      })
      if (signal?.aborted) return
      const data = await res.json()
      applyKanalanzahlFromResponse(data)
      setPrice(data)
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        throw error
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingPrice(false)
      }
    }
  }, [])

  function applyKanalanzahlFromResponse(data: { kanalanzahl?: number }) {
    if (data.kanalanzahl === 40 || data.kanalanzahl === 80) {
      setResolvedKanalanzahl(data.kanalanzahl)
    }
  }

  const fetchAvailability = useCallback(async (cfg: QuoteConfig, signal?: AbortSignal) => {
    if (!cfg.von) {
      setAvailability(null)
      return
    }
    setLoadingAvailability(true)
    try {
      const res = await fetch("/api/konfigurator/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "availability", config: cfg }),
        signal,
      })
      if (signal?.aborted) return
      const data = await res.json()
      applyKanalanzahlFromResponse(data)
      setAvailability(data)
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        throw error
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingAvailability(false)
      }
    }
  }, [])

  const fetchStationAvailability = useCallback(async (cfg: QuoteConfig, signal?: AbortSignal) => {
    if (cfg.station === "keine") {
      setStationAvailability(null)
      return
    }
    try {
      const res = await fetch("/api/konfigurator/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "station-availability",
          config: {
            ...cfg,
            stationModus: cfg.station === "pro" ? "miete" : cfg.stationModus,
          },
        }),
        signal,
      })
      if (signal?.aborted) return
      const data = await res.json()
      applyKanalanzahlFromResponse(data)
      setStationAvailability(data)
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        throw error
      }
    }
  }, [])

  const fetchGroupAvailability = useCallback(async (cfg: QuoteConfig, signal?: AbortSignal) => {
    if (!cfg.von || cfg.gruppen <= 0 || cfg.station !== "pro") {
      setGroupAvailability(null)
      return
    }
    setLoadingGroupAvailability(true)
    try {
      const res = await fetch("/api/konfigurator/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "group-availability", config: cfg }),
        signal,
      })
      if (signal?.aborted) return
      const data = await res.json()
      applyKanalanzahlFromResponse(data)
      setGroupAvailability(data)
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        throw error
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingGroupAvailability(false)
      }
    }
  }, [])

  async function handleLogoUpload(file: File) {
    setLogoUploading(true)
    setLogoError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/konfigurator/logo", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setLogoError(data.error || "Upload fehlgeschlagen")
        return
      }
      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
      updateConfig({ logoId: data.logoId })
      setLogoPreviewUrl(`/api/konfigurator/logo/${data.logoId}`)
    } catch {
      setLogoError("Netzwerkfehler beim Upload")
    } finally {
      setLogoUploading(false)
    }
  }

  useEffect(() => {
    if (!config.von) return
    const tage = daysUntilEvent(config.von)
    const lieferPatch = syncLieferpaketFromEvent(config, tage)
    const patch: Partial<QuoteConfig> = { ...lieferPatch }
    if (!isTechnikerAllowed(tage) && config.techniker) {
      patch.techniker = false
    }
    if (Object.keys(patch).length === 0) return
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [config.von, config.lieferpaket, config.flexRueckgabe, config.druck, config.techniker])

  const lieferpaket = normalizeLieferpaket(config)
  const flexRueckgabe = normalizeFlexRueckgabe(config)
  const probedruckOption = normalizeProbedruckOption(config)

  useEffect(() => {
    if (config.logoId && !logoPreviewUrl) {
      setLogoPreviewUrl(`/api/konfigurator/logo/${config.logoId}`)
    }
    if (!config.logoId && logoPreviewUrl) {
      setLogoPreviewUrl(null)
    }
  }, [config.logoId, logoPreviewUrl])

  const requestConfig = useMemo<QuoteConfig>(
    () => ({
      ...DEFAULT_CONFIG,
      ...config,
      gruppenGroessen: normalizeGruppenGroessen(config).slice(0, config.gruppen),
    }),
    [
      config.produkt,
      config.modus,
      config.menge,
      config.kanalanzahl,
      config.von,
      config.bis,
      config.station,
      config.stationModus,
      config.variante,
      config.druck,
      config.probedruckOption,
      config.flex,
      config.lieferpaket,
      config.flexRueckgabe,
      config.lieferzeit,
      config.lieferart,
      config.gruppen,
      config.gruppenGroessen,
      config.techniker,
      config.technikerTage,
      config.technikerKm,
    ],
  )

  useEffect(() => {
    requestAbortRef.current?.abort()
    const controller = new AbortController()
    requestAbortRef.current = controller
    const timer = window.setTimeout(() => {
      void fetchPrice(requestConfig, controller.signal)
      void fetchAvailability(requestConfig, controller.signal)
      void fetchStationAvailability(requestConfig, controller.signal)
      void fetchGroupAvailability(requestConfig, controller.signal)
    }, 400)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [
    requestConfig,
    fetchPrice,
    fetchAvailability,
    fetchStationAvailability,
    fetchGroupAvailability,
  ])

  const gruppenGroessen = normalizeGruppenGroessen(config)
  const gruppenGesamt = gruppenGroessen.reduce((sum, n) => sum + n, 0)
  const maxGruppen = maxGruppenAnzahl(config.menge)
  const tageBisEvent = config.von ? daysUntilEvent(config.von) : null
  const lieferungCtx = { hasDruck: config.modus === "kauf" && config.druck }
  const kurzeLieferzeit =
    tageBisEvent !== null && tageBisEvent >= 0 && tageBisEvent < SHORT_DELIVERY_WARNING_DAYS
  const lieferpaketWarning = getLieferpaketWarning(tageBisEvent, lieferungCtx)

  function updateGruppeGroesse(index: number, value: number) {
    const next = [...gruppenGroessen]
    const min = minGroesseProGruppe(config.menge, config.gruppen)
    const max = maxGroesseForGruppe(next, index, config.menge)
    next[index] = Math.min(max, Math.max(min, value))
    updateConfig({ gruppenGroessen: next })
  }

  const canNext = () => {
    if (step === 0) {
      return (
        Boolean(config.kontaktName?.trim()) &&
        Boolean(config.kontaktFirma?.trim()) &&
        Boolean(config.kontaktTelefon?.trim()) &&
        Boolean(config.szenario) &&
        Boolean(config.von) &&
        Boolean(config.technikerAdresse?.trim())
      )
    }
    if (step === 1) {
      if (config.menge % MENGE_STEP !== 0) return false
      if (config.modus === "kauf" && config.druck && !config.logoId) return false
      return true
    }
    if (step === 2) {
      if (!config.von) return false
      if (availability && !availability.verfuegbar) return false
      return true
    }
    if (step === 3) {
      if (config.station === "pro" && config.gruppen < GRUPPEN_MIN) return false
      if (config.gruppen > 0 && config.station !== "pro") return false
      if (config.station === "pro" && !gruppenVerteilungGueltig(gruppenGroessen, config.menge)) {
        return false
      }
      if (
        config.station !== "keine" &&
        stationAvailability &&
        !stationAvailability.verfuegbar
      ) {
        return false
      }
      if (config.gruppen > 0 && groupAvailability && !groupAvailability.verfuegbar) {
        return false
      }
      return true
    }
    if (step === 4) {
      if (!hasAllowedLieferpaket(tageBisEvent, lieferungCtx)) return false
      if (!isLieferpaketAllowed(lieferpaket, tageBisEvent, lieferungCtx)) return false
      if (flexRueckgabe && !isFlexRueckgabeAllowed(tageBisEvent, lieferpaket)) return false
      if (config.techniker) {
        if (!isTechnikerAllowed(tageBisEvent)) return false
        if (!config.technikerTage || config.technikerTage < 1) return false
        if (!config.technikerAdresse?.trim()) return false
        if (config.technikerKm === undefined || config.technikerKm < 0) return false
      }
      return true
    }
    return true
  }

  async function handleSubmit() {
    if (!price || !price.gueltig) {
      setError("Preis konnte nicht berechnet werden")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/konfigurator/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler beim Absenden")
        return
      }
      setSubmittedToken(data.publicToken)
    } catch {
      setError("Netzwerkfehler")
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedToken) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-6 w-6" />
            Anfrage eingegangen
          </CardTitle>
          <CardDescription>
            Vielen Dank! Wir prüfen Ihr Angebot und melden uns per E-Mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href={`/angebot/${submittedToken}`}>Anfrage-Status ansehen</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const availabilityStand = availability?.standDatum
    ? formatAvailabilityStandDatum(availability.standDatum)
    : null

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground">Angemeldet als {userEmail}</p>
        <div className="flex flex-wrap gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground border-primary"
                  : i < step
                    ? "bg-secondary text-secondary-foreground border-transparent cursor-pointer hover:opacity-80"
                    : "bg-transparent text-muted-foreground border-border"
              }`}
            >
              {i + 1}. {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6 lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{STEPS[step].question}</CardTitle>
            <CardDescription>
              Schritt {step + 1} von {STEPS.length} · {STEPS[step].label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Schritt 0: Event-Szenario */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="space-y-4 rounded-lg border p-4">
                  <p className="text-sm font-medium">Ihre Kontaktdaten</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="kontakt-name">Ansprechpartner</Label>
                      <Input
                        id="kontakt-name"
                        placeholder="Vor- und Nachname"
                        value={config.kontaktName || ""}
                        onChange={(e) => updateConfig({ kontaktName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kontakt-firma">Firma</Label>
                      <Input
                        id="kontakt-firma"
                        placeholder="Firmenname"
                        value={config.kontaktFirma || ""}
                        onChange={(e) => updateConfig({ kontaktFirma: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kontakt-telefon">Telefon</Label>
                      <Input
                        id="kontakt-telefon"
                        type="tel"
                        placeholder="+49 …"
                        value={config.kontaktTelefon || ""}
                        onChange={(e) => updateConfig({ kontaktTelefon: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kontakt-email">E-Mail</Label>
                      <Input
                        id="kontakt-email"
                        type="email"
                        value={userEmail}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {SZENARIO_OPTIONS.map((s) => (
                    <OptionCard
                      key={s.value}
                      selected={config.szenario === s.value}
                      onClick={() => updateConfig({ szenario: s.value })}
                      title={s.label}
                      description={s.hint}
                    />
                  ))}
                </div>

                {config.szenario === "hochzeit" && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>{HOCHZEIT_B2B_NOTICE}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4 rounded-lg border p-4">
                  <p className="text-sm font-medium">Event-Details</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="event-adresse">Eventadresse</Label>
                      <div className="flex gap-2">
                        <Input
                          id="event-adresse"
                          placeholder="Straße, PLZ Ort"
                          value={config.technikerAdresse || ""}
                          onChange={(e) => {
                            setDistanceError(null)
                            updateConfig({
                              technikerAdresse: e.target.value,
                              technikerKm: undefined,
                            })
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={distanceLoading}
                          onClick={berechneEntfernung}
                        >
                          {distanceLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "km"
                          )}
                        </Button>
                      </div>
                      {config.technikerKm !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          ca. {config.technikerKm} km ab Wehrheim
                        </p>
                      )}
                      {distanceError && (
                        <p className="text-xs text-destructive">{distanceError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-von">Eventbeginn</Label>
                      <Input
                        id="event-von"
                        type="date"
                        value={config.von || ""}
                        onChange={(e) => updateConfig({ von: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-bis">Eventende</Label>
                      <Input
                        id="event-bis"
                        type="date"
                        value={config.bis || config.von || ""}
                        onChange={(e) => updateConfig({ bis: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Schritt 1: Umfang */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PRODUCT_OPTIONS.map((p) => (
                    <OptionCard
                      key={p.value}
                      selected={config.produkt === p.value}
                      disabled={!p.available}
                      onClick={() => updateConfig({ produkt: p.value })}
                      title={p.label}
                      description={p.description}
                      imageSrc={p.imageSrc}
                      imageAlt={p.label}
                      warning={!p.available ? PRODUCT_UNAVAILABLE_HINT : undefined}
                    />
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionCard
                    selected={config.modus === "miete"}
                    onClick={() => updateConfig({ modus: "miete" })}
                    title="Miete"
                    description="Für Events mit festem Zeitraum. Rückgabe nach dem Event."
                    badge="Empfohlen für Events"
                  />
                  <OptionCard
                    selected={config.modus === "kauf"}
                    onClick={() => updateConfig({ modus: "kauf" })}
                    title="Kauf"
                    description="Eigentum, individueller Logodruck möglich."
                  />
                </div>
                <div className="space-y-3">
                  <Label>Menge: {config.menge} Stück</Label>
                  <Slider
                    min={MIN_MENGE}
                    max={MAX_MENGE}
                    step={MENGE_STEP}
                    value={[config.menge]}
                    onValueChange={([v]) => updateConfig({ menge: v })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {MIN_MENGE.toLocaleString("de-DE")}–{MAX_MENGE.toLocaleString("de-DE")} in {MENGE_STEP}er-Schritten
                  </p>
                </div>

                {config.produkt === "armband" && (
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label>{DRUCK_INFO.title}</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.modus === "miete"
                            ? "Individuelle Bedruckung ist nur beim Kauf möglich."
                            : DRUCK_INFO.summary}
                        </p>
                      </div>
                      <Switch
                        checked={config.druck}
                        disabled={config.modus === "miete"}
                        onCheckedChange={(v) => updateConfig({ druck: v })}
                      />
                    </div>

                    {config.modus === "kauf" && (
                      <div className="pt-2 border-t space-y-4">
                        <LogoPreview
                          logoUrl={logoPreviewUrl}
                          uploadEnabled={config.druck}
                          onFileSelect={handleLogoUpload}
                          uploading={logoUploading}
                          uploadError={logoError}
                        />

                        {config.druck && (
                          <div className="space-y-3">
                            <Label>Probedruck (optional)</Label>
                            <div className="grid gap-3 sm:grid-cols-3">
                              {PROBEDRUCK_OPTIONS.map((option) => (
                                <OptionCard
                                  key={option.value}
                                  selected={probedruckOption === option.value}
                                  onClick={() =>
                                    updateConfig({
                                      probedruckOption: option.value as ProbedruckOption,
                                    })
                                  }
                                  title={option.label}
                                  description={option.description}
                                  priceHint={
                                    option.preisNetto > 0
                                      ? `+${formatEur(option.preisNetto)} netto`
                                      : "Kein Aufpreis"
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Schritt 2: Zeitraum */}
            {step === 2 && (
              <div className="space-y-4">
                {config.von && (
                  <p className="text-sm rounded-lg border bg-muted/30 p-4">
                    Eventzeitraum: <strong>{config.von}</strong>
                    {config.bis && config.bis !== config.von ? (
                      <>
                        {" "}
                        – <strong>{config.bis}</strong>
                      </>
                    ) : null}
                    {config.technikerAdresse ? (
                      <>
                        <br />
                        Ort: <strong>{config.technikerAdresse}</strong>
                      </>
                    ) : null}
                  </p>
                )}
                <AvailabilityIndicator availability={availability} loading={loadingAvailability} />

                {!availability?.verfuegbar && availability && (
                  <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    Für Ihren Wunschtermin ist die Verfügbarkeit voraussichtlich nicht ausreichend.
                  </p>
                )}

                {kurzeLieferzeit && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      Achtung: Noch {tageBisEvent} Tag{tageBisEvent === 1 ? "" : "e"} bis zum
                      Event. Wir müssen prüfen, ob eine Lieferung in der kurzen Zeit möglich ist.
                    </AlertDescription>
                  </Alert>
                )}

                {config.station !== "keine" && (
                  <StationAvailabilityIndicator
                    station={config.station}
                    availability={stationAvailability}
                  />
                )}
              </div>
            )}

            {/* Schritt 3: Steuerung */}
            {step === 3 && (
              <div className="space-y-6">
                {config.produkt === "armband" && (
                  <div className="space-y-3">
                    <Label>Armband-Variante</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {VARIANTE_OPTIONS.map((v) => (
                        <OptionCard
                          key={v.value}
                          selected={config.variante === v.value}
                          onClick={() => updateConfig({ variante: v.value })}
                          title={v.label}
                          description={v.description}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Basis-Station / Fernsteuerung</Label>
                  <div className="grid gap-3">
                    {STATION_OPTIONS.map((s) => (
                      <OptionCard
                        key={s.value}
                        selected={config.station === s.value}
                        onClick={() =>
                          updateConfig({
                            station: s.value,
                            stationModus:
                              s.value === "pro" ? "miete" : config.stationModus || config.modus,
                          })
                        }
                        title={s.label}
                        description={s.description}
                        priceHint={
                          s.value !== "keine"
                            ? `ab ${s.value === "pro" ? "649" : stationModus === "kauf" ? "399" : "250"} EUR netto`
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>

                {(config.station === "eco" || config.station === "pro") && (
                  <div className="space-y-2">
                    <Label>
                      {config.station === "eco" ? "ECO Handcontroller" : "PRO Basis-Station"}:
                      Kaufen oder Mieten?
                    </Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <OptionCard
                        selected={stationModus === "kauf"}
                        onClick={() => updateConfig({ stationModus: "kauf" })}
                        title="Kaufen"
                        description={
                          config.station === "pro"
                            ? "Nicht verfügbar – PRO nur zur Miete"
                            : "Unabhängig vom Produktmodus"
                        }
                        priceHint={config.station === "eco" ? "399 EUR netto" : undefined}
                        disabled={config.station === "pro"}
                      />
                      <OptionCard
                        selected={stationModus === "miete"}
                        onClick={() => updateConfig({ stationModus: "miete" })}
                        title="Mieten"
                        description="Unabhängig vom Produktmodus"
                        priceHint={
                          config.station === "pro" ? "649 EUR netto" : "250 EUR netto"
                        }
                      />
                    </div>
                  </div>
                )}

                {(config.station === "eco" || config.station === "pro") && (
                  <StationAvailabilityIndicator
                    station={config.station}
                    availability={stationAvailability}
                  />
                )}

                {config.station === "pro" && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="space-y-3">
                      <Label>
                        {GRUPPEN_INFO.title}: {config.gruppen} Gruppe{config.gruppen === 1 ? "" : "n"}
                      </Label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {GRUPPEN_INFO.description}
                      </p>
                      <Slider
                        min={GRUPPEN_MIN}
                        max={maxGruppen}
                        step={1}
                        value={[Math.min(config.gruppen, maxGruppen)]}
                        onValueChange={([v]) => updateConfig({ gruppen: v })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Je Gruppe {GRUPPEN_INFO.preisProGruppeNetto} EUR netto · max.{" "}
                        {MAX_PHYSICAL_GROUPS} physische Lagergruppen gesamt
                        {maxGruppen < 20
                          ? ` · bei ${config.menge} Bändern max. ${maxGruppen} Gruppen (je min. ${GRUPPEN_SLIDER_STEP} Stück)`
                          : ""}
                      </p>
                    </div>

                    {config.gruppen > 0 && (
                      <div className="space-y-4 pt-2 border-t">
                        {gruppenGroessen.map((groesse, index) => {
                          const min = minGroesseProGruppe(config.menge, config.gruppen)
                          const max = maxGroesseForGruppe(gruppenGroessen, index, config.menge)
                          return (
                            <div key={index} className="space-y-2">
                              <Label>
                                Bänder in Gruppe {index + 1}: {groesse} Stück
                              </Label>
                              <Slider
                                min={min}
                                max={Math.max(min, max)}
                                step={GRUPPEN_SLIDER_STEP}
                                value={[groesse]}
                                onValueChange={([v]) => updateGruppeGroesse(index, v)}
                                disabled={max < min}
                              />
                            </div>
                          )
                        })}
                        <p
                          className={`text-xs ${
                            gruppenGesamt > config.menge
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {gruppenGesamt} von {config.menge} Bändern auf {config.gruppen} Gruppe(n)
                          verteilt
                          {gruppenGesamt > config.menge
                            ? " – bitte Verteilung anpassen"
                            : ""}
                        </p>

                        {loadingGroupAvailability ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Gruppen-Verfügbarkeit wird geprüft …
                          </div>
                        ) : groupAvailability ? (
                          <div className="rounded-md border p-3 space-y-2">
                            {groupAvailability.verfuegbar ? (
                              <p className="text-sm text-green-700 font-medium">
                                Gruppenprogrammierung voraussichtlich möglich
                                {groupAvailability.physischeGruppen > 0 &&
                                  ` (über ${groupAvailability.physischeGruppen} physische Lagergruppe${groupAvailability.physischeGruppen === 1 ? "" : "n"})`}
                              </p>
                            ) : (
                              <p className="text-sm text-destructive font-medium">
                                Gruppenprogrammierung voraussichtlich nicht vollständig möglich
                              </p>
                            )}
                            {groupAvailability.hinweis && (
                              <p className="text-xs text-muted-foreground">{groupAvailability.hinweis}</p>
                            )}
                            {groupAvailability.slots.map((slot) => (
                              <p
                                key={slot.slot}
                                className={`text-xs ${
                                  groupAvailability.fehlendeSlots.includes(slot.slot)
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }`}
                              >
                                Gruppe {slot.slot}:{" "}
                                {groupAvailability.fehlendeSlots.includes(slot.slot)
                                  ? "Bestand im Zeitraum nicht ausreichend"
                                  : "voraussichtlich abdeckbar"}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Schritt 4: Extras */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-1">
                  <Label>{LIEFERLAND_INFO.title}</Label>
                  <p className="text-sm font-medium">{LIEFERLAND_INFO.land}</p>
                  <p className="text-xs text-muted-foreground">{LIEFERLAND_INFO.hinweis}</p>
                </div>

                <div className="space-y-3">
                  <Label>Produktion, Lieferung &amp; Logistik</Label>
                  {lieferpaketWarning && (
                    <p className="text-xs text-amber-700">{lieferpaketWarning}</p>
                  )}
                  {config.druck && (
                    <p className="text-xs text-muted-foreground">
                      Bedruckung benötigt mindestens 48 Stunden Vorlauf. Eilauftrag ist daher
                      nicht verfügbar.
                    </p>
                  )}
                  {!hasAllowedLieferpaket(tageBisEvent, lieferungCtx) && (
                    <p className="text-xs text-destructive">
                      Mit dem gewählten Eventtermin ist kein Lieferpaket mehr möglich (mindestens
                      48 Stunden Vorlauf erforderlich). Bitte wählen Sie einen späteren Termin.
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {LIEFERPAKET_OPTIONS.map((p) => {
                      const allowed = isLieferpaketAllowed(p.value, tageBisEvent, lieferungCtx)
                      return (
                        <OptionCard
                          key={p.value}
                          selected={lieferpaket === p.value}
                          disabled={!allowed}
                          onClick={() => updateConfig({ lieferpaket: p.value })}
                          title={p.label}
                          description={p.description}
                          warning={!allowed ? "Zu kurzer Vorlauf bis zum Event" : undefined}
                          priceHint={
                            p.preisNetto > 0
                              ? `+${formatEur(p.preisNetto)} netto`
                              : undefined
                          }
                        />
                      )
                    })}
                  </div>
                </div>

                {lieferpaket !== "eil" && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <Label>{FLEX_RUECKGABE_INFO.label}</Label>
                        <p className="text-xs text-muted-foreground">
                          {FLEX_RUECKGABE_INFO.description}
                        </p>
                        {!isFlexRueckgabeAllowed(tageBisEvent, lieferpaket) && (
                          <p className="text-xs text-amber-700">
                            Bei nur noch {tageBisEvent} Tag{tageBisEvent === 1 ? "" : "en"} bis
                            zum Event nicht verfügbar.
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={flexRueckgabe}
                        disabled={!isFlexRueckgabeAllowed(tageBisEvent, lieferpaket)}
                        onCheckedChange={(v) => updateConfig({ flexRueckgabe: v })}
                      />
                    </div>
                    <p className="text-xs font-medium text-foreground mt-2">
                      +{formatEur(FLEX_RUECKGABE_INFO.preisNetto)} netto
                    </p>
                  </div>
                )}

                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Label>{TECHNIKER_INFO.title}</Label>
                      <p className="text-xs text-muted-foreground">{TECHNIKER_INFO.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Buchbar ab {TECHNIKER_INFO.minVorlaufTage} Tagen Vorlauf.{" "}
                        {formatEur(TECHNIKER_INFO.reiseNetto)} Reisepauschale ·{" "}
                        {formatEur(TECHNIKER_INFO.tagNetto)}/Tag ·{" "}
                        {formatEur(TECHNIKER_INFO.kmNetto)}/km
                      </p>
                      {!isTechnikerAllowed(tageBisEvent) && (
                        <p className="text-xs text-amber-700">
                          Bei nur noch {tageBisEvent} Tag{tageBisEvent === 1 ? "" : "en"} bis zum
                          Event ist ein Techniker-Einsatz nicht mehr buchbar.
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={config.techniker}
                      disabled={!isTechnikerAllowed(tageBisEvent)}
                      onCheckedChange={(v) => updateConfig({ techniker: v })}
                    />
                  </div>
                  {config.techniker && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="techniker-tage">Einsatztage</Label>
                        <Input
                          id="techniker-tage"
                          type="number"
                          min={1}
                          max={14}
                          value={config.technikerTage ?? 1}
                          onChange={(e) =>
                            updateConfig({ technikerTage: Number(e.target.value) })
                          }
                        />
                      </div>
                      {config.technikerKm === undefined ? (
                        <div className="space-y-2">
                          <Label htmlFor="techniker-event-adresse">Eventadresse</Label>
                          <div className="flex gap-2">
                            <Input
                              id="techniker-event-adresse"
                              placeholder="Straße, PLZ Ort"
                              value={config.technikerAdresse || ""}
                              onChange={(e) => {
                                setDistanceError(null)
                                updateConfig({
                                  technikerAdresse: e.target.value,
                                  technikerKm: undefined,
                                })
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={distanceLoading}
                              onClick={berechneEntfernung}
                            >
                              {distanceLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "km"
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Bitte Eventadresse eingeben und Entfernung berechnen (km).
                          </p>
                          {distanceError && (
                            <p className="text-xs text-destructive">{distanceError}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Eventort: {config.technikerAdresse}
                          {" · "}
                          ca. {config.technikerKm} km (
                          {formatEur(config.technikerKm * TECHNIKER_INFO.kmNetto)} netto)
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 ml-1 text-xs"
                            onClick={() => {
                              setDistanceError(null)
                              updateConfig({ technikerKm: undefined })
                            }}
                          >
                            ändern
                          </Button>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schritt 5: Zusammenfassung */}
            {step === LAST_STEP && (
              <div className="space-y-4">
                <SummaryRow
                  label="Kontakt"
                  value={[
                    config.kontaktName,
                    config.kontaktFirma,
                    config.kontaktTelefon,
                    userEmail,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onEdit={() => setStep(0)}
                />
                <SummaryRow
                  label="Event"
                  value={[
                    SZENARIO_OPTIONS.find((s) => s.value === config.szenario)?.label,
                    config.von
                      ? `${config.von}${config.bis && config.bis !== config.von ? ` – ${config.bis}` : ""}`
                      : null,
                    config.technikerAdresse || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onEdit={() => setStep(0)}
                />
                <SummaryRow
                  label="Produkt"
                  value={[
                    `${PRODUCT_OPTIONS.find((p) => p.value === config.produkt)?.label} · ${config.modus} · ${config.menge} Stk.`,
                    config.druck ? "mit Bedruckung" : null,
                    config.logoId ? "Logo hochgeladen" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onEdit={() => setStep(1)}
                />
                {config.von && (
                  <SummaryRow
                    label="Verfügbarkeit"
                    value={
                      availability?.verfuegbar
                        ? `Voraussichtlich verfügbar${availability.langfristig ? " · ausreichend Vorlauf" : ""}`
                        : availability
                          ? "Voraussichtlich nicht verfügbar"
                          : "Wird geprüft"
                    }
                    onEdit={() => setStep(2)}
                  />
                )}
                <SummaryRow
                  label="Steuerung"
                  value={[
                    config.produkt === "armband" && config.variante === "premium"
                      ? "Premium"
                      : config.produkt === "armband"
                        ? "Standard"
                        : null,
                    config.station !== "keine"
                      ? `${config.station} (${stationModus})`
                      : "Nur Knopfsteuerung",
                    config.gruppen > 0
                      ? `${config.gruppen} Gruppen (${gruppenGroessen.map((n, i) => `G${i + 1}: ${n}`).join(", ")})`
                      : null,
                    config.station !== "keine" && stationAvailability
                      ? stationAvailability.verfuegbar
                        ? "Controller voraussichtlich verfügbar"
                        : "Controller voraussichtlich nicht verfügbar"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onEdit={() => setStep(3)}
                />
                <SummaryRow
                  label="Extras"
                  value={[
                    config.druck ? "Bedruckung" : null,
                    getProbedruckLabel(probedruckOption),
                    getLieferpaketLabel(lieferpaket),
                    flexRueckgabe ? "Flex-Rückgabe" : null,
                    config.techniker ? `Techniker ${config.technikerTage}d` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onEdit={() => setStep(4)}
                />

                {loadingPrice ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : price?.gueltig ? (
                  <div className="rounded-lg border p-4 space-y-2 lg:hidden">
                    <p className="text-xs text-muted-foreground mb-2">{PRICING_NOTICE_B2B}</p>
                    {displayPositionen(price.positionen).map((p, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{p.pos}</span>
                        <span>{formatEur(p.summe)} netto</span>
                      </div>
                    ))}
                    {(() => {
                      const summary = formatPriceSummary(price)
                      return (
                        <div className="border-t pt-2 space-y-1 font-medium">
                          <div className="flex justify-between text-sm">
                            <span>Gesamt netto</span>
                            <span>{summary.nettoLabel}</span>
                          </div>
                          <div className="flex justify-between text-lg">
                            <span>Zahlungsbetrag</span>
                            <span>{summary.bruttoLabel}</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : price && !price.gueltig ? (
                  <Alert variant="destructive">
                    <AlertDescription>{price.fehler.join("; ")}</AlertDescription>
                  </Alert>
                ) : null}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting || !price?.gueltig}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Unverbindlich anfragen"
                  )}
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Zurück
              </Button>
              {step < LAST_STEP ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                  Weiter <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="hidden lg:block">
          <StickyPriceBox
            price={price}
            loading={loadingPrice}
            availabilityStand={availabilityStand}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <StickyPriceBox
          price={price}
          loading={loadingPrice}
          compact
          availabilityStand={availabilityStand}
        />
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: string
  onEdit: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium mt-0.5">{value}</p>
      </div>
      <Button type="button" variant="ghost" size="sm" className="shrink-0 h-8" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5 mr-1" />
        Ändern
      </Button>
    </div>
  )
}
