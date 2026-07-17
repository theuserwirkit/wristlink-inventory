"use client"

import { AutoPrint } from "@/components/print/auto-print"
import { formatDate } from "@/lib/utils/date"

export interface InventoryReportRow {
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

export const INVENTORY_REPORT_MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
]

type InventoryReportPrintViewProps = {
  year: number
  month: number
  rows: InventoryReportRow[]
  autoprint?: boolean
}

export function InventoryReportPrintView({
  year,
  month,
  rows,
  autoprint = false,
}: InventoryReportPrintViewProps) {
  const zugangRows = rows.filter((r) => r.booking_type === "ZUGANG")
  const abgangRows = rows.filter((r) => r.booking_type === "VERKAUF")
  const totalZugang = zugangRows.reduce((s, r) => s + (r.anzahl || 0), 0)
  const totalAbgang = abgangRows.reduce((s, r) => s + (r.anzahl || 0), 0)

  const printTitle = `Bestandsveränderung ${INVENTORY_REPORT_MONTH_NAMES[month - 1]} ${year}`

  return (
    <>
      <AutoPrint autoprint={autoprint} />
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="p-4">
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
          <div className="text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">
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
          <div className="text-sm font-semibold text-foreground border-b border-border pb-1 mb-2">
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
    </>
  )
}
