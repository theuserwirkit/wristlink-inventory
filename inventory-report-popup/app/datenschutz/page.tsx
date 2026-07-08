import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Datenschutz – BraceLED",
  robots: { index: false },
}

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Link href="/" className="mb-8 inline-block text-sm text-cyan-400 hover:underline">
          ← Zurück zur Startseite
        </Link>
        <h1 className="mb-8 text-3xl font-bold">Datenschutzerklärung</h1>
        <div className="prose prose-invert max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Datenschutz auf einen Blick</h2>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen
              Daten passiert, wenn Sie diese Website besuchen oder den Konfigurator nutzen. Personenbezogene
              Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Verantwortlicher</h2>
            <p>
              WIRKUNG digital GmbH
              <br />
              Hildegard-von-Bingen-Straße 1
              <br />
              61273 Wehrheim
              <br />
              Deutschland
            </p>
            <p className="mt-4">
              Telefon: 0800 WIRKUNG
              <br />
              E-Mail:{" "}
              <a href="mailto:info@wirkung-digital.de" className="text-cyan-400 hover:underline">
                info@wirkung-digital.de
              </a>
            </p>
            <p className="mt-4">
              Datenschutzanfragen:{" "}
              <a href="mailto:datenschutz@wirkung.digital" className="text-cyan-400 hover:underline">
                datenschutz@wirkung.digital
              </a>
            </p>
            <p className="mt-4">
              Datenschutzbeauftragter: rolf.weiss@uds-gfu.de
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Arten der verarbeiteten Daten</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Kontaktdaten: Name, E-Mail-Adresse, Firma, Telefonnummer</li>
              <li>Konfigurationsdaten: Menge, Modus, Druckoptionen, Lieferwünsche</li>
              <li>Technische Daten: IP-Adresse, Browser-Informationen, Geräteinformationen</li>
              <li>Nutzungsdaten: Besuchte Seiten, Verweildauer</li>
              <li>Zahlungsdaten: bei Online-Zahlung über Stripe (keine vollständigen Kartendaten bei uns)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Zwecke der Datenverarbeitung</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Bereitstellung und Sicherheit der Website (Art. 6 Abs. 1 lit. f DSGVO)</li>
              <li>Bearbeitung von Angebotsanfragen und Konfigurationen (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Vertragserfüllung und Zahlungsabwicklung (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Analyse und Optimierung der Website nur mit Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Konfigurator & Angebotsanfragen</h2>
            <p>
              Im Konfigurator erfasste Daten (E-Mail, Firma, Konfiguration, ggf. Druckdateien) werden zur
              Bearbeitung Ihrer Anfrage, Erstellung von Angeboten und – bei Auftragserteilung – zur
              Vertragsabwicklung verwendet. Die Daten werden nur so lange gespeichert, wie es für den jeweiligen
              Zweck erforderlich ist (Anfragen in der Regel bis zu 3 Jahre nach Bearbeitung).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Hosting</h2>
            <p>
              Diese Website wird bei Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA gehostet.
              Dabei werden technische Zugriffsdaten (z. B. IP-Adresse, Zeitstempel) in Server-Log-Dateien
              verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
              sicheren und effizienten Bereitstellung). Es besteht ein Vertrag über Auftragsverarbeitung mit
              dem Hoster.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Zahlungsdienstleister</h2>
            <p>
              Für Online-Zahlungen nutzen wir Stripe (Stripe Payments Europe, Ltd.). Zahlungsdaten werden
              direkt an Stripe übermittelt. Wir speichern keine vollständigen Kreditkartendaten. Rechtsgrundlage
              ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Cookies</h2>
            <p>
              Technisch notwendige Cookies werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert.
              Analyse- und Marketing-Cookies setzen wir nur mit Ihrer ausdrücklichen Einwilligung (Art. 6 Abs.
              1 lit. a DSGVO). Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies
              informiert werden und diese nur im Einzelfall erlauben.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Server-Log-Dateien</h2>
            <p>
              Der Provider erhebt automatisch Informationen in Server-Log-Dateien: Browsertyp, Betriebssystem,
              Referrer-URL, Hostname, Uhrzeit der Serveranfrage und IP-Adresse. Diese Daten werden nicht mit
              anderen Datenquellen zusammengeführt. Speicherdauer: in der Regel 30 Tage.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Ihre Rechte</h2>
            <p>Sie haben jederzeit das Recht auf:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Auskunft über Ihre gespeicherten personenbezogenen Daten</li>
              <li>Berichtigung unrichtiger Daten</li>
              <li>Löschung Ihrer Daten unter bestimmten Voraussetzungen</li>
              <li>Einschränkung der Verarbeitung</li>
              <li>Datenübertragbarkeit</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
              <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft</li>
            </ul>
            <p className="mt-4">
              Kontakt:{" "}
              <a href="mailto:datenschutz@wirkung.digital" className="text-cyan-400 hover:underline">
                datenschutz@wirkung.digital
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. Beschwerderecht</h2>
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren:
            </p>
            <p className="mt-2">
              Hessischer Beauftragter für Datenschutz und Informationsfreiheit
              <br />
              Postfach 31 63, 65021 Wiesbaden
              <br />
              Telefon: 0611 1408-0
              <br />
              E-Mail:{" "}
              <a href="mailto:poststelle@datenschutz.hessen.de" className="text-cyan-400 hover:underline">
                poststelle@datenschutz.hessen.de
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">12. SSL-/TLS-Verschlüsselung</h2>
            <p>
              Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte
              Verbindung erkennen Sie am Schloss-Symbol in der Browserzeile und an „https://" in der Adresszeile.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">13. Änderungen</h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen. Stand: Juli 2026.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
