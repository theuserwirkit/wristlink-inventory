"use client"

import { useState } from "react"
import { EmailGateForm } from "@/components/konfigurator/email-gate-form"
import { ConfiguratorWizard } from "@/components/konfigurator/configurator-wizard"

export function KonfiguratorClient({
  initialVerified,
  initialEmail,
  initialContact,
}: {
  initialVerified: boolean
  initialEmail?: string
  initialContact?: {
    name?: string | null
    firma?: string | null
    telefon?: string | null
  }
}) {
  const [verified, setVerified] = useState(initialVerified)
  const [email, setEmail] = useState(initialEmail || "")
  const [contact, setContact] = useState(initialContact)

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
