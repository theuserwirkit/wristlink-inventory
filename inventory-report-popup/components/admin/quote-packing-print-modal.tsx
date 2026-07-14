"use client"

import { Package, Printer } from "lucide-react"
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
}

const PRINT_TABS = [
  { value: "labels", label: "Tüten-Labels", path: "labels" },
  { value: "checkliste", label: "Checkliste", path: "checkliste" },
  { value: "uebersicht", label: "Übersicht", path: "uebersicht" },
] as const

function openPrintWindow(quoteId: number, path: string) {
  window.open(
    `/warenverwaltung/auftraege/${quoteId}/druck/${path}?autoprint=1`,
    "_blank",
    "noopener,noreferrer",
  )
}

export function QuotePackingPrintModal({
  quoteId,
  quoteStatus,
  canPrint,
}: QuotePackingPrintModalProps) {
  if (quoteStatus !== "paid") return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={!canPrint}
          title={
            canPrint
              ? undefined
              : "Erst nach Zuweisung von Leuchtgruppen, Chargen und Basis-Station"
          }
        >
          <Package className="h-4 w-4" />
          Lagerunterlagen
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lagerunterlagen drucken
          </DialogTitle>
        </DialogHeader>

        {!canPrint ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Bitte zuerst im Lager-Panel Leuchtgruppen, Chargen und Basis-Station zuweisen.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Thermodrucker A6 (105 × 148 mm), Skalierung 100 %
            </p>

            <Tabs defaultValue="labels">
              <TabsList className="w-full">
                {PRINT_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PRINT_TABS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="space-y-4">
                  <div
                    className="relative mx-auto w-full max-w-[210px] overflow-hidden rounded border bg-white shadow-sm"
                    style={{ aspectRatio: "105 / 148" }}
                  >
                    <iframe
                      src={`/warenverwaltung/auftraege/${quoteId}/druck/${tab.path}`}
                      title={`Vorschau ${tab.label}`}
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>

                  <Button
                    className="w-full flex items-center gap-2"
                    onClick={() => openPrintWindow(quoteId, tab.path)}
                  >
                    <Printer className="h-4 w-4" />
                    Drucken
                  </Button>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
