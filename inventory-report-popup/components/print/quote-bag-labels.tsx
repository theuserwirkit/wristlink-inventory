"use client"

import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"
import { A6PrintStyles } from "@/components/print/print-a6-styles"

type QuoteBagLabelsProps = {
  data: PackingSheetData
}

export function QuoteBagLabels({ data }: QuoteBagLabelsProps) {
  return (
    <div className="a6-print-root">
      <A6PrintStyles />
      {data.bagLabels.map((label) => (
        <div key={label.slot} className="a6-page flex flex-col justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">Auftrag #{data.quoteId}</p>
            <p className="mt-2 text-lg font-bold">
              Gruppe {label.slot} von {label.totalSlots}
            </p>
          </div>

          <div className="my-4 text-center">
            <p className="text-5xl font-black leading-none">{label.anzahl}</p>
            <p className="mt-1 text-xl font-bold">Bänder</p>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-bold">Kunde:</span> {data.kunde}
            </p>
            {data.eventDatum && (
              <p>
                <span className="font-bold">Event:</span> {data.eventDatum}
              </p>
            )}
            {data.druck ? (
              <div className="border-2 border-black p-2">
                <p className="font-black uppercase text-xs">Bedruckung</p>
                <p className="text-sm font-bold">{data.druckLabel}</p>
                {data.probedruckLabel && (
                  <p className="mt-1 text-xs">
                    <span className="font-bold">Probedruck:</span> {data.probedruckLabel}
                  </p>
                )}
                {data.hasLogo && (
                  <p className="mt-1 text-xs font-bold">Logo-Datei vorhanden</p>
                )}
              </div>
            ) : (
              <p>
                <span className="font-bold">Druck:</span> Nein
              </p>
            )}
            {label.lagerGruppe ? (
              <div>
                <p>
                  <span className="font-bold">Lager:</span> {label.lagerGruppe}
                </p>
                {label.charge && (
                  <p className="a6-mono text-xs">
                    <span className="font-bold font-sans">Charge:</span> {label.charge}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-black/80">Lager: siehe Übersicht</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
