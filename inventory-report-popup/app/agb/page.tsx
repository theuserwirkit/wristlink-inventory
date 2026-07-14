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
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Angebote, Lieferungen und
              Leistungen der WIRKUNG digital GmbH, Hildegard-von-Bingen-Straße 1, 61273 Wehrheim
              („Anbieter“) über die Website BraceLED, den Online-Konfigurator und verbundene
              Kommunikationskanäle ausschließlich gegenüber Unternehmern im Sinne des § 14 BGB
              („Kunde“).
            </p>
            <p className="mt-2">
              Verbraucher im Sinne des § 13 BGB sind von der Nutzung des Konfigurators und der
              Beauftragung ausgeschlossen. Der Kunde bestätigt bei der Anfrage, gewerblich zu handeln.
            </p>
            <p className="mt-2">
              Abweichende oder entgegenstehende Bedingungen des Kunden gelten nur, wenn der Anbieter
              diesen ausdrücklich schriftlich zugestimmt hat. Diese AGB gelten auch für künftige
              Geschäfte, sofern der Kunde nicht ausdrücklich widerspricht.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Angebote und Vertragsschluss</h2>
            <p>
              Die Darstellung von Produkten, Preisen und Verfügbarkeitshinweisen auf der Website stellt
              kein bindendes Angebot dar. Konfigurationen, Preisberechnungen und
              Verfügbarkeitsanzeigen im Online-Konfigurator sind unverbindlich, bis der Anbieter ein
              individuelles schriftliches Angebot (PDF und/oder E-Mail) übermittelt.
            </p>
            <p className="mt-2">
              Ein Vertrag kommt erst zustande, wenn der Kunde ein Angebot des Anbieters schriftlich oder
              in Textform annimmt und der Anbieter die Annahme bestätigt oder mit der Ausführung beginnt
              (z. B. Freigabe, Zahlungsaufforderung, Produktionsstart). Mündliche Nebenabreden bedürfen
              zu ihrer Wirksamkeit der schriftlichen Bestätigung durch den Anbieter.
            </p>
            <p className="mt-2">
              Alle Preise verstehen sich in Euro, netto zzgl. der gesetzlichen Mehrwertsteuer, sofern
              nicht im Angebot ausdrücklich anders ausgewiesen. Bei Zahlung in Deutschland wird die
              gesetzliche Mehrwertsteuer (derzeit 19 %) hinzugerechnet.
            </p>
            <p className="mt-2">
              Maßgeblich für Umfang und Preis sind das angenommene Angebot und die Auftragsbestätigung.
              Abweichungen zwischen Konfigurator und Angebot gehen zu Lasten des Angebots.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Leistungsumfang, Verfügbarkeit und Reservierung</h2>
            <p>
              Der Anbieter liefert LED-Armbänder und zugehöriges Zubehör (z. B. Basis-Stationen,
              Controller) im gewählten Modus zur Miete oder zum Kauf. Optionale Leistungen wie
              Bedruckung, Probedruck, Gruppenprogrammierung, Lieferpakete, Flex-Rückgabe oder
              Techniker-Einsätze werden nur vereinbart, wenn sie im Angebot ausdrücklich enthalten sind.
            </p>
            <p className="mt-2">
              Verfügbarkeitsprüfungen im Konfigurator dienen der Orientierung und stellen keine
              verbindliche Zusage dar. Bei kurzem Vorlauf bis zum Event kann die Realisierbarkeit
              eingeschränkt sein; der Anbieter prüft dies im Rahmen der Angebotserstellung.
            </p>
            <p className="mt-2">
              Mit Absenden einer Anfrage kann der Anbieter eine vorläufige Bestandsreservierung
              („Hold“) vornehmen. Eine verbindliche Belegung des Bestands erfolgt erst nach Zahlung
              bzw. vertraglich vereinbarter Zahlungsmodalität und Freigabe durch den Anbieter.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Miete</h2>
            <p>
              Bei Mietaufträgen überlässt der Anbieter dem Kunden die vereinbarten LED-Armbänder und
              ggf. Miet-Zubehör (z. B. PRO Basis-Station) für den im Angebot genannten Zeitraum,
              in der Regel orientiert am Eventzeitraum (Lieferung vor bzw. zu Eventbeginn, Rückgabe nach
              Eventende).
            </p>
            <p className="mt-2">
              Die Mietsache bleibt jederzeit Eigentum des Anbieters. Der Kunde erhält ein einfaches
              Nutzungsrecht für den vereinbarten Zweck am Veranstaltungsort. Eine Weitervermietung,
              Weitergabe an Dritte oder Nutzung außerhalb des vereinbarten Zwecks ist ohne
              vorherige schriftliche Zustimmung untersagt.
            </p>
            <p className="mt-2">
              Der Kunde ist verpflichtet, die Mietsache sorgfältig zu behandeln, vor Feuchtigkeit,
              Stößen und unsachgemäßer Handhabung zu schützen und nur gemäß den mitgelieferten
              Hinweisen zu betreiben. Batterien und Verbrauchsmaterial sind im vereinbarten Umfang
              vom Anbieter bereitzustellen; ein Batterietausch während der Mietzeit kann gesondert
              vereinbart oder vom Anbieter angeordnet werden.
            </p>
            <p className="mt-2">
              Konkrete Mietdauer, Liefer- und Rückgabefristen ergeben sich aus dem Angebot und den
              gewählten Lieferpaketen (siehe Abschnitt 6 und 8).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Kauf</h2>
            <p>
              Bei Kaufaufträgen geht das Eigentum an der Ware mit vollständiger Bezahlung und Übergabe
              auf den Kunden über, vorbehaltlich eines Eigentumsvorbehalts (Abschnitt 11).
            </p>
            <p className="mt-2">
              Individuelle Bedruckungen, Logo-Uploads und Probedrucke werden nur auf Grundlage der vom
              Kunden bereitgestellten Daten ausgeführt. Der Kunde versichert, über die erforderlichen
              Rechte an den übermittelten Inhalten zu verfügen und stellt den Anbieter von Ansprüchen
              Dritter wegen Rechtsverletzungen frei, soweit diese auf fehlerhaften oder rechtswidrigen
              Kundenangaben beruhen.
            </p>
            <p className="mt-2">
              Farbabweichungen im Druck, die im Rahmen üblicher Produktionstoleranzen liegen, stellen
              keinen Mangel dar, sofern der Kunde keinen verbindlichen Farbstandard schriftlich
              vereinbart hat.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Lieferung, Lieferpakete und Verfügbarkeit</h2>
            <p>
              Lieferung erfolgt nach Wahl des im Angebot vereinbarten Lieferpakets (z. B. Regulär,
              Express, Eilauftrag) an die vereinbarte Lieferadresse in Deutschland, sofern nicht
              anders vereinbart. Mindestvorlaufzeiten und Produktionszeiten ergeben sich aus dem
              gewählten Paket und dem Angebot.
            </p>
            <p className="mt-2">
              Anlieferungs- und Rücksendetermine sind unverbindlich, sofern im Angebot nicht
              ausdrücklich als verbindlich bezeichnet. Bei Eilaufträgen können bestimmte Optionen
              (z. B. Bedruckung) ausgeschlossen sein.
            </p>
            <p className="mt-2">
              Teillieferungen sind zulässig, soweit dem Kunden zumutbar. Der Versand erfolgt über
              vom Anbieter beauftragte Logistikdienstleister (z. B. UPS, DHL, TNT). Gefahr und
              Zufall gehen mit Übergabe an den Transporteur auf den Kunden über, sofern nicht
              gesetzlich anders zwingend vorgeschrieben.
            </p>
            <p className="mt-2">
              Verzögerungen durch höhere Gewalt, Streik, Lieferengpässe bei Zulieferern oder
              behördliche Anordnungen berechtigen den Anbieter zur angemessenen Verlängerung der
              Lieferfrist; der Kunde wird unverzüglich informiert.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Fulfillment und Kommunikation</h2>
            <p>
              Nach Vertragsschluss und Zahlung informiert der Anbieter den Kunden über den
              Bearbeitungsstand (z. B. Vorbereitung, Bedruckung, Verpackung, Versand, Rücksendung)
              per E-Mail und über eine passwortgeschützte Kunden-Statusseite. Der Zugang kann an die
              im Auftrag hinterlegte Firmenadresse gebunden sein.
            </p>
            <p className="mt-2">
              Der Kunde stellt eine erreichbare Ansprechperson und korrekte Kontakt- sowie
              Lieferadressen bereit und reagiert zeitnah auf Rückfragen, die für die Ausführung
              erforderlich sind. Verzögerungen infolge unvollständiger oder fehlerhafter Angaben
              des Kunden gehen nicht zu Lasten des Anbieters.
            </p>
            <p className="mt-2">
              Tracking-Informationen werden nach Versand mitgeteilt. Der Kunde prüft die Lieferung
              unverzüglich auf offensichtliche Transportschäden und meldet diese unverzüglich.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Rückgabe bei Miete</h2>
            <p>
              Bei Mietaufträgen hat der Kunde die Mietsache vollständig, in vertragsgemäßem Zustand
              und in der vereinbarten Verpackung innerhalb der im Angebot genannten Rückgabefrist an
              den Anbieter zurückzusenden oder – sofern vereinbart – zur Abholung bereitzustellen.
            </p>
            <p className="mt-2">
              Standardmäßig ist die Rücksendung innerhalb von drei Werktagen nach Eventende
              vorzunehmen, sofern im Angebot nicht ein abweichendes Lieferpaket oder eine
              Flex-Rückgabe vereinbart wurde. Bei Flex-Rückgabe gelten die im Angebot genannten
              verlängerten Fristen.
            </p>
            <p className="mt-2">
              Der Anbieter stellt nach Möglichkeit Versandmaterial oder Rücksendeinstruktionen zur
              Verfügung. Kosten der Rücksendung trägt der Kunde, sofern nicht im Angebot anders
              geregelt. Der Kunde dokumentiert den ordnungsgemäßen Versand (z. B. Sendungsnummer).
            </p>
            <p className="mt-2">
              Mit Eingang und Prüfung der Rücksendung wird der Mietvertrag hinsichtlich der
              zurückgegebenen Ware als beendet betrachtet, vorbehaltlich etwaiger Schadens- oder
              Verzugsansprüche (Abschnitt 9).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Schäden, Verlust, Verspätung und Batterietausch</h2>
            <p>
              Der Kunde haftet für Verlust, Diebstahl, Beschädigung oder unsachgemäße Nutzung der
              überlassenen Ware während der Mietzeit sowie für verspätete Rückgabe. Normale
              Gebrauchsspuren, die bei bestimmungsgemäßer Nutzung entstehen, werden nicht als Schaden
              gewertet.
            </p>
            <p className="mt-2">
              Bei Schäden oder Verlust kann der Anbieter Ersatz in Höhe der Wiederbeschaffungs- oder
              Reparaturkosten sowie angemessene Aufwände für Prüfung und Logistik verlangen. Die
              konkrete Höhe oder Pauschalen werden im Angebot oder in der Auftragsbestätigung
              ausgewiesen, soweit möglich.
            </p>
            <p className="mt-2">
              Verspätete Rückgabe berechtigt den Anbieter zur Berechnung einer angemessenen
              Nutzungsentschädigung für jeden angefangenen Tag der Verspätung, zusätzlich zu
              eventuellen Schadensersatzansprüchen wegen entgangener Weitervermietung.
            </p>
            <p className="mt-2">
              Batterietausch während der Mietzeit erfolgt nach Absprache oder auf Anweisung des
              Anbieters. Sofern der Tausch auf unsachgemäße Lagerung oder Nutzung zurückzuführen ist,
              können die Kosten dem Kunden in Rechnung gestellt werden.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Zahlung</h2>
            <p>
              Zahlungsbedingungen (Fälligkeit, Anzahlung, Restzahlung) ergeben sich aus dem Angebot.
              Online-Zahlungen können über den Zahlungsdienstleister Stripe abgewickelt werden. Bei
              Nutzung von Stripe gelten ergänzend die Bedingungen des Zahlungsdienstleisters; der
              Kunde wird zum externen Zahlungsformular weitergeleitet.
            </p>
            <p className="mt-2">
              Alternativ kann der Anbieter Zahlung per Überweisung auf ein angegebenes Geschäftskonto
              vereinbaren. Ein Leistungsbeginn kann von Zahlungseingang abhängig gemacht werden.
            </p>
            <p className="mt-2">
              Gerät der Kunde in Zahlungsverzug, ist der Anbieter berechtigt, Verzugszinsen in
              gesetzlicher Höhe zu berechnen, die Erfüllung bis zum Zahlungseingang auszusetzen und
              vom Vertrag zurückzutreten, sofern eine angemessene Nachfrist erfolglos verstrichen ist.
            </p>
            <p className="mt-2">
              Der Kunde kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen
              aufrechnen. Ein Zurückbehaltungsrecht besteht nur wegen Gegenansprüchen aus demselben
              Vertragsverhältnis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. Eigentum und Eigentumsvorbehalt</h2>
            <p>
              Bei Mietaufträgen verbleibt die Mietsache stets im Eigentum des Anbieters.
            </p>
            <p className="mt-2">
              Bei Kaufaufträgen bleibt die gelieferte Ware bis zur vollständigen Bezahlung aller
              Forderungen aus der jeweiligen Geschäftsbeziehung Eigentum des Anbieters
              (verlängerter Eigentumsvorbehalt). Der Kunde verwahrt die Vorbehaltsware pfleglich
              und stellt sie auf erstes Verlangen heraus.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">12. Gewährleistung (B2B)</h2>
            <p>
              Es gelten die gesetzlichen Gewährleistungsrechte im unternehmerischen Geschäftsverkehr.
              Der Kunde hat offensichtliche Mängel unverzüglich, spätestens jedoch innerhalb der
              gesetzlichen Untersuchungs- und Rügefristen nach § 377 HGB, schriftlich anzuzeigen;
              andernfalls gilt die Ware als genehmigt.
            </p>
            <p className="mt-2">
              Die Verjährungsfrist für Mängelansprüche bei Kauf beträgt 12 Monate ab Lieferung,
              sofern gesetzlich zulässig. Bei Miete hat der Kunde während der Mietzeit auftretende
              Funktionsmängel unverzüglich zu melden; der Anbieter behebt berechtigte Mängel nach
              Wahl durch Nachbesserung, Ersatzlieferung oder angemessene Preisminderung im Rahmen
              der gesetzlichen Möglichkeiten.
            </p>
            <p className="mt-2">
              Keine Gewährleistung besteht für Schäden, die auf unsachgemäße Handhabung, eigenmächtige
              Änderungen, Nichtbeachtung der Betriebsanleitung oder äußere Einflüsse (z. B. Störungen
              der Funkumgebung am Event) zurückzuführen sind.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">13. Haftung</h2>
            <p>
              Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei
              Verletzung von Leben, Körper oder Gesundheit. Bei leichter Fahrlässigkeit haftet der
              Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und
              begrenzt auf den vorhersehbaren, typischerweise eintretenden Schaden.
            </p>
            <p className="mt-2">
              Eine Haftung für entgangenen Gewinn, ausgebliebene Event-Wirkung, Folgeschäden aus
              technischen Störungen, Batterielaufzeit oder Funkinterferenzen am Veranstaltungsort ist
              – außer bei Vorsatz oder grober Fahrlässigkeit – ausgeschlossen, soweit gesetzlich
              zulässig.
            </p>
            <p className="mt-2">
              Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt. Für Leistungen Dritter
              (z. B. Techniker-Subunternehmer, Versanddienstleister), die der Anbieter vermittelt,
              haftet der Anbieter nur für die sorgfältige Auswahl, sofern nicht ausdrücklich eine
              eigenständige Verantwortung übernommen wurde.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">14. Datenschutz</h2>
            <p>
              Informationen zur Verarbeitung personenbezogener Daten im Konfigurator, bei
              Angebotsanfragen, Zahlungen und Fulfillment finden Sie in unserer{" "}
              <Link href="/datenschutz" className="text-cyan-400 hover:underline">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">15. Widerruf und Storno (B2B)</h2>
            <p>
              Da der Vertrag ausschließlich mit Unternehmern geschlossen wird, besteht kein
              gesetzliches Widerrufsrecht für Verbraucher. Ein Rücktritt des Kunden von einem
              bereits angenommenen Auftrag bedarf der schriftlichen Zustimmung des Anbieters.
            </p>
            <p className="mt-2">
              Storniert der Kunde nach Vertragsschluss oder tritt er ohne berechtigten Grund zurück,
              können bereits entstandene Kosten (z. B. Produktion, Logistik, Personalbindung)
              in Rechnung gestellt werden. Konkrete Stornobedingungen können im Angebot geregelt
              werden.
            </p>
            <p className="mt-2">
              Der Anbieter kann vom Vertrag zurücktreten, wenn der Kunde wesentliche Pflichten
              verletzt, in Zahlungsverzug gerät oder die Durchführung aus Gründen, die der Kunde zu
              vertreten hat, unmöglich wird.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">16. Streitbeilegung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                className="text-cyan-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://ec.europa.eu/consumers/odr
              </a>
              .
            </p>
            <p className="mt-2">
              Unser Angebot richtet sich ausschließlich an Unternehmer (B2B). Wir sind weder
              verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">17. Schlussbestimmungen</h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts
              (CISG). Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesen AGB
              und den daraus resultierenden Verträgen ist – soweit gesetzlich zulässig – der Sitz
              des Anbieters in Wehrheim; der Anbieter bleibt berechtigt, auch am allgemeinen
              Gerichtsstand des Kunden zu klagen.
            </p>
            <p className="mt-2">
              Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die
              Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen
              Bestimmung tritt eine wirksame Regelung, die dem wirtschaftlichen Zweck am nächsten
              kommt.
            </p>
            <p className="mt-2">
              Der Anbieter kann diese AGB mit Wirkung für die Zukunft anpassen. Für bereits
              geschlossene Verträge gelten die zum Zeitpunkt des Vertragsschlusses maßgeblichen
              Bedingungen, sofern nicht eine Änderung gesetzlich erforderlich ist oder beide
              Parteien ausdrücklich zustimmen.
            </p>
            <p className="mt-4">
              Stand: Juli 2026 · WIRKUNG digital GmbH · Hildegard-von-Bingen-Straße 1, 61273
              Wehrheim ·{" "}
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
