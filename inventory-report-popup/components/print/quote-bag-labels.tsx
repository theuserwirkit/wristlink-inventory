"use client"

import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"
import { A6PrintStyles } from "@/components/print/print-a6-styles"
import { PackingShippingDates } from "@/components/print/packing-shipping-dates"

type QuoteBagLabelsProps = {
  data: PackingSheetData
}

function formatGroupLine(slot: number, lagerGruppe: string | null, charge: string | null): string {
  if (!lagerGruppe) return `Gruppe ${slot}: –`
  return charge ? `Gruppe ${slot}: ${lagerGruppe} · ${charge}` : `Gruppe ${slot}: ${lagerGruppe}`
}

export function QuoteBagLabels({ data }: QuoteBagLabelsProps) {
  return (
    <div className="a6-print-root">
      <A6PrintStyles />
      {data.bagLabels.map((label) => (
        <div key={label.slot} className="a6-page flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide">Auftrag #{data.quoteId}</p>
            {data.druck && data.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoUrl}
                alt="Kundenlogo"
                className="a6-logo h-10 w-auto bg-black p-0.5"
              />
            )}
          </div>

          <div className="my-3 text-center">
            <p className="text-6xl font-black leading-none">
              {label.slot}/{label.totalSlots}
            </p>
            <p className="mt-2 text-4xl font-black leading-none">{label.anzahl}</p>
            <p className="mt-1 text-lg font-bold">Bänder</p>
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="text-base font-bold">
              {formatGroupLine(label.slot, label.lagerGruppe, label.charge)}
            </p>
            <p>
              <span className="font-bold">Kunde:</span> {data.kunde}
            </p>
            {data.eventDatum && (
              <p>
                <span className="font-bold">Event:</span> {data.eventDatum}
              </p>
            )}
            {data.druck && (
              <p className="text-xs">
                <span className="font-bold">Bedruckung:</span> {data.druckLabel}
                {data.probedruckLabel ? ` · ${data.probedruckLabel}` : ""}
              </p>
            )}
            <PackingShippingDates data={data} />
          </div>
        </div>
      ))}
    </div>
  )
}
