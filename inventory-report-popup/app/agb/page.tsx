import Link from "next/link"
import type { Metadata } from "next"
import { EMAIL_LEGAL } from "@/lib/contact-emails"

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen – BraceLED",
  robots: { index: false },
}

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Link href="/" className="mb-8 inline-block text-sm text-cyan-400 hover:underline">
          ← Zurück zur Startseite
        </Link>
        <h1 className="mb-8 text-3xl font-bold">Allgemeine Geschäftsbedingungen (B2B)</h1>
        <div className="prose prose-invert max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Angebote, Lieferungen und Leistungen
              der WIRKUNG digital GmbH („Anbieter“) über die Website BraceLED und den Online-Konfigurator
              ausschließlich gegenüber Unternehmern im Sinne des § 14 BGB („Kunde“). Verbraucher im Sinne des
              § 13 BGB sind von der Nutzung ausgeschlossen.
            </p>
            <p className="mt-2">
              Abweichende Bedingungen des Kunden gelten nur, wenn der Anbieter diesen ausdrücklich schriftlich
              zugestimmt hat.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Angebote und Vertragsschluss</h2>
            <p>
              Die Darstellung von Produkten und Preisen auf der Website stellt kein bindendes Angebot dar.
              Konfigurationen und Preisberechnungen im Konfigurator sind unverbindlich, bis der Anbieter ein
              schriftliches Angebot (PDF/E-Mail) übermittelt.
            </p>
            <p className="mt-2">
              Ein Vertrag kommt erst zustande, wenn der Kunde ein Angebot des Anbieters schriftlich oder in
              Textform annimmt und der Anbieter die Annahme bestätigt bzw. mit der Ausführung beginnt.
            </p>
            <p className="mt-2">
              Alle Preise verstehen sich in Euro, netto zzgl. der gesetzlichen Mehrwertsteuer, sofern nicht
              anders ausgewiesen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Miete und Kauf</h2>
            <p>
              Je nach gewähltem Modus werden LED-Armbänder und Zubehör zur Miete überlassen oder verkauft.
              Mietzeiträume, Rückgabe, Batterietausch und eventuelle Schadensregelungen ergeben sich aus dem
              jeweiligen Angebot und der Auftragsbestätigung.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Lieferung und Verfügbarkeit</h2>
            <p>
              Lieferzeiten und -arten (Standard, Express, Abholung) werden im Konfigurator und Angebot
              ausgewiesen. Sie sind unverbindlich, sofern nicht ausdrücklich als verbindlich vereinbart.
              Teillieferungen sind zulässig, soweit dem Kunden zumutbar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Zahlung</h2>
            <p>
              Zahlungsbedingungen ergeben sich aus dem Angebot. Online-Zahlungen können über Stripe abgewickelt
              werden. Bei Zahlungsverzug ist der Anbieter berechtigt, Verzugszinsen in gesetzlicher Höhe zu
              berechnen und die Erfüllung bis zum Zahlungseingang auszusetzen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Eigentumsvorbehalt</h2>
            <p>
              Gelieferte Ware bleibt bis zur vollständigen Bezahlung aller Forderungen aus der Geschäftsbeziehung
              Eigentum des Anbieters.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Gewährleistung</h2>
            <p>
              Es gelten die gesetzlichen Gewährleistungsrechte im unternehmerischen Geschäftsverkehr. Die
              Verjährungsfrist für Mängelansprüche beträgt 12 Monate ab Lieferung, sofern gesetzlich zulässig.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Haftung</h2>
            <p>
              Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von
              Leben, Körper oder Gesundheit. Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung
              wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren, typischerweise eintretenden
              Schaden. Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Datenschutz</h2>
            <p>
              Informationen zur Verarbeitung personenbezogener Daten finden Sie in unserer{" "}
              <Link href="/datenschutz" className="text-cyan-400 hover:underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Schlussbestimmungen</h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gerichtsstand
              für Kaufleute ist – soweit zulässig – der Sitz des Anbieters.
            </p>
            <p className="mt-4">
              Stand: Juli 2026 · WIRKUNG digital GmbH ·{" "}
              <a href={`mailto:${EMAIL_LEGAL}`} className="text-cyan-400 hover:underline">
                {EMAIL_LEGAL}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
