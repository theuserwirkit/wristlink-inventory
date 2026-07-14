import type { PackingSheetData } from "@/lib/konfigurator/packing-sheet"

type PackingShippingDatesProps = {
  data: PackingSheetData
  compact?: boolean
}

export function PackingShippingDates({ data, compact = false }: PackingShippingDatesProps) {
  if (!data.versandDatum && !data.anlieferungDatum) return null

  if (compact) {
    return (
      <div className="space-y-0.5 text-xs">
        {data.versandDatum && (
          <p>
            <span className="font-bold">Versand:</span> {data.versandDatum}
          </p>
        )}
        {data.anlieferungDatum && (
          <p>
            <span className="font-bold">Anlieferung Kunde:</span> {data.anlieferungDatum}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="border-2 border-black p-2 text-sm">
      {data.versandDatum && (
        <p>
          <span className="font-bold">Versand am:</span> {data.versandDatum}
        </p>
      )}
      {data.anlieferungDatum && (
        <p className={data.versandDatum ? "mt-1" : ""}>
          <span className="font-bold">Anlieferung beim Kunden bis:</span> {data.anlieferungDatum}
        </p>
      )}
    </div>
  )
}
