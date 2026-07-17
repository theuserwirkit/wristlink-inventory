"use client"

import { useRef, useState } from "react"
import { Package, Printer, Check, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

type QuotePackingPrintModalProps = {
  quoteId: number
  quoteStatus: string
  canPrint: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  triggerClassName?: string
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "ghost"
  onConfirmPrint?: () => void
  confirmingPrint?: boolean
}

const PRINT_TABS = [
  { value: "labels", label: "Tüten-Labels", path: "labels" },
  { value: "checkliste", label: "Checkliste", path: "checkliste" },
  { value: "uebersicht", label: "Übersicht", path: "uebersicht" },
] as const

function PrintTabPanel({
  quoteId,
  path,
  label,
}: {
  quoteId: number
  path: string
  label: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  function handlePrint() {
    const frame = iframeRef.current
    if (!frame?.contentWindow) return
    frame.contentWindow.focus()
    frame.contentWindow.print()
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-lg border bg-white shadow-md">
        <iframe
          ref={iframeRef}
          src={`/warenverwaltung/auftraege/${quoteId}/druck/${path}`}
          title={`Vorschau ${label}`}
          className="h-[520px] w-full border-0 bg-white"
        />
      </div>
      <Button className="w-full flex items-center gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Drucken
      </Button>
    </div>
  )
}

export function QuotePackingPrintModal({
  quoteId,
  quoteStatus,
  canPrint,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
  triggerClassName,
  triggerLabel = "Lagerunterlagen",
  triggerVariant = "outline",
  onConfirmPrint,
  confirmingPrint = false,
}: QuotePackingPrintModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  if (quoteStatus !== "paid") return null

  const dialogBody = (
    <DialogContent className="flex max-h-[92vh] w-[min(100vw-2rem,42rem)] flex-col gap-4 overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Lagerunterlagen drucken
        </DialogTitle>
      </DialogHeader>

      {!canPrint ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Bitte zuerst Leuchtgruppen, Chargen und Basis-Station zuweisen.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Thermodrucker A6 (105 × 148 mm), Skalierung 100 %. Vorschau und Druck bleiben in
            diesem Fenster.
          </p>

          <Tabs defaultValue="checkliste">
            <TabsList className="w-full">
              {PRINT_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-1 text-xs sm:text-sm">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {PRINT_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                <PrintTabPanel quoteId={quoteId} path={tab.path} label={tab.label} />
              </TabsContent>
            ))}

            {onConfirmPrint && (
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2"
                onClick={onConfirmPrint}
                disabled={confirmingPrint}
              >
                {confirmingPrint ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Druck erledigt – weiter zum Packen
              </Button>
            )}
          </Tabs>
        </>
      )}
    </DialogContent>
  )

  if (!showTrigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogBody}
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerClassName ? "default" : "sm"}
          className={triggerClassName ?? "flex items-center gap-2"}
          disabled={!canPrint}
          title={
            canPrint
              ? undefined
              : "Erst nach Zuweisung von Leuchtgruppen, Chargen und Basis-Station"
          }
        >
          <Package className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      {dialogBody}
    </Dialog>
  )
}
