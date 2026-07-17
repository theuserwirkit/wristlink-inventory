import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import type { AvailabilityStats } from "@/lib/types"

interface BaseAvailStat {
  baseId: number
  bezeichnung: string
  hersteller: string
  verfuegbar: number
  inVermietung: number
  gesamtsumme: number
  verkauft: number
  defekt: number
}

interface AvailabilityTableProps {
  stats: AvailabilityStats[]
  baseStats?: BaseAvailStat[]
}

export function AvailabilityTable({ stats, baseStats }: AvailabilityTableProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Verfuegbarkeit je Leuchtgruppe</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Daten verfuegbar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gruppe</TableHead>
                  <TableHead className="text-right">Verfuegbar</TableHead>
                  <TableHead className="text-right">In Vermietung</TableHead>
                  <TableHead className="text-right">Defekt/Verlust</TableHead>
                  <TableHead className="text-right">Gesamtsumme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.groupId}>
                    <TableCell className="font-medium">{stat.groupName}</TableCell>
                    <TableCell className="text-right"><span className="font-mono">{stat.verfuegbar}</span></TableCell>
                    <TableCell className="text-right"><span className="font-mono">{stat.inVermietung}</span></TableCell>
                    <TableCell className="text-right"><span className="font-mono text-red-600">{stat.defekt}</span></TableCell>
                    <TableCell className="text-right"><span className="font-mono font-semibold">{stat.gesamtsumme}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {baseStats && baseStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verfuegbarkeit je Basis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Basis</TableHead>
                  <TableHead>Hersteller</TableHead>
                  <TableHead className="text-right">Verfuegbar</TableHead>
                  <TableHead className="text-right">In Vermietung</TableHead>
                  <TableHead className="text-right">Verkauft</TableHead>
                  <TableHead className="text-right">Defekt/Verlust</TableHead>
                  <TableHead className="text-right">Gesamtsumme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baseStats.map((stat) => (
                  <TableRow key={stat.baseId} className={stat.gesamtsumme === 0 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {stat.bezeichnung}
                        {stat.gesamtsumme === 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            Kein Zugang gebucht
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{stat.hersteller}</TableCell>
                    <TableCell className="text-right"><span className="font-mono">{stat.verfuegbar}</span></TableCell>
                    <TableCell className="text-right"><span className="font-mono">{stat.inVermietung}</span></TableCell>
                    <TableCell className="text-right"><span className="font-mono">{stat.verkauft}</span></TableCell>
                    <TableCell className="text-right"><span className="font-mono text-red-600">{stat.defekt}</span></TableCell>
                    <TableCell className="text-right"><span className="font-mono font-semibold">{stat.gesamtsumme}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {baseStats.some((s) => s.gesamtsumme === 0) && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Basis-Stationen mit Gesamtsumme 0 haben noch keinen Zugang erhalten. Bitte eine ZUGANG-Buchung fur diese Basis erstellen.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
