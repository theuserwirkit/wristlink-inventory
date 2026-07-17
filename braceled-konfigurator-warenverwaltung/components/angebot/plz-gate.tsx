"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Lock } from "lucide-react"

export function AngebotPlzGate({
  token,
  quoteId,
}: {
  token: string
  quoteId: number
}) {
  const router = useRouter()
  const [plz, setPlz] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/angebot/${token}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plz: plz.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Zugang nicht möglich")
        return
      }
      router.refresh()
    } catch {
      setError("Netzwerkfehler – bitte erneut versuchen")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Ihr Auftragsstatus</CardTitle>
          <CardDescription>
            Anfrage #{quoteId} – bitte die Postleitzahl Ihrer Firmenadresse eingeben, um
            Angebot und Status einzusehen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plz">Postleitzahl</Label>
              <Input
                id="plz"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                placeholder="z. B. 10115"
                value={plz}
                onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
                autoComplete="postal-code"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || plz.length < 5}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird geprüft…
                </>
              ) : (
                "Status anzeigen"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
