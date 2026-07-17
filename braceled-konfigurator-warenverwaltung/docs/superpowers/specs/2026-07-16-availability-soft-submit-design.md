# Soft-Submit bei knapper Verfügbarkeit

**Datum:** 2026-07-16  
**Status:** Freigegeben — implementiert auf `feature/customer-quote-edit`  
**Verwandt:** `docs/superpowers/specs/2026-07-16-customer-quote-edit-design.md` (Kundenänderung: Absenden bei Rot bereits vorgesehen)

## Problem

Im Konfigurator blockierte eine rote Ampel (LED-Bänder, Basis/Controller, Gruppen) den Weiter-/Absenden-Button. Serverseitig konnte zusätzlich die Hold-Anlage die Anfrage wieder löschen, wenn nicht genug Bestand für eine Reservierung da war. Kunden konnten den Wunsch dann nicht einmal zur manuellen Prüfung einreichen.

## Ziel

Erst-Anfrage und spätere Kundenänderung sind bei knapper Verfügbarkeit **trotzdem möglich**. Die Ampel/Meldung bleibt rot und erklärt klar, dass manuell geprüft wird (Lieferung / Refurbished möglich).

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| UI-Block | Entfernt für LED, Basis/Controller und Gruppenprogrammierung |
| Kunden-Text LED | Exakter Freitext (Du-Form), siehe unten |
| Kunden-Text Basis | Sinngleicher Soft-Hinweis (prüfen trotzdem) |
| `skipAvailabilityCheck` | Gilt für **alle** Modi (nicht nur Miete) |
| Hold bei Erst-Submit | Soft-Fail: Anfrage bleibt; System-Notiz in `notes` |
| Hold bei Kunden-Edit | Unverändert soft (bereits Spec Kundenänderung) |
| Admin-Freigabe | Bleibt streng (`revalidateAvailability`) |
| Restmengen | Weiterhin **nicht** gegenüber dem Kunden |

## Kunden-Texte (rot)

### LED-Bänder (Schritt Zeitraum)

> Für Deinen Termin sind laut Lagerbestand nicht genug LED-Bänder verfügbar. Wir prüfen natürlich trotzdem, ob wir Dir helfen können – eventuell kommt in der Zwischenzeit noch eine Lieferung oder wir bekommen Refurbished-Bänder zurück ins Lager.

### Basis / Fernsteuerung (Schritt Steuerung)

> Für Deinen Termin ist laut Lagerbestand die gewählte Basis/Fernsteuerung voraussichtlich nicht verfügbar. Wir prüfen natürlich trotzdem, ob wir Dir helfen können.

### Gruppenprogrammierung

Kurzer Soft-Zusatz: „Wir prüfen natürlich trotzdem, ob wir Dir helfen können.“

## Implementierung (Ist-Stand)

| Ebene | Verhalten |
|---|---|
| `configurator-wizard.tsx` | `canNext` ignoriert `!verfuegbar`; rote Hinweisboxen wie oben |
| `submitQuoteRequest` | Bei `skipAvailabilityCheck: true` kein Hard-Reject |
| `createQuoteWithHold` | Hold-Fehler löscht Quote **nicht**; Notiz `[System] Hold bei Anfrage: …` |
| Update-API | Ampel speichern, Submit nicht blockieren (unverändert) |
| `availabilityBlocksBooking` | Immer `false` (Soft-Submit) |

## Nicht-Ziele

- Keine automatische Freigabe trotz Rot  
- Keine Stückzahlen / „X offene Anfragen“ in der Kunden-Ampel  
- Admin darf bei Freigabe weiterhin wegen Nicht-Verfügbarkeit ablehnen  

## Erfolgskriterien

1. Bei roter LED-/Basis-/Gruppen-Ampel ist Weiter und Absenden möglich.  
2. Der LED-Hinweistext entspricht dem Freitext oben.  
3. Submit erzeugt auch ohne erfolgreichen Hold eine `submitted`-Anfrage.  
4. Kundenänderung bleibt bei Rot absendbar.  
5. Admin-Freigabe bleibt von Soft-Submit unberührt.  
