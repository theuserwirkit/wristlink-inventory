import type { PreisEngineSuccess, PreisPosition } from "./types"
import { formatEur } from "./preis-engine"
import { PRICING_NOTICE_B2B } from "@/lib/konfigurator/consent"

const eur = (n: number) => Math.round(n * 100) / 100

/** Lieferzeit- und Versandposition für die Anzeige zusammenfassen */
export function displayPositionen(positionen: PreisPosition[]): PreisPosition[] {
  const ltIdx = positionen.findIndex((p) => p.pos.startsWith("Lieferpaket"))
  const vsIdx = positionen.findIndex((p) => p.pos.startsWith("Versand"))
  if (ltIdx === -1 || vsIdx === -1) return positionen

  const summe = eur(positionen[ltIdx].summe + positionen[vsIdx].summe)
  const merged: PreisPosition = {
    pos: "Lieferpaket & Versand",
    menge: 1,
    einzel: summe,
    summe,
  }

  const result: PreisPosition[] = []
  positionen.forEach((p, i) => {
    if (i === ltIdx) result.push(merged)
    else if (i !== vsIdx) result.push(p)
  })
  return result
}

export function formatNettoLine(amount: number): string {
  return `${formatEur(amount)} netto`
}

export function formatPriceSummary(price: Pick<PreisEngineSuccess, "gesamt_netto" | "mwst_19" | "gesamt_brutto">) {
  return {
    netto: price.gesamt_netto,
    mwst: price.mwst_19,
    brutto: price.gesamt_brutto,
    nettoLabel: formatEur(price.gesamt_netto),
    mwstLabel: formatEur(price.mwst_19),
    bruttoLabel: formatEur(price.gesamt_brutto),
    notice: PRICING_NOTICE_B2B,
  }
}

/** Betrag für Stripe Checkout (B2B DE: Netto + 19 % MwSt.) */
export function getStripeChargeAmount(price: Pick<PreisEngineSuccess, "gesamt_brutto">): number {
  return price.gesamt_brutto
}
