# Lieferpaket-Vorlauf in echten Werktagen

**Datum:** 2026-07-16  
**Status:** Freigegeben — Plan bereit  
**Plan:** `docs/superpowers/plans/2026-07-16-lieferpaket-werktage-vorlauf.md`  
**Kontext:** Wristlink / inventory-report-popup — `lib/konfigurator/lieferpaket.ts`, Packlisten in `fulfillment-timing.ts`

## Problem

Die Lieferpaket-Freigabe rechnet nur Produktionszeit über eine Kalender-Näherung (`werktageToCalendarDays`, Faktor 7/5):

- Express ≈ 14 Kalendertage (= nur 10 WT Produktion)
- Regulär ≈ 28 Kalendertage (= nur 20 WT Produktion)

**Versandlaufzeit** und **Ankunft vor Event** fehlen. Dadurch wirkt Express bei knappen Events fälschlich wählbar.

Beispiel: Event 30.07.2026, heute 16.07.2026 → **10 Werktage** bis Event.  
Express braucht aber **10 + 2 + 2 = 14 Werktage** → muss gesperrt sein. Im UI war Express noch ausgewählt.

Zusätzlich nutzen Packlisten intern **3 Kalendertage** Transit — fachlich falsch (Soll: **2 Werktage**).

## Ziel

Mindestvorlauf für Regulär / Express / Eil / Flex korrekt als **Summe echter Werktage** prüfen und Packlisten-Versand angleichen.

## Nicht-Ziele

- Keine Feiertagskalender-Logik (nur Mo–Fr)
- Keine Preisänderungen
- Keine Änderung an Ampel / Lager-Stress / Kurzvorlauf-Floor (Kalendertage dort unverändert, sofern nicht Lieferpaket-bezogen)
- Keine Änderung an Rückversandfristen (3 bzw. 8 WT nach Event)

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Ansatz | Summe der Werktage: `Produktion + Versand + AnkunftPuffer` |
| Vergleich | `workdaysUntilEvent(heute, event) >= needed` |
| Versand Regulär/Express | **2 Werktage** |
| Ankunft Standard | **2 Werktage** vor Event |
| Ankunft Flex | **5 Werktage** vor Event (ersetzt die 2) |
| Eilauftrag | **2 WT Produktion + 1 WT Overnight = 3 WT** (kein Flex) |
| Packlisten-Transit | auf **2 Werktage** angleichen; Flex-Extra auf Transit entfernen (Flex steckt in Ankunft 5 WT) |
| Warnung UX | Zahl als Werktage („Bei nur noch X Werktag(en) …“) |

## Formel

| Paket | Produktion | Versand | Ankunft | Mindest-WT |
|---|---|---|---|---|
| Regulär | 20 | 2 | 2 | **24** |
| Express | 10 | 2 | 2 | **14** |
| Eil | 2 | 1 | 0 | **3** |
| Regulär + Flex | 20 | 2 | 5 | **27** |
| Express + Flex | 10 | 2 | 5 | **17** |

Beispiel 16.→30.07. (= 10 WT): nur **Eil** wählbar.

## Architektur

### `lib/konfigurator/lieferpaket.ts`

- Konstanten für Produktion / Versand / Ankunft / Eil
- `minWerktageForPaket(paket, flexRueckgabe): number`
- `workdaysUntilEvent(eventIso, from?): number` — echte Mo–Fr-Zählung (Hilfsfunktion ggf. in `lib/utils/date.ts` teilen)
- `isLieferpaketAllowed`, `isFlexRueckgabeAllowed`, `getLieferpaketWarning`, `firstAllowedLieferpaket`, `syncLieferpaketFromEvent` auf Werktage umstellen
- `minTage` / `werktageToCalendarDays`-Freigabe-Pfad entfernen bzw. nur noch Legacy-Shim wo nötig
- Descriptions der Optionen unverändert (Produktions-/Anlieferungs-Texte bleiben fachlich korrekt)

### Wizard / Aufrufer

- Lieferpaket-Checks mit Werktagen speisen (nicht `daysUntilEvent` Kalendertage)
- Ampel/`SHORT_DELIVERY_WARNING_DAYS` bleiben auf Kalendertagen, sofern unabhängig

### `lib/konfigurator/fulfillment-timing.ts`

- `PACKING_VERSAND_TRANSIT`: **2 Werktage** (statt 3 Kalendertage)
- Flex-Extra auf Transit entfernen
- `getVersandDeadlineForPacking`: Anlieferung − 2 WT (`subtractWorkdays`)

### Docs

- `docs/konfigurator.md` Min-Tage-Tabelle und Packlisten-Transit aktualisieren

## UX

- Gesperrte Pakete ausgegraut + Blockgrund „Zu kurzer Vorlauf bis zum Event“
- Warnbanner listet gesperrte Pakete; Zählung in Werktagen
- Auto-Vorauswahl: erstes erlaubtes Paket in Reihenfolge Regulär → Express → Eil
- Flex aus, wenn Paket+Flex nicht reicht oder Paket = Eil

## Edge Cases

| Fall | Verhalten |
|---|---|
| Kein Eventdatum | alle Pakete wählbar (wie heute) |
| Event in der Vergangenheit | nichts wählbar |
| Wochenende | zählt nicht als Werktag |
| Feiertage | zählen wie Werktage (bewusst nicht modelliert) |

## Tests

`scripts/test-lieferpaket.ts` (ggf. Packlisten-Tests mitziehen):

- 10 WT bis Event → nur Eil; Express/Regulär gesperrt
- 14 WT → Express ja, Regulär nein
- 14 WT + Flex-Anforderung → Express+Flex braucht 17 → Flex/Kombi gesperrt
- 24 WT → Regulär ja
- Eil ab 3 WT
- Packlisten: Versanddeadline = Anlieferung − 2 WT

## Erfolgskriterien

1. Bei 10 WT bis Event ist Express nicht wählbar; Eil schon.
2. Flex erhöht den Mindestvorlauf um Ankunft 5 statt 2 (+3 WT).
3. Packlisten-Versand nutzt 2 Werktage, konsistent zur Freigabe.
4. Warnungen sprechen von Werktagen.
5. Bestehende Preise und Ampel-Logik unverändert.
