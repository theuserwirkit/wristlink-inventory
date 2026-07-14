"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { updateSystemSetting } from "@/lib/actions/admin"

export function EmailDeliverySettings({ globalCcEmail }: { globalCcEmail: string }) {
  const router = useRouter()
  const [ccEmail, setCcEmail] = useState(globalCcEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSuccess(false)
    const result = await updateSystemSetting("global_cc_email", ccEmail)
    if (!result.success) {
      setError(result.error || "Speichern fehlgeschlagen")
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Versandeinstellungen</CardTitle>
        <CardDescription>
          Diese Adresse erhält eine Kopie (CC) bei allen ausgehenden E-Mails – Kundenmails, Team-Benachrichtigungen
          und Fulfillment-Schritte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Gespeichert.</p>}
        <div className="space-y-2 max-w-md">
          <Label htmlFor="global-cc-email">CC-Adresse</Label>
          <Input
            id="global-cc-email"
            type="email"
            value={ccEmail}
            onChange={(e) => setCcEmail(e.target.value)}
            placeholder="z. B. intern@firma.de"
          />
          <p className="text-xs text-muted-foreground">Leer lassen, um CC zu deaktivieren.</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
        </Button>
      </CardContent>
    </Card>
  )
}
