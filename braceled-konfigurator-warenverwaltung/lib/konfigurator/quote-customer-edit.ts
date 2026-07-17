import type { QuoteConfig } from "@/lib/konfigurator/types"
import type { AvailabilityStressLevel } from "@/lib/konfigurator/availability-stress"

const LOCKED_KEYS: (keyof QuoteConfig)[] = [
  "von",
  "bis",
  "kontaktName",
  "kontaktFirma",
  "kontaktTelefon",
  "kontaktStrasse",
  "kontaktPlz",
  "kontaktOrt",
  "produkt",
  "modus",
  "station",
  "stationModus",
  "kanalanzahl",
  "land",
  "szenario",
  "variante",
]

/** Erlaubte Kunden-Felder: Menge, Logo/Branding, Techniker, Druck, Flex, Lieferoptionen, Gruppen (PRO) */
export function mergeCustomerEditConfig(
  previous: QuoteConfig,
  incoming: QuoteConfig,
): QuoteConfig {
  const next: QuoteConfig = { ...incoming }
  for (const key of LOCKED_KEYS) {
    ;(next as Record<string, unknown>)[key as string] = previous[key]
  }
  return next
}

export function buildChangeSummary(before: QuoteConfig, after: QuoteConfig): string {
  const parts: string[] = []
  if (before.menge !== after.menge) parts.push(`Menge ${before.menge}→${after.menge}`)
  if (before.logoId !== after.logoId) parts.push("Logo")
  if (before.druck !== after.druck || before.druckArt !== after.druckArt) parts.push("Druck")
  if (before.probedruckOption !== after.probedruckOption) parts.push("Probedruck")
  if (Boolean(before.techniker) !== Boolean(after.techniker) || before.technikerTage !== after.technikerTage) {
    parts.push("Techniker")
  }
  if (Boolean(before.flexRueckgabe ?? before.flex) !== Boolean(after.flexRueckgabe ?? after.flex)) {
    parts.push("Flex")
  }
  if (before.lieferpaket !== after.lieferpaket || before.lieferart !== after.lieferart || before.lieferzeit !== after.lieferzeit) {
    parts.push("Lieferung")
  }
  if (before.gruppen !== after.gruppen) {
    parts.push(`Gruppen ${before.gruppen}→${after.gruppen}`)
  } else {
    const beforeSizes = JSON.stringify(before.gruppenGroessen ?? [])
    const afterSizes = JSON.stringify(after.gruppenGroessen ?? [])
    if (beforeSizes !== afterSizes) parts.push("Gruppenaufteilung")
  }
  return parts.length ? parts.join(" · ") : "Konfiguration angepasst"
}

export function mapStressToAvailabilityLevel(
  level: AvailabilityStressLevel,
): AvailabilityStressLevel {
  return level
}
