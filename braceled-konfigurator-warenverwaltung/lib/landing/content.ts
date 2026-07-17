export const HERO_COPY = {
  kicker: "Ferngesteuerte LED-Armbänder für Events",
  headline: "Deine Crowd. Dein Licht. Deine Show.",
  subline:
    "BraceLED verbindet bis zu 20 Gruppen per DMX, App oder Fernbedienung — entwickelt in Deutschland und einsatzbereit für Festivals, Corporate Events und Produktionen.",
  ctaPrimary: "Paket konfigurieren",
  ctaSecondary: "So funktioniert's",
} as const

export const NAV_LINKS = [
  { href: "#features", label: "Produkt" },
  { href: "#technik", label: "Technik" },
  { href: "#preise", label: "Preise" },
  { href: "#faq", label: "FAQ" },
] as const

export const LANDING_IMAGES = {
  logo: "/images/landing/logo.png",
  logoFooter: "/images/landing/logo-footer.png",
  hero: "/images/landing/hero-header.jpg",
  tisch: "/images/landing/armband-tisch.jpg",
  front: "/images/landing/armband-front.jpg",
  back: "/images/landing/armband-back.jpg",
  gruppen: "/images/landing/feature-gruppen.jpg",
  bedruckt: "/images/landing/feature-bedruckt.jpg",
  batterie: "/images/landing/feature-batterie.jpg",
  vollflaeche: "/images/landing/feature-vollflaeche.jpg",
  glow: "/images/landing/glow-light.png",
  dust: "/images/landing/dust.png",
  dustFooter: "/images/landing/dust-footer.png",
  lineDeco: "/images/landing/line-deco.png",
  contactDeco: "/images/landing/contact-deco.png",
  benefit1: "/images/landing/benefit-lieferung.webp",
  benefit2: "/images/landing/benefit-branding.webp",
  benefit3: "/images/landing/benefit-beratung.webp",
} as const

export const USP_ITEMS = [
  {
    title: "Bis zu 20 Gruppen",
    description: "remote per DMX, App oder Fernbedienung steuerbar",
    icon: "radio" as const,
  },
  {
    title: "100% German Engineering",
    description: "Team & Versand aus Deutschland, technisch geprüft",
    icon: "shield" as const,
  },
] as const

export const BENEFIT_ITEMS = [
  {
    title: "Schnell geliefert!",
    description:
      "Wenn es eilig ist, hast Du Deine LED-Armbänder innerhalb von 48 Stunden – oder holst sie einfach bei uns im Rhein-Main-Gebiet ab!",
    link: "Lieferzeiten im Konfigurator",
    image: LANDING_IMAGES.benefit1,
  },
  {
    title: "Individuell gebrandet",
    description:
      "Die BraceLED Leuchtarmbänder kannst Du individualisieren: Vollflächiger Druck, 4c-Branding – direkt im Konfigurator hochladen.",
    link: "Druck im Konfigurator testen",
    image: LANDING_IMAGES.benefit2,
  },
  {
    title: "Gut beraten!",
    description:
      "Unser Team aus dem Rhein-Main-Gebiet begleitet Dich bei Technik, Ablauf und Umsetzung Deines Events.",
    link: "Jetzt konfigurieren",
    image: LANDING_IMAGES.benefit3,
  },
] as const

export const FEATURE_CARDS = [
  {
    image: LANDING_IMAGES.front,
    title: "LED Festivalarmband",
    description: "4 LEDs, unendliche Farben",
  },
  {
    image: LANDING_IMAGES.back,
    title: "Knopf für Interaktionen",
    description: "z. B. Abstimmungen, Farbwahl, Votings",
  },
  {
    image: LANDING_IMAGES.gruppen,
    title: "Gruppierbar",
    description: "Armbänder können in Gruppen angesteuert werden",
  },
  {
    image: LANDING_IMAGES.bedruckt,
    title: "Individualisierung",
    description: "Bedrucken in 4c möglich",
  },
  {
    image: LANDING_IMAGES.batterie,
    title: "Nachhaltig durch Batterietausch",
    description: "2× CR2032",
  },
  {
    image: LANDING_IMAGES.vollflaeche,
    title: "Vollflächiger Druck",
    description: "Premium-Druck möglich",
  },
] as const

export const MARQUEE_ITEMS = [
  "Leuchtende Crowd",
  "Immersive Erlebnisse",
  "Community Building",
] as const

export const TESTIMONIALS = [
  {
    quote:
      "Für Event-Produktionen mit Funkauflagen brauchen wir nachvollziehbare Technik-Spezifikationen — dokumentierte Frequenznutzung und Support aus Deutschland sind für uns entscheidend.",
    author: "Referenz: Event-Produktion",
  },
  {
    quote:
      "Bei TV-Formaten mit strengen Funkvorgaben zählt nachvollziehbares Know-how. Die technische Beratung zu Reichweite, DMX-Setup und Frequenzplanung hat uns überzeugt.",
    author: "Referenz: Medienproduktion",
  },
] as const

export const TECH_SPECS = [
  { label: "Sendefrequenz", value: "433/434 MHz", hint: "ISM-Band, legal in DE/EU" },
  { label: "Reichweite", value: "ca. 200 m", hint: "Freie Sicht, Repeater möglich" },
  { label: "Steuerung", value: "DMX · App · Handcontroller", hint: "PRO Basis-Station" },
  { label: "Laufzeit", value: "ca. 9 h", hint: "Sleep-Modus verlängert die Zeit" },
] as const

export const TECH_FEATURES = [
  {
    title: "Sleep-Modus",
    description: "Armbänder gehen in den Ruhemodus, wenn sie nicht aktiv genutzt werden — bis zu 50 % längere Laufzeit.",
  },
  {
    title: "PowerOff per DMX",
    description: "Armbänder per DMX-Befehl komplett abschalten. Bleiben aus, bis der Knopf erneut gedrückt wird.",
  },
  {
    title: "Abstimmungs-Modus",
    description: "Teilnehmer wählen per Knopfdruck zwischen Farben — ideal für Umfragen und interaktive Shows.",
  },
] as const

export const TECH_ACCORDION = [
  {
    id: "dmx",
    title: "DMX-Ansteuerung",
    content:
      "Die PRO Basis-Station wandelt DMX-Signale in Funk um. Pro Armband-Gruppe werden 4 Kanäle benötigt (On/Strobe, Rot, Grün, Blau). Beispiel: 5 Gruppen = 20 DMX-Kanäle. Steuerung über gängige Lichtkonsolen (GrandMA, Hog etc.). Fixture Files auf Anfrage.",
  },
  {
    id: "setup",
    title: "Einrichtung Basisstation",
    content:
      "1. Basisstation zentral im Venue platzieren (FOH oder Bühne). 2. Antenne anschrauben. 3. DMX-Kabel an die Lichtkonsole. 4. Netzteil anschließen und einschalten. Bei den Bändchen: Plastik-Laschen erst kurz vor der Show entfernen — die Batterien halten ca. 9 Stunden.",
  },
  {
    id: "app",
    title: "App-Steuerung",
    content:
      "Alternative Steuerung über die „RF Fun“ App per Bluetooth (Basis zeigt „App“). Hinweis: Die App ist nicht von uns entwickelt — für professionelle Shows empfehlen wir DMX oder unsere Hand-Fernbedienung.",
  },
] as const

export const TECH_DOC_URL = "https://www.led-leuchtarmbaender.com/techdoku"

export const FAQ_ITEMS = [
  {
    question: "Kann ich LED Leuchtarmbänder nur kaufen oder auch mieten?",
    answer:
      "BraceLED kannst Du sowohl kaufen als auch mieten. Egal wie: Wir kümmern uns gerne um Batterietausch, Recycling und Rücknahme!",
  },
  {
    question: "Welche Technik nutzt ihr?",
    answer:
      "Wir arbeiten mit dokumentierter Funktechnik im zulässigen ISM-Band und beraten Dich transparent zu Reichweite, Setup und Einsatzbedingungen.",
  },
  {
    question: "Wie schnell könnt ihr liefern?",
    answer:
      "Wenn es dringend ist, kannst Du in der Regel heute noch LED-Armbänder bei uns im Rhein-Main-Gebiet abholen. Ansonsten sind Lieferzeiten von 2–3 Wochen die Regel.",
  },
  {
    question: "Ich habe spezielle Anforderungen …",
    answer:
      "Sehr gern. Ob Gewinnspiel, Abstimmungen, Gruppeneinteilung oder individuelle Interaktionen: Wir prüfen gemeinsam, wie sich BraceLED sauber in Dein Eventkonzept integrieren lässt.",
  },
  {
    question: "Wie bedruckt ihr die Armbänder?",
    answer:
      "Wir bedrucken kleine Mengen direkt inhouse per UV-LED-Druck. Größere Mengen lassen wir bei einer Druckerei produzieren. Vollflächiger Druck auf fast der gesamten Vorderseite – für Brandbuilding eine ganz andere Hausnummer!",
  },
] as const
