import Link from "next/link"
import type { Metadata } from "next"
import { EMAIL_INFO } from "@/lib/contact-emails"

export const metadata: Metadata = {
  title: "Impressum – BraceLED",
  robots: { index: false },
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <Link href="/" className="mb-8 inline-block text-sm text-cyan-400 hover:underline">
          ← Zurück zur Startseite
        </Link>
        <h1 className="mb-8 text-3xl font-bold">Impressum</h1>
        <div className="prose prose-invert max-w-none space-y-8 text-white/70">
          <section>
            <h2 className="text-lg font-semibold text-white">WIRKUNG digital GmbH</h2>
            <p>
              Hildegard-von-Bingen-Straße 1
              <br />
              61273 Wehrheim
              <br />
              Deutschland
            </p>
            <p className="mt-4">
              Handelsregister: HRB 15037
              <br />
              Registergericht: Bad Homburg v.d. Höhe
              <br />
              Geschäftsführer: Jens Schlangenotto, Benjamin Panther
            </p>
            <p className="mt-4">
              E-Mail:{" "}
              <a href={`mailto:${EMAIL_INFO}`} className="text-cyan-400 hover:underline">
                {EMAIL_INFO}
              </a>
              <br />
              Telefon: 0800 WIRKUNG
            </p>
            <p className="mt-4">
              USt-IdNr. gemäß § 27a UStG: DE340166971
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              Verantwortlich für den Inhalt nach Art. 18 Abs. 2 MStV
            </h2>
            <p>
              Sascha Lukas
              <br />
              Hildegard-von-Bingen-Straße 1
              <br />
              61273 Wehrheim
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">EU-Streitschlichtung</h2>
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
            <p className="mt-2">Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              Verbraucherstreitbeilegung / Universalschlichtungsstelle
            </h2>
            <p>
              Unser Angebot richtet sich ausschließlich an Unternehmer (B2B). Wir sind weder verpflichtet noch
              bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Haftungsausschluss</h2>

            <h3 className="mt-4 font-medium text-white">Haftung für Inhalte</h3>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach
              den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter
              jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder
              nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            <p className="mt-2">
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen
              Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt
              der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
              Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>

            <h3 className="mt-4 font-medium text-white">Haftung für Links</h3>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss
              haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte
              der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
              Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
              Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
            </p>
            <p className="mt-2">
              Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte
              einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir
              derartige Links umgehend entfernen.
            </p>

            <h3 className="mt-4 font-medium text-white">Urheberrecht</h3>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
              deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
              Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
              jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten,
              nicht kommerziellen Gebrauch gestattet.
            </p>
            <p className="mt-2">
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die
              Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet.
              Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
              entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte
              umgehend entfernen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Technische Umsetzung</h2>
            <p>
              Hosting: Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA
              <br />
              Content Delivery Network: Vercel Edge Network
            </p>
            <p className="mt-4">
              Für rechtliche Anfragen:{" "}
              <a href={`mailto:${EMAIL_INFO}`} className="text-cyan-400 hover:underline">
                {EMAIL_INFO}
              </a>
              {" · "}
              <Link href="/agb" className="text-cyan-400 hover:underline">
                AGB (B2B)
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
