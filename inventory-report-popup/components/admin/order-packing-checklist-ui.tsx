"use client"

import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"
import { modusAnzeige } from "@/lib/konfigurator/product-info"

export function OrderPackingChecklistUi({ data }: { data: PackingSheetData }) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div>
        <h3 className="font-semibold">Pack-Checkliste</h3>
        <p className="text-sm text-muted-foreground">
          {data.menge}× {modusAnzeige(data.modus)} · {data.lieferpaket}
          {data.eventLabel ? ` · ${data.eventLabel}` : ""}
        </p>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium">Bänder je Gruppe</h4>
        <ul className="space-y-2">
          {data.warehouseRows.map((row) => (
            <li key={row.slot} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0 text-muted-foreground">☐</span>
              <span>
                Gruppe {row.slot}: {row.lagerGruppe ?? "–"}
                {row.charge ? ` · ${row.charge}` : ""} · {row.anzahl} Stk
              </span>
            </li>
          ))}
        </ul>
      </div>

      {data.baseRows.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Basis-Station</h4>
          <ul className="space-y-2">
            {data.baseRows.map((row, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-muted-foreground">☐</span>
                <span>
                  {row.bezeichnung}
                  {row.seriennummer ? ` · ${row.seriennummer}` : ""} · {row.anzahl}×
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.checklistAccessories.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Zubehör & Versand</h4>
          <ul className="space-y-2">
            {data.checklistAccessories.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0 text-muted-foreground">☐</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
