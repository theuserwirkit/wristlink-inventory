"use client"

import { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getInventoryChangesReport } from "@/lib/actions/admin"
import {
  InventoryReportPrintView,
  INVENTORY_REPORT_MONTH_NAMES as MONTH_NAMES,
  type InventoryReportRow as ReportRow,
} from "@/components/print/inventory-report-print-view"
import { FileText, Printer, Loader2 } from "lucide-react"

export function InventoryReportModal() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReportRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [printUrl, setPrintUrl] = useState<string | null>(null)
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  const handleLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPrintUrl(null)
    const result = await getInventoryChangesReport(year, month)
    setLoading(false)
    if (result.success && result.data) {
      setData(result.data as unknown as ReportRow[])
    } else {
      setError(result.error || "Unbekannter Fehler")
      setData(null)
    }
  }, [year, month])

  const handlePrint = useCallback(() => {
    setPrintUrl(`/admin/inventory-report/druck?year=${year}&month=${month}`)
  }, [month, year])

  const handlePrintFrameLoad = useCallback(() => {
    const frame = printFrameRef.current
    if (!frame?.contentWindow) return
    frame.contentWindow.focus()
    frame.contentWindow.print()
  }, [])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Bestandsveränderungs-Report
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bestandsveränderungs-Report
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-1">
            <Label htmlFor="report-month">Monat</Label>
            <select
              id="report-month"
              value={month}
              onChange={(e) => { setMonth(Number(e.target.value)); setData(null) }}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="report-year">Jahr</Label>
            <Input
              id="report-year"
              type="number"
              value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setData(null) }}
              className="w-24"
              min={2020}
              max={2099}
            />
          </div>
          <Button onClick={handleLoad} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Lade..." : "Report laden"}
          </Button>
          {data && (
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Drucken / Speichern
            </Button>
          )}
        </div>

        {/* Report content */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {error && (
            <p className="text-sm text-destructive p-4">{error}</p>
          )}

          {!data && !loading && !error && (
            <p className="text-sm text-muted-foreground p-4">
              Monat und Jahr auswählen, dann auf "Report laden" klicken.
            </p>
          )}

          {data && (
            <InventoryReportPrintView year={year} month={month} rows={data} />
          )}
        </div>

        {/* Hidden print frame: renders the print route and triggers window.print() once loaded */}
        {printUrl && (
          <iframe
            ref={printFrameRef}
            src={printUrl}
            onLoad={handlePrintFrameLoad}
            title="Druckvorschau Bestandsveränderungsreport"
            style={{ position: "absolute", width: 0, height: 0, border: 0 }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
