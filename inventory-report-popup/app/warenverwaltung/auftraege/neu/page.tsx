import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { isAuthenticated } from "@/lib/auth"
import { getQuoteRequestStats } from "@/lib/actions/quotes"
import { OperationsShell } from "@/components/dashboard/operations-shell"
import { ManualQuoteForm } from "@/components/admin/manual-quote-form"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function NeuerAuftragPage() {
  if (!(await isAuthenticated())) redirect("/login")

  const quoteStats = await getQuoteRequestStats({ skipExpire: true })

  return (
    <OperationsShell activeTab="auftraege" quoteStats={quoteStats} userCanAdmin>
      <div className="flex flex-col gap-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-fit gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/warenverwaltung/auftraege">
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Aufträgen
          </Link>
        </Button>

        <ManualQuoteForm />
      </div>
    </OperationsShell>
  )
}
