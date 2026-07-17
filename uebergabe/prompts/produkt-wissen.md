# WIRKUNG Wristlink – Produktwissen (für KI-Antworten)

> **Technische Details Konfigurator:** `braceled-konfigurator-warenverwaltung/docs/konfigurator.md`

## Produkte

### Online-Konfigurator (Schritt Umfang)

| Produkt | `value` | Status |
|---------|---------|--------|
| LED Armband | `armband` | **einzige wählbare Option** – Angebot über Konfigurator |
| LED Ball | `ball` | Vorschau, ausgegraut – „Aktuell hier nicht konfigurierbar“ |
| LED Platine | `platine` | Vorschau, ausgegraut – zum Einbau in eigene Event-Elemente (nicht Getränke-Untersetzer) |
| LED Lanyard | `lanyard` | Vorschau, ausgegraut |
| LED-Licht | `licht` | Vorschau, ausgegraut – IP68-EventLights (Pool/See/Eiskühler) |

Bei Anfragen zu Ball, Platine, Lanyard oder LED-Licht: freundlich auf **direkten Kontakt** verweisen (info@wirkung-digital.de / 0800 WIRKUNG), nicht über den Online-Konfigurator buchbar.

### API / Legacy (nicht in Konfigurator-UI)

- **zauberstab**: LED-Zauberstäbe / Soft-Sticks – nur API/Legacy-Mapping

## Standard vs. Premium (nur Armband)

- **Gleiche physische Bänder** – Unterschied nur Preis (+10 %) und Positionierung (Standard: Handcontroller; Premium: Handcontroller oder PRO)
- Verfügbarkeit hängt **nicht** von der Variante ab, nur von Menge und Zeitraum
- Kanalanzahl (40/80 CH) ist **intern** – Kunden nicht ansprechen, außer explizit nach Technik gefragt

## Kauf vs. Miete

- **Kauf**: Eigentum, individueller **Logodruck** möglich, Versand an Kunde
- **Miete**: Leihgeräte für Event-Zeitraum, Rückgabe, Pool-Verfügbarkeit relevant
- Hinweise: „Logodruck“, „bedruckt“, „mit Logo“ → in der Regel **kauf**. „Miete“, „leihen“, „für unser Event am …“ → **miete**.

## Ansteuerung / Steuerung (häufige Kundenfrage)

- **Ohne Station (station: keine)**: Feste Farbprogramme am Gerät, keine Live-Steuerung
- **ECO Handcontroller (station: eco)**: Zentrale Fernsteuerung, Kauf oder Miete möglich, **keine** Gruppenprogrammierung
- **PRO Basis-Station (station: pro)**: Live-Steuerung, Gruppenprogrammierung (1–20 Gruppen), **nur Miete**
- Kundenfragen wie „Wie werden die Bänder angesteuert?“ → kurz erklären und passende Station empfehlen (bei Shows meist PRO)
- Controller-Verfügbarkeit im System: Zuordnung über Admin-Feld **Stationstyp** (eco/pro) + **Kanalanzahl** (40/80 CH) – nicht über Gerätename raten

## Gruppenprogrammierung (nur mit PRO)

- Kunde wählt Anzahl Gruppen (1–20) und Bänder pro Gruppe (50er-Schritte, Summe ≤ Gesamtmenge)
- Preis: **65 EUR netto pro Gruppe** (nicht pro Band)
- Ab **11 Gruppen** technisch 80-CH-Pflicht (intern, nicht an Kunden kommunizieren)
- Lager-Zuordnung flexibel (nicht fest G1 = Kundengruppe 1)

## Verfügbarkeit (Kommunikation)

- Im Konfigurator: **keine absoluten Stückzahlen** an Kunden – nur qualitative Aussagen (verfügbar / knapp / nicht verfügbar)
- Bei E-Mail-Rückfragen: ebenfalls **keine** konkreten Pool-Zahlen nennen, sondern Alternativen (kleinere Menge, anderer Termin)
- Kurzer Vorlauf (< 3 Wochen): nur Lagerbestand, keine Nachbestellung – entsprechend vorsichtig formulieren

## Mengen & Preise

- Menge **100–4.000** (nur Armband im Konfigurator), nur in **50er-Schritten**
- Preise kommen aus der Engine – in Rückfragen **keine** Preise nennen

## Probedruck (nur Kauf + Bedruckung, Schritt Umfang)

- **Kein Probedruck:** 0 EUR
- **Probedruck + Fotos:** 149 EUR netto
- **Probedruck + Versand:** 189 EUR netto
- Nicht bei Eilauftrag (`lieferpaket: eil`)

## Lieferung & Logistik (Konfigurator, Schritt Extras)

- **Lieferpakete** (ein Paket wählen, nicht getrennt Lieferzeit + Lieferart):
  - **Regulär:** 100 EUR netto (20 WT Produktion, min. 28 Tage Vorlauf)
  - **Express:** 349 EUR netto (10 WT Produktion, min. 14 Tage Vorlauf)
  - **Eilauftrag:** 919 EUR netto (48 h + Overnight, min. 2 Tage Vorlauf, **keine Bedruckung**)
- Optional **Flex-Rückgabe** (+199 EUR) bei Regulär/Express
- Nur **Lieferung nach Deutschland** im Online-Konfigurator
- Techniker nur ab **7 Tagen** Vorlauf

## Standard-Defaults (wenn Kunde nichts sagt)

- produkt: armband
- station: keine
- gruppen: 0
- lieferpaket: regulaer (Legacy-Feld `lieferzeit: standard`)
- land: DE
- druck: false (nur true bei explizitem Logodruck/Kauf)
- probedruckOption: none
