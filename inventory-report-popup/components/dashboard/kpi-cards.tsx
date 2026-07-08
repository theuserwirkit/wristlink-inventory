import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, PackageCheck, PackageX, TrendingUp, ShoppingCart } from "lucide-react"
import type { AvailabilityStats } from "@/lib/types"

interface KPICardsProps {
  stats: AvailabilityStats[]
}

export function KPICards({ stats }: KPICardsProps) {
  const totalVerfuegbar = stats.reduce((sum, stat) => sum + stat.verfuegbar, 0)
  const totalInVermietung = stats.reduce((sum, stat) => sum + stat.inVermietung, 0)
  const totalGesamtsumme = stats.reduce((sum, stat) => sum + stat.gesamtsumme, 0)
  const totalVerkauft = stats.reduce((sum, stat) => sum + stat.verkauft, 0)
  const auslastung = totalGesamtsumme > 0 ? ((totalInVermietung / totalGesamtsumme) * 100).toFixed(1) : "0"

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gesamtbestand</CardTitle>
          <Package className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-mono">{totalGesamtsumme}</div>
          <p className="text-xs text-muted-foreground mt-1">Alle Artikel</p>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Verfügbar</CardTitle>
          <PackageCheck className="h-5 w-5 text-chart-4" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-mono text-chart-4">{totalVerfuegbar}</div>
          <p className="text-xs text-muted-foreground mt-1">Zur Vermietung/Verkauf</p>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Verkauft</CardTitle>
          <ShoppingCart className="h-5 w-5 text-chart-1" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-mono text-chart-1">{totalVerkauft}</div>
          <p className="text-xs text-muted-foreground mt-1">Gesamt verkauft</p>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Vermietung</CardTitle>
          <PackageX className="h-5 w-5 text-chart-2" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-mono text-chart-2">{totalInVermietung}</div>
          <p className="text-xs text-muted-foreground mt-1">Aktuell vermietet</p>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-background to-accent/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Auslastung</CardTitle>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold font-mono text-gradient-wristlink">{auslastung}%</div>
          <p className="text-xs text-muted-foreground mt-1">Vermietungsquote</p>
        </CardContent>
      </Card>
    </div>
  )
}
