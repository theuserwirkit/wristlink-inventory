import { getVerifiedLead } from "@/lib/actions/leads"
import { KonfiguratorClient } from "@/components/konfigurator/konfigurator-client"

export const dynamic = "force-dynamic"

export default async function KonfiguratorPage() {
  const lead = await getVerifiedLead()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">WIRKUNG Wristlink Konfigurator</h1>
          <p className="text-muted-foreground mt-1">
            B2B-Konfigurator – Preise netto zzgl. MwSt.
          </p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <KonfiguratorClient
          initialVerified={Boolean(lead)}
          initialEmail={lead?.email}
          initialContact={{
            name: lead?.name,
            firma: lead?.firma,
            telefon: lead?.telefon,
          }}
        />
      </main>
    </div>
  )
}
