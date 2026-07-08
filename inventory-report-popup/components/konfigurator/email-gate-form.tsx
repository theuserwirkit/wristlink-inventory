"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Loader2 } from "lucide-react"
import { CRM_CONSENT_TEXT, MARKETING_CONSENT_TEXT } from "@/lib/konfigurator/consent"

export function EmailGateForm({ onVerified }: { onVerified?: () => void }) {
  const [name, setName] = useState("")
  const [firma, setFirma] = useState("")
  const [telefon, setTelefon] = useState("")
  const [email, setEmail] = useState("")
  const [marketing, setMarketing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [testmodeLoading, setTestmodeLoading] = useState(false)

  async function checkSession() {
    setChecking(true)
    try {
      const res = await fetch("/api/konfigurator/session")
      if (res.ok) {
        const data = await res.json()
        if (data.verified) {
          onVerified?.()
        }
      }
    } finally {
      setChecking(false)
    }
  }

  async function handleTestmode() {
    setTestmodeLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/konfigurator/testmode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Testmode fehlgeschlagen")
        return
      }
      await checkSession()
    } catch {
      setError("Netzwerkfehler")
    } finally {
      setTestmodeLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/konfigurator/verify-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          firma,
          telefon,
          marketingConsent: marketing,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler beim Senden")
        return
      }
      setSent(true)
      await checkSession()
    } catch {
      setError("Netzwerkfehler")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-Mail gesendet
          </CardTitle>
          <CardDescription>
            Bitte prüfen Sie Ihr Postfach und klicken Sie auf den Bestätigungslink.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={checkSession} disabled={checking} className="w-full">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ich habe bestätigt – weiter"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>E-Mail bestätigen</CardTitle>
        <CardDescription>
          Bestätigen Sie Ihre E-Mail, um den Konfigurator zu nutzen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Ansprechpartner</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vor- und Nachname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firma">Firma</Label>
              <Input
                id="firma"
                required
                value={firma}
                onChange={(e) => setFirma(e.target.value)}
                placeholder="Firmenname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefon">Telefon</Label>
              <Input
                id="telefon"
                type="tel"
                required
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="+49 …"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Geschäftliche E-Mail-Adresse</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firma.de"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{CRM_CONSENT_TEXT}</p>

          <div className="flex items-start gap-2">
            <Checkbox
              id="marketing"
              checked={marketing}
              onCheckedChange={(v) => setMarketing(v === true)}
            />
            <Label htmlFor="marketing" className="text-sm font-normal leading-snug">
              {MARKETING_CONSENT_TEXT}
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bestätigungslink senden"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed text-muted-foreground"
            disabled={testmodeLoading || loading}
            onClick={handleTestmode}
          >
            {testmodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testmode"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
