"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Check,
  Circle,
  Copy,
  Loader2,
  Mail,
  MailX,
  Package,
  RotateCcw,
} from "lucide-react"
import { advanceFulfillmentStep, previewFulfillmentEmail, getFulfillmentTemplateDefaults } from "@/lib/actions/fulfillment"
import {
  FULFILLMENT_STATUS_LABELS,
  getActiveFulfillmentSteps,
  getNextFulfillmentStep,
  isFulfillmentComplete,
} from "@/lib/konfigurator/fulfillment-status"
import { getLieferpaketLabel, normalizeLieferpaket } from "@/lib/konfigurator/lieferpaket"
import type { FulfillmentStatus, QuoteFulfillmentEvent, QuoteRequest } from "@/lib/konfigurator/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

function buildOrderContext(quote: QuoteRequest): string {
  const config = quote.config_json
  const parts: string[] = [
    `${config.menge}× ${config.produkt}`,
    config.modus,
  ]
  if (config.modus === "miete" && config.von) {
    parts.push(`${config.von} – ${config.bis || config.von}`)
  }
  parts.push(config.druck ? "mit Druck" : "ohne Druck")
  parts.push(getLieferpaketLabel(normalizeLieferpaket(config)))
  if (config.szenario) parts.push(config.szenario)
  return parts.join(" · ")
}

function FulfillmentStepper({
  steps,
  current,
}: {
  steps: FulfillmentStatus[]
  current: FulfillmentStatus | null | undefined
}) {
  const currentIdx = current ? steps.indexOf(current) : -1
  const progressValue =
    currentIdx >= 0 ? Math.round(((currentIdx + 1) / steps.length) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Fortschritt: {currentIdx >= 0 ? currentIdx + 1 : 0}/{steps.length}
        </span>
        {current && (
          <span className="font-medium">{FULFILLMENT_STATUS_LABELS[current]}</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressValue}%` }}
        />
      </div>
      <div className="flex items-start gap-0 overflow-x-auto pb-1">
        {steps.map((step, idx) => {
          const done = currentIdx > idx
          const active = current === step
          return (
            <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none">
              <div className="flex min-w-[4.5rem] flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && !done && "border-primary text-primary ring-2 ring-primary/30",
                    !done && !active && "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : active ? <Circle className="h-3 w-3 fill-current" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "max-w-[5.5rem] text-center text-[10px] leading-tight",
                    active && "font-medium text-foreground",
                    !active && "text-muted-foreground",
                  )}
                >
                  {FULFILLMENT_STATUS_LABELS[step]}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-0.5 mt-[-1.25rem] h-0.5 min-w-[0.75rem] flex-1",
                    done ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function QuoteFulfillmentWorkflow({
  quote,
  leadEmail,
  events,
  embedded = false,
}: {
  quote: QuoteRequest
  leadEmail: string
  events: QuoteFulfillmentEvent[]
  embedded?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [trackingNumber, setTrackingNumber] = useState(quote.tracking_number || "")
  const [sendMail, setSendMail] = useState(true)
  const [mailSubject, setMailSubject] = useState("")
  const [mailBody, setMailBody] = useState("")
  const [mailEdited, setMailEdited] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmSendMail, setConfirmSendMail] = useState(true)

  const hasDruck = Boolean(quote.config_json.druck)
  const steps = getActiveFulfillmentSteps(hasDruck)
  const current = quote.fulfillment_status
  const next = getNextFulfillmentStep(current, hasDruck)
  const complete = isFulfillmentComplete(current, hasDruck)

  const loadPreview = useCallback(async () => {
    if (!next) return
    setPreviewLoading(true)
    try {
      const defaults = await getFulfillmentTemplateDefaults(next)
      setSendMail(defaults.sendByDefault)
      const preview = await previewFulfillmentEmail(quote.id, next, {
        comment,
        trackingNumber,
      })
      if (preview && !mailEdited) {
        setMailSubject(preview.subject)
        setMailBody(preview.body)
      }
    } finally {
      setPreviewLoading(false)
    }
  }, [next, comment, trackingNumber, quote.id, mailEdited])

  useEffect(() => {
    if (!next) return
    setMailEdited(false)
    void loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, quote.id])

  useEffect(() => {
    if (!next) return
    const timer = setTimeout(() => {
      void loadPreview()
    }, 400)
    return () => clearTimeout(timer)
  }, [comment, trackingNumber, next, loadPreview])

  if (quote.status !== "paid") return null

  const trackingRequired = next === "versand_beauftragt"
  const trackingMissing = trackingRequired && !trackingNumber.trim()
  const orderContext = buildOrderContext(quote)

  async function handleAdvance() {
    if (!next) return
    setLoading(true)
    setError(null)
    try {
      const result = await advanceFulfillmentStep(quote.id, {
        comment,
        trackingNumber: trackingRequired ? trackingNumber : undefined,
        sendMail: confirmSendMail,
        mailSubject: confirmSendMail ? mailSubject : undefined,
        mailBody: confirmSendMail ? mailBody : undefined,
      })
      if (!result.success) {
        setError(result.error || "Fehler")
        setLoading(false)
        setConfirmOpen(false)
        return
      }
      const stepLabel = FULFILLMENT_STATUS_LABELS[next]
      toast({
        title: `Schritt „${stepLabel}" abgeschlossen`,
        description: confirmSendMail
          ? `Kunden-Mail an ${leadEmail} gesendet.`
          : "Ohne Kunden-Mail fortgefahren.",
      })
      setComment("")
      setConfirmOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindungsfehler – bitte erneut versuchen")
      setConfirmOpen(false)
    }
    setLoading(false)
  }

  function handleResetMail() {
    setMailEdited(false)
    void loadPreview()
  }

  async function copyTracking() {
    if (!trackingNumber.trim()) return
    await navigator.clipboard.writeText(trackingNumber.trim())
    toast({ title: "Kopiert", description: "Tracking-Nummer in Zwischenablage." })
  }

  const workflowBody = (
    <>
      {!embedded && <FulfillmentStepper steps={steps} current={current} />}

      {next ? (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="font-medium">
              Nächster Schritt: {FULFILLMENT_STATUS_LABELS[next as FulfillmentStatus]}
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label>
                Kommentar (optional)
                <span className="ml-1 font-normal text-muted-foreground">
                  — erscheint in der Mail, wenn das Template {"{{kommentar}}"} nutzt
                </span>
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="z. B. voraussichtlicher Versandtermin …"
                rows={2}
              />
            </div>
            {trackingRequired && (
              <div className="space-y-2">
                <Label>Tracking-Nummer *</Label>
                <div className="flex gap-2">
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Sendungsverfolgungsnummer"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void copyTracking()}
                    disabled={!trackingNumber.trim()}
                    title="Kopieren"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="send-mail"
                  checked={sendMail}
                  onCheckedChange={(v) => setSendMail(v === true)}
                />
                <Label htmlFor="send-mail" className="flex cursor-pointer items-center gap-1 font-normal">
                  <Mail className="h-4 w-4" />
                  Kunden-Mail senden
                </Label>
              </div>
              {sendMail && (
                <Accordion type="single" collapsible defaultValue="mail">
                  <AccordionItem value="mail" className="border rounded-md px-3">
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">
                      <span className="flex items-center gap-2">
                        Mail bearbeiten
                        {previewLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {mailEdited && (
                          <span className="text-xs font-normal text-amber-600">angepasst</span>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-4">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResetMail}
                          disabled={previewLoading}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Aus Template laden
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mail-subject">Betreff</Label>
                        <Input
                          id="mail-subject"
                          value={mailSubject}
                          onChange={(e) => {
                            setMailEdited(true)
                            setMailSubject(e.target.value)
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mail-body">Nachricht</Label>
                        <Textarea
                          id="mail-body"
                          value={mailBody}
                          onChange={(e) => {
                            setMailEdited(true)
                            setMailBody(e.target.value)
                          }}
                          rows={8}
                          className="font-sans text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Empfänger: {leadEmail}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setConfirmSendMail(sendMail)
                  setConfirmOpen(true)
                }}
                disabled={loading || trackingMissing || (sendMail && (!mailSubject.trim() || !mailBody.trim()))}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Schritt abschließen: ${FULFILLMENT_STATUS_LABELS[next]}`
                )}
              </Button>
              {sendMail && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setConfirmSendMail(false)
                    setConfirmOpen(true)
                  }}
                  disabled={loading || trackingMissing}
                >
                  Nur Schritt, keine Mail
                </Button>
              )}
            </div>
          </div>
        ) : complete ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div className="space-y-1">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Alle Fulfillment-Schritte abgeschlossen
                </p>
                {quote.tracking_number && (
                  <p className="text-sm text-muted-foreground">
                    Tracking: <span className="font-mono">{quote.tracking_number}</span>
                  </p>
                )}
                {quote.config_json.modus === "miete" && (
                  <p className="text-sm text-muted-foreground">
                    Bei Mietaufträgen: Rückgabe unten erfassen.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Alle Fulfillment-Schritte abgeschlossen.</p>
        )}

        {events.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Historie</h4>
            <ol className="relative space-y-0 border-l border-muted pl-4">
              {[...events].reverse().map((ev) => (
                <li key={ev.id} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[1.3rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                    {ev.mail_sent ? (
                      <Mail className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <MailX className="h-3 w-3 text-muted-foreground" />
                    )}
                  </span>
                  <div className="rounded-md border bg-card p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {FULFILLMENT_STATUS_LABELS[ev.to_status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString("de-DE")}
                      </span>
                    </div>
                    {ev.created_by && (
                      <p className="mt-0.5 text-xs text-muted-foreground">von {ev.created_by}</p>
                    )}
                    {ev.comment && <p className="mt-1 text-muted-foreground">{ev.comment}</p>}
                    {ev.tracking_number && (
                      <p className="mt-1 font-mono text-xs">Tracking: {ev.tracking_number}</p>
                    )}
                    {ev.mail_sent ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                        <Mail className="h-3 w-3" />
                        Mail gesendet{ev.mail_subject ? `: ${ev.mail_subject}` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MailX className="h-3 w-3" />
                        Keine Mail gesendet
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </>
  )

  const dialog = (
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Schritt „{next ? FULFILLMENT_STATUS_LABELS[next] : ""}" abschließen?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {confirmSendMail ? (
                  <>
                    <p>
                      Es wird eine E-Mail an <strong>{leadEmail}</strong> gesendet.
                    </p>
                    {mailSubject && (
                      <p>
                        Betreff: <em>{mailSubject}</em>
                      </p>
                    )}
                  </>
                ) : (
                  <p>Der Schritt wird ohne Kunden-Mail fortgesetzt.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
            <Button
              type="button"
              onClick={() => void handleAdvance()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bestätigen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  )

  if (embedded) {
    return (
      <div className="space-y-6">
        {!hasDruck && (
          <p className="text-xs text-muted-foreground">
            Ohne Druck: Schritt „Bedruckt" entfällt.
          </p>
        )}
        {workflowBody}
        {dialog}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle>Auftragsabwicklung</CardTitle>
          <span className="text-sm text-muted-foreground">{leadEmail}</span>
        </div>
        <p className="text-sm text-muted-foreground">{orderContext}</p>
        {!hasDruck && (
          <p className="text-xs text-muted-foreground">
            Ohne Druck: Schritt „Bedruckt" entfällt.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {workflowBody}
      </CardContent>
      {dialog}
    </Card>
  )
}
