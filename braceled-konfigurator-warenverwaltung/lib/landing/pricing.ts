import { formatEur } from "@/lib/pricing/preis-engine"

const ARMBAND_KAUF = 4.2
const ARMBAND_MIETE = 3.9
const DRUCK_PRO_STK = 2.12

export type LandingPriceTier = {
  id: string
  name: string
  priceLabel: string
  priceHint: string
  delivery: string
  features: string[]
  highlighted?: boolean
}

export function getLandingPricing(): LandingPriceTier[] {
  const kaufBedruckt = Math.round((ARMBAND_KAUF + DRUCK_PRO_STK) * 100) / 100

  return [
    {
      id: "kaufen",
      name: "LED Bänder kaufen",
      priceLabel: `ab ${formatEur(ARMBAND_KAUF)}`,
      priceHint: "pro Stück · netto · Menge 100–4.000",
      delivery: "Basis-Station zur Fernsteuerung optional (zzgl.)",
      features: [
        "Armband bleibt nach dem Event bei Dir",
        "Als Merch ohne Fernsteuerung oder mit Basis-Station zur Fernsteuerung",
        "In 48 Std lieferbar",
      ],
    },
    {
      id: "mieten",
      name: "LED Bänder mieten",
      priceLabel: `ab ${formatEur(ARMBAND_MIETE)}`,
      priceHint: "pro Stück · netto · Menge 100–4.000",
      delivery: "Lieferart: Standard, Flex oder Overnight",
      highlighted: true,
      features: [
        "Miete inkl. Reinigung & Rücknahme",
        "Steuerung per Basis, Fernbedienung oder App",
        "Bis 20 Gruppen",
        "Viele Usecases",
      ],
    },
    {
      id: "bedruckt",
      name: "LED Bänder bedruckt",
      priceLabel: `ab ${formatEur(kaufBedruckt)}`,
      priceHint: "inkl. UV-Druck · netto · Menge 100–4.000",
      delivery: "Setup einmalig 120 € netto",
      features: [
        "UV-Direktdruck 2×3 cm (CMYK + Weiß)",
        "Auch vollflächiger Druck möglich",
        "Nur beim Kauf verfügbar",
        "Probedruck möglich",
      ],
    },
  ]
}
