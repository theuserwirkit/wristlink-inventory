"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { updateEmailTemplate } from "@/lib/actions/email-templates"
import type { EmailTemplate } from "@/lib/konfigurator/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PLACEHOLDER_HINT =
  "Platzhalter: {{kunde_anrede}}, {{anfrage_id}}, {{kunde_email}}, {{kunde_name}}, {{angebot_netto}}, {{angebot_brutto}}, {{zahlungslink}}, {{status_url}}, {{angebot_url}}, {{tracking_nr}}, {{kommentar}}, {{ablehnungsgrund}}, {{zahlungsnotiz}}"

export function EmailTemplateEditor({ templates }: { templates: EmailTemplate[] }) {
  const router = useRouter()
  const [selectedKey, setSelectedKey] = useState(templates[0]?.template_key || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selected = templates.find((t) => t.template_key === selectedKey)
  const [subject, setSubject] = useState(selected?.subject || "")
  const [body, setBody] = useState(selected?.body || "")
  const [sendByDefault, setSendByDefault] = useState(selected?.send_by_default ?? true)

  function selectTemplate(key: string) {
    setSelectedKey(key)
    const t = templates.find((x) => x.template_key === key)
    if (t) {
      setSubject(t.subject)
      setBody(t.body)
      setSendByDefault(t.send_by_default)
    }
    setSuccess(false)
    setError(null)
  }

  async function handleSave() {
    if (!selectedKey) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    const result = await updateEmailTemplate(selectedKey, {
      subject,
      body,
      send_by_default: sendByDefault,
    })
    if (!result.success) {
      setError(result.error || "Speichern fehlgeschlagen")
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    router.refresh()
  }

  const quoteTemplates = templates.filter((t) => t.category === "quote")
  const fulfillmentTemplates = templates.filter((t) => t.category === "fulfillment")

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <div>
            <p className="px-4 pb-2 text-xs font-medium text-muted-foreground uppercase">Anfragen</p>
            <ul>
              {quoteTemplates.map((t) => (
                <li key={t.template_key}>
                  <button
                    type="button"
                    onClick={() => selectTemplate(t.template_key)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted ${
                      selectedKey === t.template_key ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="px-4 pb-2 text-xs font-medium text-muted-foreground uppercase">Fulfillment</p>
            <ul>
              {fulfillmentTemplates.map((t) => (
                <li key={t.template_key}>
                  <button
                    type="button"
                    onClick={() => selectTemplate(t.template_key)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted ${
                      selectedKey === t.template_key ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.label}</CardTitle>
            <p className="text-xs text-muted-foreground font-mono">{selected.template_key}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">{PLACEHOLDER_HINT}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">Gespeichert.</p>}
            <div className="space-y-2">
              <Label>Betreff</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Text</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="font-mono text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="send-default"
                checked={sendByDefault}
                onCheckedChange={(v) => setSendByDefault(v === true)}
              />
              <Label htmlFor="send-default" className="font-normal cursor-pointer">
                Standardmäßig Mail senden bei diesem Schritt
              </Label>
            </div>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
