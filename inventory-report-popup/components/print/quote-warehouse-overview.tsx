"use client"

import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"
import { modusAnzeige } from "@/lib/konfigurator/product-info"
import {
  STATION_TYP_LABELS,
  isBaseStationTyp,
} from "@/lib/konfigurator/station-types"
import { A6PrintStyles } from "@/components/print/print-a6-styles"
import { PackingShippingDates } from "@/components/print/packing-shipping-dates"

type QuoteWarehouseOverviewProps = {
  data: PackingSheetData
}

function stationLabel(station: string | null, stationModus: string | null): string {
  if (!station) return "–"
  const name = isBaseStationTyp(station) ? STATION_TYP_LABELS[station] : station
  if (stationModus) {
    return `${name} (${modusAnzeige(stationModus)})`
  }
  return name
}

function bookingRowsDiffer(data: PackingSheetData): boolean {
  const { bookingRows, warehouseRows } = data
  if (bookingRows.length === 0) return false
  if (bookingRows.length !== warehouseRows.length) return true

  return bookingRows.some((row, index) => {
    const warehouse = warehouseRows[index]
    if (!warehouse) return true
    return (
      row.lagerGruppe !== (warehouse.lagerGruppe ?? "") ||
      row.charge !== warehouse.charge ||
      row.anzahl !== warehouse.anzahl
    )
  })
}

function CompactTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <table className="w-full border-collapse text-[9pt]">
      <thead>
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="border border-black px-1 py-0.5 text-left font-bold"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, rowIndex) => (
          <tr key={rowIndex}>
            {cells.map((cell, cellIndex) => (
              <td
                key={`${rowIndex}-${cellIndex}`}
                className={`border border-black px-1 py-0.5 ${
                  cellIndex > 0 && headers[cellIndex]?.toLowerCase().includes("charge")
                    ? "a6-mono"
                    : ""
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function QuoteWarehouseOverview({ data }: QuoteWarehouseOverviewProps) {
  const showBooking = bookingRowsDiffer(data)
  const totalBands = data.warehouseRows.reduce((sum, row) => sum + row.anzahl, 0)

  return (
    <div className="a6-print-root">
      <A6PrintStyles />
      <div className="a6-page">
        <h1 className="text-sm font-black uppercase">Lagerübersicht</h1>
        <p className="mt-1 text-xs font-bold">Auftrag #{data.quoteId}</p>

        <div className="mt-2 space-y-0.5 text-[9pt]">
          <p>
            <span className="font-bold">Kunde:</span> {data.kunde}
          </p>
          {data.eventLabel && (
            <p>
              <span className="font-bold">Event:</span> {data.eventLabel}
              {data.eventDatum ? ` · ${data.eventDatum}` : ""}
            </p>
          )}
          <p>
            <span className="font-bold">Modus:</span> {modusAnzeige(data.modus)} ·{" "}
            <span className="font-bold">Lieferpaket:</span> {data.lieferpaket}
          </p>
          <p>
            <span className="font-bold">Station:</span>{" "}
            {stationLabel(data.station, data.stationModus)}
          </p>
          <p>
            <span className="font-bold">Menge gesamt:</span> {data.menge.toLocaleString("de-DE")}{" "}
            Stk · <span className="font-bold">Gruppen:</span> {data.gruppenAnzahl}
          </p>
          <PackingShippingDates data={data} compact />
        </div>

        <div className="mt-3">
          <h2 className="mb-1 text-[9pt] font-black uppercase">Programmierte Gruppen</h2>
          <CompactTable
            headers={["G", "Anz.", "Lager", "Charge"]}
            rows={data.warehouseRows.map((row) => [
              String(row.slot),
              String(row.anzahl),
              row.lagerGruppe ?? "–",
              row.charge ?? "–",
            ])}
          />
        </div>

        {showBooking && (
          <div className="mt-3">
            <h2 className="mb-1 text-[9pt] font-black uppercase">Lagerzuordnung (Buchung)</h2>
            <CompactTable
              headers={["Lager", "Charge", "Anz."]}
              rows={data.bookingRows.map((row) => [
                row.lagerGruppe,
                row.charge ?? "–",
                String(row.anzahl),
              ])}
            />
          </div>
        )}

        {data.baseRows.length > 0 && (
          <div className="mt-3">
            <h2 className="mb-1 text-[9pt] font-black uppercase">Basen</h2>
            <CompactTable
              headers={["Bezeichnung", "Herst.", "Anz."]}
              rows={data.baseRows.map((row) => [
                row.bezeichnung,
                row.hersteller || "–",
                String(row.anzahl),
              ])}
            />
          </div>
        )}

        <div className="mt-3 border-t border-black pt-2 text-[9pt]">
          <p>
            <span className="font-bold">Summe Bänder:</span> {totalBands.toLocaleString("de-DE")}{" "}
            Stk
          </p>
          <p>
            <span className="font-bold">Druck:</span> {data.druckLabel}
            {data.probedruckLabel ? ` · Probedruck: ${data.probedruckLabel}` : ""}
            {data.hasLogo ? " · Logo vorhanden" : ""}
          </p>
          {data.adresse && (
            <p className="mt-1">
              <span className="font-bold">Adresse:</span> {data.adresse}
            </p>
          )}
          {data.telefon && (
            <p>
              <span className="font-bold">Telefon:</span> {data.telefon}
            </p>
          )}
          {data.fulfillmentStatus && (
            <p>
              <span className="font-bold">Status:</span> {data.fulfillmentStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
