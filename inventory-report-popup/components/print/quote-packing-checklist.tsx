"use client"

import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"
import { modusAnzeige } from "@/lib/konfigurator/product-info"
import { A6PrintStyles } from "@/components/print/print-a6-styles"
import { PackingShippingDates } from "@/components/print/packing-shipping-dates"

type QuotePackingChecklistProps = {
  data: PackingSheetData
}

function ChecklistMeta({ data }: { data: PackingSheetData }) {
  return (
    <div className="mb-4 border-b-2 border-black pb-2">
      <h1 className="text-base font-black uppercase">Pack-Checkliste</h1>
      <p className="mt-1 text-sm font-bold">Auftrag #{data.quoteId}</p>
      <div className="mt-2 space-y-0.5 text-xs">
        <p>
          <span className="font-bold">Kunde:</span> {data.kunde}
        </p>
        {data.ansprechpartner && (
          <p>
            <span className="font-bold">Ansprechpartner:</span> {data.ansprechpartner}
          </p>
        )}
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
          <span className="font-bold">Druck:</span> {data.druckLabel}
          {data.probedruckLabel ? ` · Probedruck: ${data.probedruckLabel}` : ""}
        </p>
        {data.fulfillmentStatus && (
          <p>
            <span className="font-bold">Status:</span> {data.fulfillmentStatus}
          </p>
        )}
      </div>
    </div>
  )
}

function formatGroupLine(row: PackingSheetData["warehouseRows"][number]): string {
  if (!row.lagerGruppe) {
    return `Gruppe ${row.slot}: – · ${row.anzahl} Stk`
  }
  const charge = row.charge ? ` · ${row.charge}` : ""
  return `Gruppe ${row.slot}: ${row.lagerGruppe}${charge} · ${row.anzahl} Stk`
}

function ChecklistGroups({ rows }: { rows: PackingSheetData["warehouseRows"] }) {
  return (
    <div className="mb-4">
      <h2 className="mb-2 text-xs font-black uppercase">Bänder je Gruppe</h2>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.slot} className="flex items-baseline gap-2 text-sm">
            <span className="shrink-0 text-base leading-none">☐</span>
            <span>{formatGroupLine(row)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChecklistAccessories({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <div className="mb-4">
      <h2 className="mb-2 text-xs font-black uppercase">Zubehör & Versand</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-baseline gap-2 text-sm">
            <span className="shrink-0 text-base leading-none">☐</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function VersandFooter({ data }: { data: PackingSheetData }) {
  return (
    <div className="mt-auto border-t-2 border-black pt-3">
      <PackingShippingDates data={data} />
    </div>
  )
}

export function QuotePackingChecklist({ data }: QuotePackingChecklistProps) {
  const splitPages = data.warehouseRows.length > 6

  return (
    <div className="a6-print-root">
      <A6PrintStyles />
      {splitPages ? (
        <>
          <div className="a6-page flex flex-col">
            <ChecklistMeta data={data} />
            <ChecklistAccessories items={data.checklistAccessories} />
            <VersandFooter data={data} />
          </div>
          <div className="a6-page flex flex-col">
            <p className="mb-3 text-xs font-bold">Auftrag #{data.quoteId} — Gruppen</p>
            <ChecklistGroups rows={data.warehouseRows} />
            <VersandFooter data={data} />
          </div>
        </>
      ) : (
        <div className="a6-page flex flex-col">
          <ChecklistMeta data={data} />
          <ChecklistGroups rows={data.warehouseRows} />
          <ChecklistAccessories items={data.checklistAccessories} />
          <VersandFooter data={data} />
        </div>
      )}
    </div>
  )
}
