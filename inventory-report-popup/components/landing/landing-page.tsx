import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Radio,
  Sparkles,
  Truck,
  Palette,
  Headphones,
} from "lucide-react"
import { Counter } from "@/components/landing/counter"
import { LedParticles } from "@/components/landing/led-particles"
import { LandingNav } from "@/components/landing/landing-nav"
import { BraceledLogo } from "@/components/landing/braceled-logo"
import { LandingFaq } from "@/components/landing/landing-faq"
import { LandingReveal } from "@/components/landing/landing-reveal"
import {
  FestivaTitle,
  LandingButton,
  SectionHeader,
} from "@/components/landing/landing-ui"
import {
  BENEFIT_ITEMS,
  FAQ_ITEMS,
  FEATURE_CARDS,
  HERO_COPY,
  LANDING_IMAGES,
  MARQUEE_ITEMS,
  TECH_ACCORDION,
  TECH_DOC_URL,
  TECH_FEATURES,
  TECH_SPECS,
  TESTIMONIALS,
  USP_ITEMS,
} from "@/lib/landing/content"
import type { LandingPriceTier } from "@/lib/landing/pricing"
import { EMAIL_INFO } from "@/lib/contact-emails"
import { cn } from "@/lib/utils"

const BENEFIT_ICONS = [Truck, Palette, Headphones]

type Props = { pricing: LandingPriceTier[] }

export function LandingPage({ pricing }: Props) {
  return (
    <div className="landing-root">
      <a href="#hauptinhalt" className="lp-skip-link">
        Zum Hauptinhalt springen
      </a>
      <LandingNav />
      <main id="hauptinhalt">
        <HeroSection />
        <UspStrip />
        <AboutSection />
        <BenefitsSection />
        <ShowSection />
        <StatsSection />
        <FeaturesSection />
        <TechSection />
        <MarqueeSection />
        <PricingSection pricing={pricing} />
        <TestimonialsSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="lp-hero-ref">
      <LedParticles />
      <Image src={LANDING_IMAGES.dust} alt="" width={400} height={400} className="lp-hero-dust" aria-hidden />
      <Image src={LANDING_IMAGES.glow} alt="" width={300} height={300} className="lp-hero-glow-deco" aria-hidden />

      <div className="lp-container lp-hero-ref-grid">
        <div className="lp-hero-ref-text">
          <p className="lp-hero-kicker">{HERO_COPY.kicker}</p>
          <h1 className="lp-hero-headline">
            {HERO_COPY.headline.split(". ").map((part, i, arr) => (
              <span key={part}>
                {i < arr.length - 1 ? (
                  <>
                    {part}.<br />
                  </>
                ) : (
                  <span className="lp-led-shimmer">{part}</span>
                )}
              </span>
            ))}
          </h1>
          <p className="lp-hero-subline">{HERO_COPY.subline}</p>

          <div className="lp-hero-cta-row">
            <LandingButton href="/konfigurator" size="lg">
              {HERO_COPY.ctaPrimary} <ArrowRight size={20} />
            </LandingButton>
            <LandingButton href="#features" variant="ghost" size="lg">
              {HERO_COPY.ctaSecondary}
            </LandingButton>
          </div>
        </div>

        <div className="lp-hero-ref-visual">
          <div className="lp-hero-image-frame">
            <Image
              src={LANDING_IMAGES.hero}
              alt="BraceLED LED Armband in der Crowd"
              width={730}
              height={878}
              priority
              className="lp-hero-main-img"
            />
            <div className="lp-hero-image-ring" />
          </div>
        </div>
      </div>

      <a href="#features" className="lp-scroll-hint" aria-label="Weiter scrollen">
        <ChevronDown size={28} />
      </a>
    </section>
  )
}

function UspStrip() {
  const items = [
    ...USP_ITEMS.map((u) => u.title),
    "DMX · App · Fernbedienung",
    "Bis 250 m Reichweite",
    "Kauf & Miete · B2B netto",
  ]

  return (
    <div className="lp-trust-strip">
      <div className="lp-container lp-trust-inner">
        {items.map((t) => (
          <span key={t}>
            <Check size={14} /> {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function AboutSection() {
  return (
    <section id="ueber" className="lp-section">
      <Image src={LANDING_IMAGES.dust} alt="" width={500} height={500} className="lp-section-dust" aria-hidden />
      <div className="lp-container lp-about-layout">
        <LandingReveal>
          <div className="lp-about-visual">
            <Image
              src={LANDING_IMAGES.tisch}
              alt="BraceLED Armbänder"
              width={550}
              height={785}
              className="lp-about-img"
            />
            <div className="lp-about-badge">
              <span className="lp-about-badge-tag">BraceLED</span>
              <strong>Neue Funktionen!</strong>
            </div>
            <Image src={LANDING_IMAGES.glow} alt="" width={120} height={120} className="lp-about-glow" aria-hidden />
          </div>
        </LandingReveal>

        <LandingReveal delay={120}>
          <FestivaTitle kicker="Über BraceLED" title="Event LED Armbänder" />
          <div className="lp-prose">
            <p>
              Wir haben BraceLED selbst entwickelt, weil wir ein Festival-Leucht-Armband wollten, das
              möglichst viele Features unterstützt, für den Einsatz in Deutschland &amp; Europa konzipiert
              ist und unseren Qualitätsansprüchen entspricht.
            </p>
            <p>
              <strong>Herausgekommen ist BraceLED:</strong> Ein LED-Armband mit austauschbaren
              Batterien, Stand-By-Modus, langer Batterielaufzeit, Abstimmungs-Modus und einer Reichweite
              von bis zu 250 Metern.
            </p>
          </div>
          <LandingButton href="/konfigurator" variant="outline-white">
            Alle Features <ArrowRight size={16} />
          </LandingButton>
        </LandingReveal>
      </div>
    </section>
  )
}

function BenefitsSection() {
  return (
    <section className="lp-section lp-section-purple">
      <div className="lp-container">
        <LandingReveal>
          <FestivaTitle
            kicker="Action für die Crowd!"
            title={
              <>
                LED Armbänder
                <br />
                jetzt mieten oder kaufen!
              </>
            }
            align="center"
            light
          />
        </LandingReveal>

        <div className="lp-benefit-grid">
          {BENEFIT_ITEMS.map((item, i) => {
            const Icon = BENEFIT_ICONS[i]
            return (
              <LandingReveal key={item.title} delay={i * 100}>
                <div className="lp-benefit-card">
                  <Image src={item.image} alt="" fill className="lp-benefit-bg" />
                  <div className="lp-benefit-overlay" />
                  <div className="lp-benefit-content">
                    <div className="lp-benefit-icon">
                      <Icon size={24} />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <Link href="/konfigurator" className="lp-benefit-link">
                      {item.link} <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </LandingReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ShowSection() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-show-block">
          <div className="lp-show-visual">
            <Image src={LANDING_IMAGES.hero} alt="LED Show" fill style={{ objectFit: "cover" }} />
            <div className="lp-show-visual-overlay" />
          </div>
          <div className="lp-show-content">
            <LandingReveal>
              <FestivaTitle
                kicker="Ferngesteuerte Event Armbänder"
                title="Inszenierung wie bei Konzerten: LED Armbänder auch auf Deinem Event!"
                light
              />
              <p className="lp-prose light">
                Nicht nur auf den großen Stadion-Konzerten wirken LED-Armbänder genial. Auch auf
                Kongressen, dem Jahres-Kick-Off oder Festivals funktionieren die Armbänder ferngesteuert
                perfekt!
              </p>
              <div className="lp-show-features">
                <div className="lp-show-feat">
                  <Radio size={20} />
                  <div>
                    <strong>In jedes Event integrierbar</strong>
                    <span>DMX, App oder Fernbedienung</span>
                  </div>
                </div>
                <div className="lp-show-feat">
                  <Sparkles size={20} />
                  <div>
                    <strong>8 verschiedene Modi</strong>
                    <span>Voting, Gewinnspiel, Timer uvm.</span>
                  </div>
                </div>
              </div>
            </LandingReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatsSection() {
  return (
    <section className="lp-stats-section">
      <div className="lp-container lp-stats-inner">
        <LandingReveal>
          <FestivaTitle kicker="LED Leuchtarmbänder" title="Wann findet Dein nächstes Event statt?" align="center" light />
        </LandingReveal>
        <LandingReveal delay={100}>
          <div className="lp-stat-ring">
            <p className="lp-stat-num">
              <Counter target={1000} suffix="+" />
            </p>
            <p className="lp-stat-label">LED-Bändchen auf Lager</p>
          </div>
        </LandingReveal>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="lp-section">
      <div className="lp-container">
        <SectionHeader
          label="Details"
          title={
            <>
              Details zu unseren
              <br />
              LED Eventarmbändern
            </>
          }
        />
        <div className="lp-feature-grid">
          {FEATURE_CARDS.map((card, i) => (
            <LandingReveal key={card.title} delay={i * 70}>
              <article className="lp-feature-card-lg">
                <div className="lp-feature-card-lg-img">
                  <Image src={card.image} alt={card.title} fill sizes="(max-width:768px) 100vw, 33vw" />
                </div>
                <div className="lp-feature-card-lg-body">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              </article>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function TechSection() {
  const accordionItems = TECH_ACCORDION.map((item) => ({
    question: item.title,
    answer: item.content,
  }))

  return (
    <section id="technik" className="lp-section lp-section-purple">
      <div className="lp-container">
        <SectionHeader
          label="Technik & Steuerung"
          title="Alles, was Du für die Show brauchst"
          subtitle="Spezifikationen und Setup-Grundlagen — ausführliche DMX-Tabellen und Fixture Files in unserer Tech-Dokumentation."
        />

        <div className="lp-tech-specs">
          {TECH_SPECS.map((spec, i) => (
            <LandingReveal key={spec.label} delay={i * 60}>
              <div className="lp-tech-spec-card">
                <p className="lp-tech-spec-value">{spec.value}</p>
                <p className="lp-tech-spec-label">{spec.label}</p>
                <p className="lp-tech-spec-hint">{spec.hint}</p>
              </div>
            </LandingReveal>
          ))}
        </div>

        <div className="lp-tech-features">
          {TECH_FEATURES.map((feat, i) => (
            <LandingReveal key={feat.title} delay={i * 80}>
              <div className="lp-tech-feat-card">
                <h3>{feat.title}</h3>
                <p>{feat.description}</p>
              </div>
            </LandingReveal>
          ))}
        </div>

        <LandingReveal delay={100}>
          <LandingFaq items={accordionItems} />
          <div className="lp-tech-doc-row">
            <a href={TECH_DOC_URL} target="_blank" rel="noopener noreferrer" className="lp-tech-doc-link">
              Vollständige Tech-Dokumentation <ArrowRight size={16} />
            </a>
            <LandingButton href="/konfigurator" size="sm">
              {HERO_COPY.ctaPrimary} <ArrowRight size={16} />
            </LandingButton>
          </div>
        </LandingReveal>
      </div>
    </section>
  )
}

function MarqueeSection() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div className="lp-marquee-band">
      <div className="lp-marquee-track">
        {items.map((item, i) => (
          <span key={`${item}-${i}`}>
            <em className="lp-marquee-star">✦</em>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function PricingSection({ pricing }: { pricing: LandingPriceTier[] }) {
  const tierClass = ["lp-tier-kaufen", "lp-tier-mieten", "lp-tier-bedruckt"]
  return (
    <section id="preise" className="lp-section lp-section-purple">
      <div className="lp-container">
        <SectionHeader
          label="Preise & Konfiguration"
          title="Stelle Dein Paket zusammen"
          subtitle="Keine festen Pakete — Du wählst Menge, Modus, Steuerung, Druck und Lieferung. Die Preis-Engine rechnet live im Konfigurator. Alle Preise netto, Verkauf nur an Unternehmen."
        />
        <div className="lp-pricing-row">
          {pricing.map((tier, i) => (
            <LandingReveal key={tier.id} delay={i * 100}>
              <div className={cn("lp-price-tier", tierClass[i], tier.highlighted && "featured")}>
                {tier.highlighted && <span className="lp-tier-popular">Beliebt</span>}
                <div className="lp-tier-head">
                  <h3>{tier.name}</h3>
                </div>
                <div className="lp-tier-body">
                  <div className="lp-tier-price">
                    <span className="lp-tier-ab">ab</span>
                    <span className="lp-tier-amount">{tier.priceLabel.replace("ab ", "")}</span>
                    <span className="lp-tier-unit">/ Stk</span>
                  </div>
                  <p className="lp-tier-hint">{tier.priceHint}</p>
                  <p className="lp-tier-ship">{tier.delivery}</p>
                  <ul>
                    {tier.features.map((f) => (
                      <li key={f}>
                        <Check size={16} /> {f}
                      </li>
                    ))}
                  </ul>
                  <LandingButton href="/konfigurator" className="lp-btn-block" variant={tier.highlighted ? "primary" : "ghost"}>
                    Konfigurieren
                  </LandingButton>
                </div>
              </div>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <SectionHeader
          label="Anwendungsbeispiele"
          title={
            <>
              So setzen Kunden
              <br />
              BraceLED ein
            </>
          }
        />
        <div className="lp-testimonial-grid">
          {TESTIMONIALS.map((t, i) => (
            <LandingReveal key={t.author} delay={i * 100}>
              <blockquote className="lp-testimonial">
                <p>&ldquo;{t.quote}&rdquo;</p>
                <footer>{t.author}</footer>
              </blockquote>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <section id="faq" className="lp-section">
      <div className="lp-container lp-faq-layout">
        <LandingReveal>
          <FestivaTitle kicker="Deine Fragen.." title="Lass uns direkt Deine Fragen zu leuchtenden Event Armbändern beantworten!" />
          <LandingButton href="/konfigurator" size="lg" className="lp-faq-cta">
            {HERO_COPY.ctaPrimary} <ArrowRight size={18} />
          </LandingButton>
          <Image src={LANDING_IMAGES.contactDeco} alt="" width={200} height={200} className="lp-faq-deco" aria-hidden />
        </LandingReveal>
        <LandingReveal delay={120}>
          <LandingFaq items={FAQ_ITEMS} />
        </LandingReveal>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="lp-final-cta">
      <Image src={LANDING_IMAGES.dustFooter} alt="" fill className="lp-final-dust" aria-hidden />
      <div className="lp-container lp-final-inner">
        <LandingReveal>
          <FestivaTitle
            kicker="Auf geht´s!"
            title={
              <>
                Bring die Welt
                <br />
                <span className="lp-led-shimmer">zum Leuchten</span>
              </>
            }
            align="center"
            light
          />
          <p className="lp-final-sub">Konfiguriere Dein Event-Paket mit Live-Preisberechnung.</p>
          <div className="lp-final-btns">
            <LandingButton href="/konfigurator" size="lg">
              Zum Konfigurator <ArrowRight size={18} />
            </LandingButton>
            <LandingButton href={`mailto:${EMAIL_INFO}`} variant="outline-white" size="lg">
              <Mail size={18} /> Kontakt
            </LandingButton>
          </div>
        </LandingReveal>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-top">
          <BraceledLogo size="footer" showByline={false} />
          <div className="lp-footer-links">
            <a href={`mailto:${EMAIL_INFO}`}>
              <Mail size={16} /> {EMAIL_INFO}
            </a>
            <span>
              <MapPin size={16} /> Rhein-Main-Gebiet
            </span>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <Link href="/agb">AGB</Link>
            <Link href="/konfigurator">Konfigurator</Link>
          </div>
        </div>
        <div className="lp-footer-social">
          {["Events", "Festivals", "Corporate"].map((s) => (
            <div key={s} className="lp-footer-stat">
              <strong>1k+</strong>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <p className="lp-footer-copy">
          © {new Date().getFullYear()} WIRKUNG digital · BraceLED · Alle Preise netto, zzgl. MwSt.
        </p>
      </div>
    </footer>
  )
}
