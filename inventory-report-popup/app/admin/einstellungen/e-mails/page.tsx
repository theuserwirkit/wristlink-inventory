import Link from "next/link"
import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { getSystemSettings } from "@/lib/actions/admin"
import { listEmailTemplates } from "@/lib/actions/email-templates"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { EmailTemplateEditor } from "@/components/admin/email-template-editor"
import { EmailDeliverySettings } from "@/components/admin/email-delivery-settings"

export const dynamic = "force-dynamic"

export default async function EmailTemplatesPage() {
  if (!(await isAuthenticated())) redirect("/login")

  const [templates, settings] = await Promise.all([listEmailTemplates(), getSystemSettings()])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/warenverwaltung/auftraege">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">E-Mail-Einstellungen</h1>
            <p className="text-sm text-muted-foreground">
              Versandeinstellungen und Texte für Freigabe, Zahlung und Fulfillment
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <EmailDeliverySettings globalCcEmail={settings.global_cc_email || ""} />
        <EmailTemplateEditor templates={templates} />
      </main>
    </div>
  )
}
