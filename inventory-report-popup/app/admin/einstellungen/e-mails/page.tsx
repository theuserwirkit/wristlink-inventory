import Link from "next/link"
import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { listEmailTemplates } from "@/lib/actions/email-templates"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { EmailTemplateEditor } from "@/components/admin/email-template-editor"

export const dynamic = "force-dynamic"

export default async function EmailTemplatesPage() {
  if (!(await isAuthenticated())) redirect("/login")

  const templates = await listEmailTemplates()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/anfragen">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">E-Mail-Templates</h1>
            <p className="text-sm text-muted-foreground">
              Texte für Freigabe, Zahlung und Fulfillment-Schritte
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <EmailTemplateEditor templates={templates} />
      </main>
    </div>
  )
}
