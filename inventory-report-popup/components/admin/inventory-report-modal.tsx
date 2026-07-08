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
import { FileText, Printer, Loader2 } from "lucide-react"

interface ReportRow {
  booking_id: number
  booking_type: "ZUGANG" | "VERKAUF"
  booking_date: string
  datum_ausgabe: string | null
  bemerkung: string | null
  group_name: string | null
  batch_code: string | null
  lieferant: string | null
  anzahl: number
  batch_id: number | null
  group_id: number | null
}

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
]

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function InventoryReportModal() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReportRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const handleLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
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
    if (!printRef.current) return
    const printContents = printRef.current.innerHTML
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Bestandsveränderung ${MONTH_NAMES[month - 1]} ${year}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; padding: 24px; }
    h1 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 11px; color: #555; margin-bottom: 20px; }
    .summary { display: flex; gap: 32px; margin-bottom: 20px; }
    .summary-item { display: flex; flex-direction: column; gap: 2px; }
    .summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
    .summary-value { font-size: 18px; font-weight: 700; }
    .summary-value.zugang { color: #166534; }
    .summary-value.abgang { color: #991b1b; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead tr { background: #f3f4f6; }
    th { text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; border-bottom: 2px solid #d1d5db; font-weight: 600; }
    td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr.zugang td { background: #f0fdf4; }
    tr.abgang td { background: #fef2f2; }
    .type-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-weight: 700; font-size: 10px; }
    .type-badge.zugang { background: #bbf7d0; color: #14532d; }
    .type-badge.abgang { background: #fecaca; color: #7f1d1d; }
    .section-header { font-size: 12px; font-weight: 700; padding: 8px 0 4px; margin-top: 12px; border-bottom: 1px solid #9ca3af; color: #374151; }
    .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    @media print {
      body { padding: 10mm; }
    }
  </style>
</head>
<body>
  ${printContents}
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`)
    win.document.close()
  }, [month, year])

  const zugangRows = data?.filter((r) => r.booking_type === "ZUGANG") ?? []
  const abgangRows = data?.filter((r) => r.booking_type === "VERKAUF") ?? []
  const totalZugang = zugangRows.reduce((s, r) => s + (r.anzahl || 0), 0)
  const totalAbgang = abgangRows.reduce((s, r) => s + (r.anzahl || 0), 0)

  const printTitle = `Bestandsveränderung ${MONTH_NAMES[month - 1]} ${year}`

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
            <div ref={printRef} className="p-4">
              <h1 className="text-xl font-bold text-balance">{printTitle}</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Erstellt am {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </p>

              {/* Summary */}
              <div className="flex gap-8 mb-8">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Zugang</span>
                  <span className="text-3xl font-bold text-green-700">+{totalZugang}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Abgang (Verkauf)</span>
                  <span className="text-3xl font-bold text-red-700">-{totalAbgang}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Saldo</span>
                  <span className={`text-3xl font-bold ${totalZugang - totalAbgang >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {totalZugang - totalAbgang >= 0 ? "+" : ""}{totalZugang - totalAbgang}
                  </span>
                </div>
              </div>

              {/* Zugang section */}
              <div>
                <div className="section-header text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">
                  Zugange ({zugangRows.length} Buchungen, +{totalZugang} Stk.)
                </div>
                {zugangRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Keine Zugange in diesem Monat.</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Datum</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Gruppe</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Charge</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Lieferant</th>
                        <th className="text-right px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Menge</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Bemerkung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zugangRows.map((row, idx) => (
                        <tr key={`z-${row.booking_id}-${idx}`} className="border-b border-border/50 bg-green-50/50">
                          <td className="px-3 py-2 font-mono text-xs">{formatDate(row.booking_date)}</td>
                          <td className="px-3 py-2">{row.group_name || "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.batch_code || "—"}</td>
                          <td className="px-3 py-2">{row.lieferant || "—"}</td>
                          <td className="px-3 py-2 text-right font-bold text-green-700">+{row.anzahl}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{row.bemerkung || "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-green-100/60 font-semibold">
                        <td colSpan={4} className="px-3 py-2 text-sm">Summe Zugang</td>
                        <td className="px-3 py-2 text-right text-green-700">+{totalZugang}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Abgang section */}
              <div className="mt-8">
                <div className="section-header text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">
                  Abgange / Verkauf ({abgangRows.length} Buchungen, -{totalAbgang} Stk.)
                </div>
                {abgangRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Keine Abgange in diesem Monat.</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Datum</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Gruppe</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Charge</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Lieferant</th>
                        <th className="text-right px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Menge</th>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold border-b border-border">Bemerkung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abgangRows.map((row, idx) => (
                        <tr key={`a-${row.booking_id}-${idx}`} className="border-b border-border/50 bg-red-50/50">
                          <td className="px-3 py-2 font-mono text-xs">{formatDate(row.booking_date)}</td>
                          <td className="px-3 py-2">{row.group_name || "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.batch_code || "—"}</td>
                          <td className="px-3 py-2">{row.lieferant || "—"}</td>
                          <td className="px-3 py-2 text-right font-bold text-red-700">-{row.anzahl}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{row.bemerkung || "—"}</td>
                        </tr>
                      ))}
                      <tr className="bg-red-100/60 font-semibold">
                        <td colSpan={4} className="px-3 py-2 text-sm">Summe Abgang</td>
                        <td className="px-3 py-2 text-right text-red-700">-{totalAbgang}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground">
                Wristlink Bestandsveränderungs-Report &middot; {printTitle} &middot; Druckdatum: {new Date().toLocaleDateString("de-DE")}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
