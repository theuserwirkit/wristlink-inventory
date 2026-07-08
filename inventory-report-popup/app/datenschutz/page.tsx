import Link from "next/link"
import type { Metadata } from "next"
import { EMAIL_DATENSCHUTZ, EMAIL_INFO, EMAIL_KONFIGURATOR } from "@/lib/contact-emails"

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
              <a href={`mailto:${EMAIL_INFO}`} className="text-cyan-400 hover:underline">
                {EMAIL_INFO}
              </a>
            </p>
            <p className="mt-4">
              Datenschutzanfragen:{" "}
              <a href={`mailto:${EMAIL_DATENSCHUTZ}`} className="text-cyan-400 hover:underline">
                {EMAIL_DATENSCHUTZ}
              </a>
            </p>
            <p className="mt-4">Datenschutzbeauftragter: rolf.weiss@uds-gfu.de</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Arten der verarbeiteten Daten</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Kontaktdaten: Name, E-Mail-Adresse, Firma, Telefonnummer</li>
              <li>Konfigurationsdaten: Menge, Modus, Druckoptionen, Lieferwünsche, hochgeladene Druckdateien</li>
              <li>Einwilligungsdaten: Marketing-Einwilligung, B2B-Bestätigung, Consent-Textversion, IP-Adresse beim Consent</li>
              <li>Technische Daten: IP-Adresse, Browser-Informationen, Geräteinformationen</li>
              <li>Nutzungsdaten: Besuchte Seiten, Verweildauer (nur mit Einwilligung)</li>
              <li>Zahlungsdaten: bei Online-Zahlung über Stripe (keine vollständigen Kartendaten bei uns)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Zwecke und Rechtsgrundlagen</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Bereitstellung und Sicherheit der Website (Art. 6 Abs. 1 lit. f DSGVO)</li>
              <li>Bearbeitung von Angebotsanfragen und Konfigurationen (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Vertragserfüllung und Zahlungsabwicklung (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Marketing per E-Mail nur mit Einwilligung nach Double-Opt-In (Art. 6 Abs. 1 lit. a DSGVO)</li>
              <li>Analyse und Optimierung der Website nur mit Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Konfigurator, Double-Opt-In & Angebotsanfragen</h2>
            <p>
              Im Konfigurator erfassen wir zunächst Ihre Kontaktdaten (Name, Firma, Telefon, E-Mail) zur
              Bearbeitung Ihrer Anfrage. Die Nutzung setzt eine Bestätigung Ihrer E-Mail-Adresse per
              Double-Opt-In voraus. Bis zur Bestätigung werden Kontaktdaten bereits gespeichert, um den
              Bestätigungslink zuzusenden und Missbrauch zu verhindern (Art. 6 Abs. 1 lit. b/f DSGVO).
            </p>
            <p className="mt-2">
              Eine optionale Marketing-Einwilligung wird erst nach erfolgreicher E-Mail-Bestätigung wirksam
              gespeichert. Konfigurationsdaten und Angebotsanfragen werden zur Erstellung von Angeboten und –
              bei Auftragserteilung – zur Vertragsabwicklung verwendet. Speicherdauer: Anfragen in der Regel
              bis zu 3 Jahre nach Bearbeitung, sofern keine längeren gesetzlichen Aufbewahrungsfristen gelten.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Hosting & Content Delivery</h2>
            <p>
              Diese Website wird bei Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA gehostet.
              Dabei werden technische Zugriffsdaten (z. B. IP-Adresse, Zeitstempel) in Server-Log-Dateien
              verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Es besteht ein Vertrag über
              Auftragsverarbeitung mit dem Hoster. Bei Übermittlungen in die USA stützen wir uns auf die
              EU-Standardvertragsklauseln (SCCs) gemäß Art. 46 DSGVO.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Datenbank (Neon)</h2>
            <p>
              Lead-, Anfrage- und Konfigurationsdaten werden in einer PostgreSQL-Datenbank bei Neon Tech Inc.
              (USA/EU-Region je nach Konfiguration) gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b/f DSGVO.
              Es besteht ein Vertrag über Auftragsverarbeitung. Bei Übermittlungen in Drittländer werden
              geeignete Garantien (SCCs) eingesetzt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. E-Mail-Versand (Resend)</h2>
            <p>
              Für Double-Opt-In, Angebots- und Transaktions-E-Mails nutzen wir Resend Inc. (USA).
              Absenderadresse: {EMAIL_KONFIGURATOR}. Dabei werden E-Mail-Adresse und Inhalte der
              Nachricht verarbeitet. Rechtsgrundlage: Art. 6 Abs. 1 lit. b/f DSGVO. Es besteht ein
              Vertrag über Auftragsverarbeitung. Übermittlungen in die USA erfolgen auf Basis der
              EU-Standardvertragsklauseln.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Rate-Limiting (Upstash)</h2>
            <p>
              Zum Schutz vor Missbrauch kann die IP-Adresse kurzzeitig bei Upstash Redis (USA) verarbeitet
              werden. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (IT-Sicherheit). Es besteht ein Vertrag über
              Auftragsverarbeitung.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Zahlungsdienstleister (Stripe)</h2>
            <p>
              Für Online-Zahlungen nutzen wir Stripe (Stripe Payments Europe, Ltd.). Zahlungsdaten werden
              direkt an Stripe übermittelt. Wir speichern keine vollständigen Kreditkartendaten. Rechtsgrundlage
              ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. Cookies & lokale Speicherung</h2>
            <p>Wir setzen folgende technisch notwendige Cookies ein:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>wristlink_lead_session</strong> – Session nach E-Mail-Bestätigung im Konfigurator
                (Laufzeit: 7 Tage, HttpOnly)
              </li>
              <li>
                <strong>wristlink_auth</strong> – Admin-Session für interne Verwaltung (nur Mitarbeiter)
              </li>
            </ul>
            <p className="mt-4">
              Technisch notwendige Cookies werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert.
              Analyse- und Marketing-Cookies setzen wir derzeit nicht ein. Sollten wir diese künftig nutzen,
              holen wir vorher Ihre ausdrückliche Einwilligung ein (Art. 6 Abs. 1 lit. a DSGVO, TTDSG).
            </p>
            <p className="mt-2">
              Schriftarten (Google Fonts) werden über Next.js lokal auf unserem Server eingebunden; beim
              Seitenaufruf erfolgt kein Abruf von Google-Servern durch Ihren Browser.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">12. Server-Log-Dateien</h2>
            <p>
              Der Provider erhebt automatisch Informationen in Server-Log-Dateien: Browsertyp, Betriebssystem,
              Referrer-URL, Hostname, Uhrzeit der Serveranfrage und IP-Adresse. Diese Daten werden nicht mit
              anderen Datenquellen zusammengeführt. Speicherdauer: in der Regel 30 Tage.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">13. Ihre Rechte</h2>
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
              <a href={`mailto:${EMAIL_DATENSCHUTZ}`} className="text-cyan-400 hover:underline">
                {EMAIL_DATENSCHUTZ}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">14. Beschwerderecht</h2>
            <p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren:</p>
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
            <h2 className="text-lg font-semibold text-white">15. SSL-/TLS-Verschlüsselung</h2>
            <p>
              Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte
              Verbindung erkennen Sie am Schloss-Symbol in der Browserzeile und an „https://" in der Adresszeile.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">16. Änderungen</h2>
            <p>Wir behalten uns vor, diese Datenschutzerklärung anzupassen. Stand: Juli 2026.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
