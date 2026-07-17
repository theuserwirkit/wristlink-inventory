import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type OperationsTab = "overview" | "buchungen" | "auftraege" | "kalender"

interface OperationsShellProps {
  activeTab: OperationsTab
  children: ReactNode
  headerActions?: ReactNode
  quoteStats?: Record<string, number>
  userCanAdmin?: boolean
}

const TABS: { id: OperationsTab; label: string; href: string }[] = [
  { id: "overview", label: "Übersicht", href: "/warenverwaltung" },
  { id: "buchungen", label: "Buchungen", href: "/warenverwaltung/buchungen" },
  { id: "auftraege", label: "Aufträge", href: "/warenverwaltung/auftraege" },
  { id: "kalender", label: "Kalender", href: "/kalender" },
]

const inactiveTabClassName =
  "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/30"

export function OperationsShell({
  activeTab,
  children,
  headerActions,
  quoteStats = {},
  userCanAdmin = false,
}: OperationsShellProps) {
  const pendingQuotes = (quoteStats.submitted || 0) + (quoteStats.payment_pending || 0)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-primary shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground text-balance">
                  WIRKUNG.<span className="text-gradient-wristlink">wristlink</span>
                </h1>
                <p className="text-sm text-primary-foreground/70">Warenverwaltung</p>
              </div>
              {headerActions ? (
                <div className="flex items-center gap-2 flex-wrap">{headerActions}</div>
              ) : null}
            </div>

            <nav className="flex items-center gap-2 flex-wrap">
              {TABS.map((tab) => {
                if (tab.id === "auftraege" && !userCanAdmin) return null

                const isActive = activeTab === tab.id
                return (
                  <Button
                    key={tab.id}
                    asChild
                    size="lg"
                    variant={isActive ? "default" : "outline"}
                    className={cn("gap-2", !isActive && inactiveTabClassName)}
                  >
                    <Link href={tab.href}>
                      {tab.label}
                      {tab.id === "auftraege" && pendingQuotes > 0 ? (
                        <Badge
                          variant="secondary"
                          className="ml-1 bg-primary-foreground/20 text-primary-foreground border-0"
                        >
                          {pendingQuotes}
                        </Badge>
                      ) : null}
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
