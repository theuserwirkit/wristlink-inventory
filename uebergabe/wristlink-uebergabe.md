# Projekt-Übergabe: WIRKUNG Wristlink – Anfrage- & Angebots-Automation

Dieses Dokument übergibt den aktuellen Stand an eine weiterarbeitende KI. Es gibt drei zugehörige Dateien (siehe Abschnitt 2). Sprache des Projekts: Deutsch.

---

## 0. Aktueller Produktivstand (2026)

Neben dem ursprünglichen **n8n + Google Sheets**-Gerüst (dieses Dokument) existiert die **Next.js-App** `braceled-konfigurator-warenverwaltung`:

| Komponente | Pfad / URL |
|------------|------------|
| B2B-Konfigurator | `/konfigurator` |
| Admin (Bestand, Basen, Gruppen) | `/admin`, `/warenverwaltung` |
| Anfragen & Fulfillment | `/admin/anfragen`, `/admin/anfragen/[id]` |
| E-Mail-Templates (Admin) | `/admin/einstellungen/e-mails` |
| Verfügbarkeit & Preise | Neon Postgres + `lib/actions/n8n-api.ts`, `lib/pricing/preis-engine.ts` |
| Fachliche Doku Konfigurator | `braceled-konfigurator-warenverwaltung/docs/konfigurator.md` |
| DB-Migration & Admin-Workflows | `braceled-konfigurator-warenverwaltung/MIGRATION.md` |

**Preise sind netto (B2B).** Maßgebliche Quelle: `lib/pricing/constants.ts` und `docs/konfigurator.md` – nicht die veralteten Werte in Abschnitt 5 unten (n8n-Prototype).

Wesentliche Abweichungen zum Sheets-Prototyp:
- Verfügbarkeit zeitraumbezogen mit Vor-/Nachlauf (6/5 Werktage), Gruppen-Pools, Controller per `station_typ` + Kanalanzahl
- Standard/Premium = gleiche physische Bänder
- Konfigurator zeigt **keine** Stückzahlen, nur Stress-Ampel
- Gruppenprogrammierung: flexible Lager-Zuordnung, max. 3 physische G-Gruppen
- **Lieferpakete** statt getrennter Lieferzeit + Lieferart (Regulär / Express / Eilauftrag)
- Konfigurator: nur **LED Armband** buchbar; Ball, Platine, Lanyard, LED-Licht als Vorschau ausgegraut
- Max. Menge Armband: **4.000** Stück (50er-Schritte)
- Probedruck-Optionen im Schritt Umfang (nur Kauf + Bedruckung)
- **Admin-Anfragen:** Freigabe mit/ohne Stripe, Mail-Vorschau, manueller Zahlungseingang
- **Fulfillment** erst nach Zahlung (`paid`): Schritte von Vorbereitung bis Zurückgepackt inkl. Tracking & Kunden-Mails
- **E-Mail-Templates** in der DB editierbar (Freigabe, Ablehnung, Zahlung, Fulfillment)
- **Bestandsbuchung** (Miete): endgültig bei Zahlung, nicht bei Freigabe
- **Sevdesk:** geplant, noch nicht angebunden

---

## 1. Projektbeschreibung & Ziel

WIRKUNG vertreibt LED-Eventprodukte (Armbänder, Zauberstäbe, Lichter) zum **Kauf** oder zur **Miete**. Anfragen kommen heute per E-Mail über eine Website rein – als unstrukturierter Freitext.

Ziel ist eine **n8n-Automation**, die jede eingehende Anfrage:
1. per KI klassifiziert und in strukturierte Felder übersetzt,
2. die **Verfügbarkeit** im Mietpool prüft (zeitraumbezogen),
3. den Preis über eine **deterministische Engine** berechnet (KI rechnet nie selbst Preise),
4. ein Angebot formuliert + als PDF erzeugt,
5. zur **manuellen Freigabe per Telegram** vorlegt (kein automatischer Versand),
6. nach Freigabe die Mail versendet und die Buchung zurückschreibt.

Leitprinzipien: KI denkt/extrahiert/formuliert – die Engine rechnet. Kein verbindliches Angebot ohne menschliche Freigabe. Unvollständige oder nicht verfügbare Anfragen werden sauber abgelehnt und gehen in eine Rückfrage-Strecke statt in ein falsches Angebot.

---

## 2. Übergebene Dateien

| Datei | Zweck |
|---|---|
| `wristlink-n8n-workflow.json` | Importierbares n8n-Workflow-Gerüst (alle Knoten verdrahtet, Code-Knoten fertig befüllt, gelbe Sticky-Notes mit Setup-Hinweisen an jedem kritischen Knoten). Import via n8n → „Import from File". |
| `wristlink-preis-engine.js` | Der Code des Knotens „Preis-Engine". Deterministische Preisberechnung inkl. aller Geschäftsregeln. Identisch im Workflow-JSON eingebettet. |
| `wristlink-verfuegbarkeit.xlsx` | Vorlage für das Google Sheet (zwei Tabs: `Bestand`, `Buchungen`). Vom Nutzer als Google Sheet zu importieren. |

---

## 3. Workflow-Architektur (n8n)

Linearer Strang mit zwei Verzweigungen:

```
Gmail Trigger
  → KI: Klassifizieren (HTTP → Anthropic)
  → Felder parsen (Code: Anthropic-Antwort → JSON-Objekt)
  → Bestand lesen (Google Sheets)
  → Buchungen lesen (Google Sheets)
  → Verfügbarkeit prüfen (Code)
  → IF: vollständig & verfügbar?
       ├─ TRUE  → Preis-Engine (Code)
       │          → KI: Angebot (HTTP → Anthropic)
       │          → PDF erzeugen (HTTP → Vercel/WeasyPrint)
       │          → Telegram Freigabe (Send and Wait / Approval)
       │          → IF: freigegeben?
       │               ├─ TRUE → Gmail senden → Buchung schreiben (Google Sheets, append)
       │               └─ FALSE → (Ende / manuell)
       └─ FALSE → KI: Rückfrage (HTTP → Anthropic) → Rückfrage-Entwurf (Gmail draft)
```

Knoten-Typen: `gmailTrigger`, `httpRequest` (Anthropic-Calls), `code`, `googleSheets`, `if`, `telegram` (Operation „sendAndWait", responseType „approval"), `gmail`.

---

## 4. Datenmodell (Google Sheets)

**Tab `Bestand`** – physischer Mietpool je Produkt (selten geändert):

| Spalte | Beispiel |
|---|---|
| `produkt` | armband / zauberstab / licht / ball / platine / lanyard (Konfigurator-UI: nur **armband** wählbar; übrige als Vorschau ausgegraut) |
| `bestand_gesamt` | 5000 |
| `notiz` | (frei) |

**Tab `Buchungen`** – jede Reservierung mit Zeitraum:

| Spalte | Beispiel |
|---|---|
| `buchung_id` | B-0001 |
| `produkt` | armband |
| `menge` | 1200 |
| `von` | 2026-09-12 (Format YYYY-MM-DD) |
| `bis` | 2026-09-13 |
| `status` | angefragt / reserviert / bestätigt / storniert |
| `event` | Smart Rebel Shift |

**Verfügbarkeitslogik** (Knoten „Verfügbarkeit prüfen"):
- Greift **nur bei Miete**. Beim Kauf gibt es keinen Pool → immer `verfuegbar: true`.
- `frei = bestand_gesamt − Σ(menge der überlappenden, aktiven Buchungen)`.
- Aktiv = Status `reserviert` oder `bestätigt`.
- Überlappung zweier Zeiträume [a_von,a_bis] und [b_von,b_bis]: `a_von ≤ b_bis UND b_von ≤ a_bis`.
- **Puffer:** ±2 Tage um das Event (Variable `PUFFER_TAGE`, für Logistik/Reinigung/Rückversand).
- Ohne erkannten Zeitraum (`von` fehlt) → nicht verfügbar, Rückfrage.
- Ausgabe: `bestand`, `belegt`, `frei`, `verfuegbar` (bool), `fehlt`.

Nach Freigabe schreibt „Buchung schreiben" eine neue Zeile (Status `reserviert`), damit der Zeitraum für künftige Anfragen sofort blockiert ist.

---

## 5. Preise & Berechnungslogik

> **Hinweis:** Die folgenden Tabellen stammen aus dem **n8n-Prototyp** und sind teilweise veraltet.
> Für die Live-App gilt: **alle Preise netto (B2B)**, siehe `braceled-konfigurator-warenverwaltung/lib/pricing/constants.ts`.

### Aktuelle Zuschläge (Live-App, Auszug)

| Position | Netto |
|----------|-------|
| Premium-Variante | +10 % auf Stückpreis (nur Armband) |
| Gruppenprogrammierung | 65 EUR pro Gruppe (nur PRO) |
| ECO Station Kauf / Miete | 399 / 250 EUR |
| PRO Station | nur Miete 649 EUR |
| **Lieferpaket Regulär** | 100 EUR |
| **Lieferpaket Express** | 349 EUR |
| **Lieferpaket Eilauftrag** | 919 EUR (48 h + Overnight, keine Bedruckung) |
| Flex-Rückgabe | +199 EUR (optional bei Regulär/Express) |
| Probedruck + Fotos | 149 EUR |
| Probedruck + Versand | 189 EUR |
| Versand DE | 90 EUR |
| Techniker | 400 EUR Reise + 1.200 EUR/Tag + 0,50 EUR/km (min. 7 Tage Vorlauf) |

> Legacy n8n-Werte (veraltet): Lieferzeit 79/349/620 + Flex 199 + Overnight 299 separat – in der Live-App in Lieferpakete zusammengeführt.

### Stückpreise je Menge (Kaufen / Mieten) – unverändert im Kern

**LED Armband**
| Menge | Kaufen | Mieten |
|---|---|---|
| 100–300 | 4,20 | 3,90 |
| 301–500 | 3,98 | 3,85 |
| 501–1000 | 3,83 | 3,82 |
| 1001–4000 | 3,76 | 3,80 |

**LED Zauberstab**
| Menge | Kaufen | Mieten |
|---|---|---|
| 100–300 | 4,10 | 3,90 |
| 301–500 | 3,89 | 3,85 |
| 501–1000 | 3,74 | 3,82 |
| 1001–2500 | 3,66 | 3,80 |

**LED Licht**
| Menge | Kaufen | Mieten |
|---|---|---|
| 100–300 | 4,90 | 3,95 |
| 301–500 | 4,89 | 3,90 |
| 501–1000 | 4,74 | 3,85 |
| 1001–2500 | 4,66 | 3,80 |

### Druck (nur bei Kauf; nicht bei Miete, nicht bei Hyperexpress)
- Setup-/Abwicklungsgebühr: einmalig 120,00
- Druckkosten pro Stück: 100–300 → 2,12 | 301–500 → 1,80 | 501–1000 → 0,97 | 1001–4000 → 0,95

### Weitere Posten (n8n-Prototyp – teilweise veraltet)
- Gruppenprogrammierung: 65,00 pro Gruppe (0–20), **nur mit PRO-Basis-Station** ✓
- Basis-Station: siehe Live-Tabelle oben (nicht mehr 129 / 499)
- Lieferzeit: siehe Live-Tabelle oben (Express jetzt 349 EUR)
- Versand Deutschland: 90,00 pauschal (immer) ✓

### Gesamtformel (vereinfacht)
```
Gesamt netto = (Menge × Stückpreis [+ Premium 10 %])
             + Druck (falls Kauf)
             + Probedruck (falls Kauf + Bedruckung)
             + (Anzahl Gruppen × 65)
             + Basis-Station
             + Lieferpaket (+ Flex-Rückgabe optional)
             + Versand + Techniker
MwSt 19 % auf Zahlung in DE
```

---

## 6. Geschäftsregeln / Validierung (in der Engine umgesetzt)
- Menge **100–4000** (Armband im Konfigurator), nur in **50er-Schritten**.
- Gruppen 0–20; >0 nur erlaubt mit **PRO**-Basis-Station.
- Druck nur bei **Kauf**, nicht bei Miete, nicht bei **Eilauftrag** (`lieferpaket: eil`).
- Nur `armband` im Online-Konfigurator buchbar; `ball`, `platine`, `lanyard`, `licht` → Preis-Engine lehnt ab.
- Verfügbarkeitsprüfung nur bei Miete.
- Techniker nur ab 7 Tagen Vorlauf.
- Ungültige/ nicht erfüllbare Kombinationen → `gueltig: false` mit Klartext-Fehlern → Rückfrage-Strecke. Keine „nette" Interpretation, kein Runden.

---

## 7. Feld-Schema (Schnittstelle KI-Extraktion → Engine)

Der Extraktions-Prompt MUSS exakt diese Felder als JSON liefern (sonst läuft die Engine ins Leere):

| Feld | Werte |
|---|---|
| `produkt` | `armband` \| `zauberstab` \| `licht` \| `ball` \| `platine` \| `lanyard` |
| `modus` | `kauf` \| `miete` |
| `menge` | Zahl 100–4000 (50er-Schritte, Armband) |
| `von` | `YYYY-MM-DD` (Mietbeginn; bei Eintages-Event = `bis`) |
| `bis` | `YYYY-MM-DD` (Mietende) |
| `druck` | boolean |
| `probedruckOption` | `none` \| `fotos` \| `versand` (optional) |
| `gruppen` | Zahl 0–20 |
| `station` | `keine` \| `eco` \| `pro` |
| `variante` | `standard` \| `premium` (optional, nur Armband) |
| `lieferzeit` | `standard` \| `express` \| `hyperexpress` (Legacy) |
| `lieferpaket` | `regulaer` \| `express` \| `eil` (Live-App) |
| `flexRueckgabe` | boolean (optional) |
| `land` | `DE` (aktuell nur Deutschland) |
| `missing_fields` | Array fehlender Pflichtfelder |

---

## 8. Offene Tasks (Auftrag an die weiterarbeitende KI)

Vorrangig:
1. **Extraktions-Prompt** (System-Prompt für Knoten „KI: Klassifizieren") schreiben: wandelt unsaubere Kundenmails robust in das JSON aus Abschnitt 7, inkl. `von`/`bis` und `missing_fields`. Wichtigster Task – hier laufen Preis-Engine und Verfügbarkeit zusammen.
2. **Angebots-Prompt** (Knoten „KI: Angebot"): formuliert aus `positionen` + `gesamt_*` einen Angebotstext / füllt das Template. Darf keine eigenen Preise rechnen.
3. **Rückfrage-Prompt** (Knoten „KI: Rückfrage"): formuliert freundliche Nachfrage bei fehlenden Feldern bzw. Alternativvorschlag bei Nichtverfügbarkeit (echte `frei`-Zahl nutzen).

Konfiguration:
4. HTTP-Bodies der drei Anthropic-Knoten füllen (Endpoint `https://api.anthropic.com/v1/messages`, Header `x-api-key` + `anthropic-version: 2023-06-01`, model z. B. `claude-sonnet-4-6`).
5. **IF-Bedingungen** setzen:
   - „vollständig & verfügbar": `missing_fields.length === 0` UND `verfuegbar === true`.
   - „freigegeben": Telegram-Approval-Ergebnis = genehmigt.
6. **Google-Sheets-Knoten** konfigurieren (Dokument-ID + jeweiliger Tab) für „Bestand lesen", „Buchungen lesen", „Buchung schreiben" (append, Status `reserviert`).
7. **PDF-Endpoint** anbinden (bestehende Vercel/WeasyPrint-Pipeline; IBM Plex, TESA-Rot #CC0000).
8. **Telegram**: Bot-Token (@BotFather) + Chat-ID; PDF als Dokument mitsenden, damit mobil prüfbar.
9. **Credentials** in n8n: Gmail (OAuth2), Anthropic (Header Auth), Telegram, Google Sheets (OAuth2).

Klärung & Test:
10. **MwSt** klären: sind die Listenpreise netto oder brutto? Engine-Ausgabe entsprechend anpassen.
11. End-to-End-Test mit echten Beispielanfragen; prüfen, dass Telegram-Freigabe pausiert und Buchungs-Rückschreibung greift.

Spätere Ausbaustufen (optional): RAG-Knowledgebase via Supabase pgvector statt Prompt-Injektion; schrittweise Voll-Automatisierung von Standard-/Kleinmengenfällen; Korrekturschleife über Telegram (Free Text statt nur Approval); Status `angefragt` als Soft-Hold in die Verfügbarkeitsrechnung aufnehmen.
