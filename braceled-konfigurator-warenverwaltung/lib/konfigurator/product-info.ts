import {
  DRUCK_VOLLFLAECHIG_PRO_STK,
  FLEX_NETTO,
  OVERNIGHT_NETTO,
  PROBEDRUCK_FOTOS_NETTO,
  PROBEDRUCK_VERSAND_NETTO,
  TECHNIKER_KM_NETTO,
  TECHNIKER_REISEPAUSCHALE_NETTO,
  TECHNIKER_TAG_NETTO,
  stationPreisNetto,
} from "@/lib/pricing/constants"
import { LANDING_IMAGES } from "@/lib/landing/content"

export const MIN_MENGE = 100
export const MAX_MENGE = 4000
export const MENGE_STEP = 50

export const PRODUCT_UNAVAILABLE_HINT = "Aktuell hier nicht konfigurierbar"

export type ProbedruckOption = "none" | "fotos" | "versand"
export type DruckArt = "logo" | "vollflaechig"

export type Lieferart = "standard" | "flex" | "overnight"

export const SZENARIO_OPTIONS = [
  { value: "konzert", label: "Konzert / Festival", hint: "Große Shows, synchrone Lichteffekte" },
  { value: "corporate", label: "Corporate Event", hint: "Firmenfeier, Produktlaunch" },
  { value: "messe", label: "Messe / Kongress", hint: "Networking, interaktive Präsentation" },
  { value: "hochzeit", label: "Hochzeit", hint: "Trauung, Empfang, Party" },
  { value: "sonstiges", label: "Sonstiges", hint: "Sportevent, Jubiläum, etc." },
] as const

export const VARIANTE_OPTIONS = [
  {
    value: "standard",
    label: "Standard",
    description: "Fernsteuerung per Handcontroller.",
  },
  {
    value: "premium",
    label: "Premium",
    description: "Handcontroller oder Basis PRO.",
  },
] as const

export const GRUPPEN_INFO = {
  title: "Gruppenprogrammierung",
  description:
    "Teilen Sie Ihre Gäste in bis zu 20 Gruppen ein (z. B. VIP, Tribüne A, Backstage). Jede Gruppe erhält ein eigenes Lichtprogramm – gesteuert über die PRO Basis-Station.",
  preisProGruppeNetto: 65,
} as const

export const LIEFERART_OPTIONS: ReadonlyArray<{
  value: Lieferart
  label: string
  description: string
  preisNetto: number
}> = [
  {
    value: "standard",
    label: "Standard-Anlieferung",
    description:
      "Bis 2 Tage vor Event per UPS oder TNT. Rückversandfenster 3 Werktage, bis Miet-Equipment wieder bei uns sein muss.",
    preisNetto: 0,
  },
  {
    value: "flex",
    label: "Flex-Lieferung",
    description:
      "Anlieferung mindestens 5 Werktage vor Event per UPS oder TNT. Rückversandfenster 8 Werktage.",
    preisNetto: FLEX_NETTO,
  },
  {
    value: "overnight",
    label: "Overnight-Versand",
    description: "Anlieferung innerhalb von 48 Stunden per UPS oder TNT.",
    preisNetto: OVERNIGHT_NETTO,
  },
]

export const LIEFERLAND_INFO = {
  title: "Lieferland",
  land: "Deutschland",
  hinweis:
    "Der Online-Konfigurator berechnet Angebote derzeit nur für Lieferungen nach Deutschland. Für andere Länder kontaktieren Sie uns bitte direkt.",
} as const

export function normalizeLieferart(config: {
  lieferart?: string
  flex?: boolean
}): Lieferart {
  if (
    config.lieferart === "standard" ||
    config.lieferart === "flex" ||
    config.lieferart === "overnight"
  ) {
    return config.lieferart
  }
  return config.flex ? "flex" : "standard"
}

export function getLieferartLabel(lieferart: Lieferart): string {
  return LIEFERART_OPTIONS.find((o) => o.value === lieferart)?.label ?? lieferart
}

export const STATION_IMAGES = {
  eco: "/images/konfigurator/stations/eco-handcontroller.webp",
  pro: "/images/konfigurator/stations/pro-basis-station.webp",
  proBack: "/images/konfigurator/stations/pro-basis-station-back.webp",
} as const

export const STATION_TECH_DOC_URL = "https://www.led-leuchtarmbaender.com/techdoku"

export type StationDetail = {
  title: string
  subtitle: string
  imageSrc: string
  secondaryImage?: { src: string; label: string }
  features: ReadonlyArray<{ title: string; description: string }>
  limitations?: ReadonlyArray<string>
  idealFor: string
}

export const STATION_DETAIL: Record<"eco" | "pro", StationDetail> = {
  eco: {
    title: "ECO Handcontroller (BQ-S)",
    subtitle: "Kompakte Handfernbedienung für zentrale Steuerung aller Armbänder gleichzeitig.",
    imageSrc: STATION_IMAGES.eco,
    features: [
      {
        title: "Farbwahl",
        description:
          "Feste Farben per Tastendruck: Rot, Grün, Blau, Violett, Gelb, Cyan, Weiß und sanfte Farbüberblendungen (Crossfade).",
      },
      {
        title: "Zwei-Farben-Modus",
        description:
          "Zwei Farbtasten gleichzeitig gedrückt halten – die Bänder wechseln automatisch zwischen beiden Farben.",
      },
      {
        title: "Effekt-Modi",
        description:
          "Constant (Dauerlicht), Flash, Strobe, Pulse und Crossfade für unterschiedliche Show-Effekte.",
      },
      {
        title: "Global Ein/Aus",
        description: "Alle Armbänder zentral ein- oder ausschalten – ideal für klare Show-Momente.",
      },
      {
        title: "Funkreichweite",
        description: "433/434 MHz, ca. 200 m bei freier Sicht – alle Bänder reagieren synchron.",
      },
    ],
    limitations: [
      "Keine Gruppenprogrammierung – alle Bänder werden gleich angesteuert.",
      "Kein DMX-Anschluss an Lichtkonsolen.",
      "Keine App-Steuerung.",
    ],
    idealFor: "Mittlere Events, einfache Shows und Merch-Einsätze ohne separate Gästegruppen.",
  },
  pro: {
    title: "PRO Basis-Station",
    subtitle:
      "Professionelle Steuereinheit mit DMX- und Bluetooth-Anbindung – das Herzstück für Live-Shows.",
    imageSrc: STATION_IMAGES.pro,
    secondaryImage: {
      src: STATION_IMAGES.proBack,
      label: "Anschlüsse (Rückseite)",
    },
    features: [
      {
        title: "DMX-Ansteuerung",
        description:
          "Wandelt DMX-Signale in Funk um. Pro Gruppe 4 Kanäle (On/Strobe, Rot, Grün, Blau). Steuerung über gängige Lichtkonsolen (GrandMA, Hog etc.).",
      },
      {
        title: "Bis zu 20 Gruppen",
        description:
          "Gäste in bis zu 20 Gruppen einteilen – jede Gruppe mit eigenem Lichtprogramm (z. B. VIP, Tribüne A, Backstage).",
      },
      {
        title: "App-Steuerung (Bluetooth)",
        description:
          "Alternative Steuerung über die „RF Fun“ App per Smartphone. Hinweis: App von Drittanbieter – für professionelle Shows empfehlen wir DMX.",
      },
      {
        title: "Sleep-Modus & PowerOff per DMX",
        description:
          "Armbänder in den Ruhemodus schicken (bis zu 50 % längere Laufzeit) oder per DMX komplett abschalten.",
      },
      {
        title: "Abstimmungs-Modus",
        description:
          "Teilnehmer wählen per Knopf am Armband zwischen Farben – ideal für Umfragen und interaktive Shows.",
      },
      {
        title: "Lieferumfang",
        description:
          "Basisstation, RF- und Bluetooth-Antenne, Hand-Fernbedienung, Netzteil und Kabel – einsatzbereit im Transportkoffer.",
      },
    ],
    limitations: [
      "Nur zur Miete verfügbar (kein Kauf).",
      "Gruppenprogrammierung: 65 EUR netto pro Gruppe.",
    ],
    idealFor: "Große Shows, Konzerte, Corporate Events mit synchronen Lichteffekten und Gruppeneinteilung.",
  },
}

export const STATION_COMPARISON = [
  { label: "Steuerung", eco: "Handfernbedienung", pro: "DMX, App (Bluetooth) + Hand-FB" },
  { label: "Gruppen", eco: "Alle Bänder gleich", pro: "Bis zu 20 Gruppen" },
  { label: "DMX-Anschluss", eco: "Nein", pro: "Ja (Lichtkonsole)" },
  { label: "App-Steuerung", eco: "Nein", pro: "Ja (RF Fun, Drittanbieter)" },
  { label: "Kauf / Miete", eco: "Kauf oder Miete", pro: "Nur Miete" },
  { label: "Preis ab", eco: "250 / 399 EUR netto", pro: "649 EUR netto" },
] as const

export const STATION_OPTIONS = [
  {
    value: "keine",
    label: "Keine Basis-Station",
    description:
      "Steuerung nur per Knopf am Armband. Feste Farbprogramme, keine Fernsteuerung.",
    mieteOnly: false,
    imageSrc: undefined,
  },
  {
    value: "eco",
    label: "ECO Handcontroller",
    description:
      "Handfernbedienung für zentrale Steuerung. Unterstützt keine Gruppenprogrammierung (laut Preisübersicht).",
    mieteOnly: false,
    imageSrc: STATION_IMAGES.eco,
  },
  {
    value: "pro",
    label: "PRO Basis-Station",
    description:
      "DMX/Bluetooth-Steuerung für Live-Shows. Bis zu 20 Gruppen programmierbar. Nur zur Miete verfügbar.",
    mieteOnly: true,
    imageSrc: STATION_IMAGES.pro,
  },
] as const

export const PRODUCT_OPTIONS: ReadonlyArray<{
  value: string
  label: string
  description: string
  available: boolean
  imageSrc: string
}> = [
  {
    value: "armband",
    label: "LED Armband",
    description: "Klassisches LED-Armband für Events jeder Größe",
    available: true,
    imageSrc: "/images/konfigurator/products/armband.webp",
  },
  {
    value: "ball",
    label: "LED Ball",
    description: "90 cm LED-Ball für leuchtende Effekte im Publikum",
    available: false,
    imageSrc: "/images/konfigurator/products/ball.webp",
  },
  {
    value: "platine",
    label: "LED Platine",
    description: "LED Platine zum Einbau in eigene Event-Elemente",
    available: false,
    imageSrc: "/images/konfigurator/products/platine.webp",
  },
  {
    value: "lanyard",
    label: "LED Lanyard",
    description: "LED-Anhänger für Lanyards mit farbwechselnder Beleuchtung",
    available: false,
    imageSrc: "/images/konfigurator/products/lanyard.webp",
  },
  {
    value: "licht",
    label: "LED-Licht",
    description: "IP68-wasserdichte LED-Lights für Pool, See & Eiskühler",
    available: false,
    imageSrc: "/images/konfigurator/products/licht.webp",
  },
]

export function isProductKonfiguratorAvailable(produkt: string): boolean {
  return PRODUCT_OPTIONS.find((p) => p.value === produkt)?.available ?? false
}

export function modusAnzeige(modus: string): string {
  if (modus === "kauf") return "Kauf"
  if (modus === "miete") return "Miete"
  return modus
}

export const PRODUKT_ANZEIGE: Record<string, string> = {
  armband: "LED Armband",
  ball: "LED Ball",
  platine: "LED Platine",
  lanyard: "LED Lanyard",
  zauberstab: "LED Zauberstab",
  licht: "LED-Licht",
}

export const LIEFERZEIT_OPTIONS = [
  { value: "standard", label: "Standard (20 Werktage)", zuschlagNetto: 79 },
  { value: "express", label: "Express (10 Werktage)", zuschlagNetto: 349 },
  {
    value: "hyperexpress",
    label: "Hyperexpress (48 Std, Bedruckung nur nach Absprache)",
    zuschlagNetto: 620,
  },
] as const

export function getStationPriceLabel(station: string, stationModus: string): string {
  const preis = stationPreisNetto(station, stationModus)
  if (preis <= 0) return ""
  return ` (+${preis} EUR netto)`
}

export const TECHNIKER_INFO = {
  title: "Techniker vor Ort",
  description:
    "Technische Proben und Show-Betreuung durch WIRKUNG-Techniker. Reisepauschale einmalig, Tagesrate pro Einsatztag, Fahrtkosten ab Wehrheim.",
  minVorlaufTage: 7,
  tagNetto: TECHNIKER_TAG_NETTO,
  reiseNetto: TECHNIKER_REISEPAUSCHALE_NETTO,
  kmNetto: TECHNIKER_KM_NETTO,
} as const

export const WRISTBAND_MOCKUP_URL = "/images/ledband-mockup-web.png"

export const DRUCK_INFO = {
  title: "Bedruckung (nur Kauf)",
  summary:
    "UV-Direktdruck (CMYK + Weiß), Druckfläche 2 × 3 cm einseitig. PNG (transparent) oder Vektor (AI, EPS, SVG).",
  setupNetto: 120,
} as const

export const VOLLFLAECHIG_DRUCK_INFO = {
  title: "Vollflächig bedrucken",
  description:
    "Premium-Druck auf fast der gesamten Vorderseite – ideal für starkes Branding ohne Logo-Konfigurator.",
  preisProStueckNetto: DRUCK_VOLLFLAECHIG_PRO_STK,
  imageSrc: LANDING_IMAGES.vollflaeche,
} as const

export const DRUCK_ART_OPTIONS: ReadonlyArray<{
  value: DruckArt
  label: string
  description: string
  priceHint?: string
  imageSrc?: string
}> = [
  {
    value: "logo",
    label: "Logo-Druck (3 × 2 cm)",
    description: DRUCK_INFO.summary,
    priceHint: `ab ${DRUCK_INFO.setupNetto} EUR Setup + Staffel pro Stück`,
    imageSrc: LANDING_IMAGES.bedruckt,
  },
  {
    value: "vollflaechig",
    label: VOLLFLAECHIG_DRUCK_INFO.title,
    description: VOLLFLAECHIG_DRUCK_INFO.description,
    priceHint: `ab ${DRUCK_INFO.setupNetto} EUR Setup + ${DRUCK_VOLLFLAECHIG_PRO_STK.toLocaleString("de-DE", { minimumFractionDigits: 2 })} netto / Band`,
    imageSrc: VOLLFLAECHIG_DRUCK_INFO.imageSrc,
  },
]

export function normalizeDruckArt(config: {
  druck?: boolean
  druckArt?: string
}): DruckArt {
  if (!config.druck) return "logo"
  if (config.druckArt === "vollflaechig") return "vollflaechig"
  return "logo"
}

export const PROBEDRUCK_OPTIONS: ReadonlyArray<{
  value: ProbedruckOption
  label: string
  description: string
  preisNetto: number
}> = [
  {
    value: "none",
    label: "Kein Probedruck",
    description: "Direkt in die Serienproduktion ohne Muster.",
    preisNetto: 0,
  },
  {
    value: "fotos",
    label: "Probedruck + Fotos",
    description: "Musterdruck mit Fotodokumentation zur Freigabe vor der Serienproduktion.",
    preisNetto: PROBEDRUCK_FOTOS_NETTO,
  },
  {
    value: "versand",
    label: "Probedruck + Versand",
    description: "Physisches Muster per Post zur Freigabe vor der Serienproduktion.",
    preisNetto: PROBEDRUCK_VERSAND_NETTO,
  },
]

export function normalizeProbedruckOption(config: {
  probedruckOption?: string
  probedruck?: boolean
}): ProbedruckOption {
  if (
    config.probedruckOption === "none" ||
    config.probedruckOption === "fotos" ||
    config.probedruckOption === "versand"
  ) {
    return config.probedruckOption
  }
  return config.probedruck ? "fotos" : "none"
}

export function getProbedruckLabel(option: ProbedruckOption): string | null {
  if (option === "none") return null
  return PROBEDRUCK_OPTIONS.find((o) => o.value === option)?.label ?? option
}

export function probedruckPreisNetto(option: ProbedruckOption): number {
  return PROBEDRUCK_OPTIONS.find((o) => o.value === option)?.preisNetto ?? 0
}
