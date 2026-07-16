"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { EmailGateForm } from "@/components/konfigurator/email-gate-form"
import { ConfiguratorWizard } from "@/components/konfigurator/configurator-wizard"
import type { QuoteConfig } from "@/lib/konfigurator/types"

export function KonfiguratorClient({
  initialVerified,
  initialEmail,
  initialContact,
  editToken,
}: {
  initialVerified: boolean
  initialEmail?: string
  initialContact?: {
    name?: string | null
    firma?: string | null
    telefon?: string | null
  }
  editToken?: string
}) {
  const [verified, setVerified] = useState(initialVerified)
  const [email, setEmail] = useState(initialEmail || "")
  const [contact, setContact] = useState(initialContact)
  const [editLoading, setEditLoading] = useState(Boolean(editToken))
  const [editError, setEditError] = useState<string | null>(null)
  const [editConfig, setEditConfig] = useState<QuoteConfig | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!editToken) return
    let cancelled = false
    let redirected = false
    async function loadEditSession() {
      setEditLoading(true)
      setEditError(null)
      try {
        const res = await fetch(`/api/konfigurator/edit-session/${editToken}`)
        if (cancelled) return
        if (res.status === 401) {
          // Session abgelaufen: nicht editLoading beenden (verhindert Wizard-Flash
          // mit leeren Defaults), sondern weiterleiten und "Weiterleitung…" zeigen.
          redirected = true
          setRedirecting(true)
          window.location.href = `/angebot/${editToken}`
          return
        }
        if (res.status === 409 || res.status === 404) {
          const data = await res.json().catch(() => null)
          setEditError(
            data?.error || "Diese Anfrage kann aktuell nicht bearbeitet werden.",
          )
          return
        }
        if (!res.ok) {
          setEditError("Anfrage konnte nicht geladen werden.")
          return
        }
        const data = await res.json()
        if (!data?.config) {
          setEditError("Anfrage konnte nicht geladen werden.")
          return
        }
        setEditConfig(data.config)
        setEmail(data.leadEmail || "")
      } catch {
        if (!cancelled) setEditError("Netzwerkfehler beim Laden der Anfrage.")
      } finally {
        if (!cancelled && !redirected) setEditLoading(false)
      }
    }
    void loadEditSession()
    return () => {
      cancelled = true
    }
  }, [editToken])

  async function handleVerified() {
    const res = await fetch("/api/konfigurator/session")
    if (res.ok) {
      const data = await res.json()
      if (data.verified) {
        setVerified(true)
        setEmail(data.email)
        setContact({
          name: data.name,
          firma: data.firma,
          telefon: data.telefon,
        })
      }
    }
  }

  if (editToken) {
    if (redirecting) {
      return (
        <div className="flex justify-center items-center gap-2 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Weiterleitung…</span>
        </div>
      )
    }
    if (editLoading) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )
    }
    if (editError) {
      return (
        <div className="max-w-lg mx-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {editError}
        </div>
      )
    }
    if (!editConfig) {
      return (
        <div className="max-w-lg mx-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Anfrage konnte nicht geladen werden.
        </div>
      )
    }
    return (
      <ConfiguratorWizard
        userEmail={email}
        initialContact={{
          kontaktName: editConfig.kontaktName || "",
          kontaktFirma: editConfig.kontaktFirma || "",
          kontaktTelefon: editConfig.kontaktTelefon || "",
        }}
        editMode
        editToken={editToken}
        initialConfig={editConfig}
      />
    )
  }

  if (!verified) {
    return <EmailGateForm onVerified={handleVerified} />
  }

  return (
    <ConfiguratorWizard
      userEmail={email}
      initialContact={{
        kontaktName: contact?.name || "",
        kontaktFirma: contact?.firma || "",
        kontaktTelefon: contact?.telefon || "",
      }}
    />
  )
}
