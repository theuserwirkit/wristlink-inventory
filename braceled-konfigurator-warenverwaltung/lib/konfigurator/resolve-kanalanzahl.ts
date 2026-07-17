import type { QuoteConfig } from "@/lib/konfigurator/types"
import { normalizeKanalanzahl, type Kanalanzahl } from "@/lib/konfigurator/kanalanzahl"
import { getMandatoryKanalanzahl } from "@/lib/konfigurator/leuchtgruppen"
import { checkProductAvailability } from "@/lib/actions/n8n-api"
import { checkStationAvailability } from "@/lib/konfigurator/station-availability"
import { checkGroupProgrammingAvailability } from "@/lib/konfigurator/group-allocation"
import { normalizeGruppenGroessen } from "@/lib/konfigurator/gruppen-config"

async function isKanalanzahlViable(config: QuoteConfig, kanalanzahl: Kanalanzahl): Promise<boolean> {
  if (!config.von) return true

  const prod = await checkProductAvailability({
    produkt: config.produkt,
    modus: config.modus,
    menge: config.menge,
    von: config.von,
    bis: config.bis,
    kanalanzahl,
  })
  if (!prod.verfuegbar) return false

  if (config.station && config.station !== "keine") {
    const station = await checkStationAvailability({
      station: config.station,
      stationModus: config.station === "pro" ? "miete" : config.stationModus,
      kanalanzahl,
      von: config.von,
      bis: config.bis,
    })
    if (!station.verfuegbar) return false
  }

  const gruppen = config.gruppen ?? 0
  if (gruppen > 0 && config.station === "pro") {
    const groupAvail = await checkGroupProgrammingAvailability({
      von: config.von,
      bis: config.bis,
      kanalanzahl,
      gruppenGroessen: normalizeGruppenGroessen(config).slice(0, gruppen),
    })
    if (!groupAvail.verfuegbar) return false
  }

  return true
}

/** Ermittelt die passende Kanalanzahl – Nutzer wählt nicht selbst. */
export async function resolveKanalanzahlForConfig(config: QuoteConfig): Promise<Kanalanzahl> {
  if (config.produkt !== "armband") return 40

  const gruppen = config.gruppen ?? 0
  const mandatory = getMandatoryKanalanzahl(gruppen)
  if (mandatory) return mandatory

  if (!config.von) return normalizeKanalanzahl(config.kanalanzahl)

  for (const ch of [40, 80] as const) {
    if (await isKanalanzahlViable(config, ch)) return ch
  }

  return 40
}
