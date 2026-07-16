# Multi-Thumb-Gruppenverteilung (Konfigurator Schritt 4)

**Datum:** 2026-07-16  
**Status:** Freigegeben — implementiert  
**Plan:** `docs/superpowers/plans/2026-07-16-gruppen-multi-thumb-slider.md`  
**Kontext:** Wristlink / inventory-report-popup — `components/konfigurator/configurator-wizard.tsx`, Schritt Gruppenprogrammierung (PRO)

## Problem

Die Band-Aufteilung auf Gruppen erfolgt heute über **einen Slider pro Gruppe**. Die Summe kann unter der Gesamtmenge bleiben; Umschichten zwischen Gruppen ist umständlich (zwei Slider bewegen).

## Ziel

Ein **einziger Multi-Thumb-Slider** teilt die gesamte Bandmenge auf die gewählten Gruppen auf. Verschieben eines Punkts ändert nur die beiden Nachbar-Gruppen (z. B. G1 −50, G2 +50). Die Gruppenanzahl bleibt ein separater Slider darüber.

## Nicht-Ziele

- Keine Änderung an Preislogik, Lager-/Verfügbarkeits-API oder physischen Lagergruppen-Regeln
- Keine benannten Gruppen-Labels (VIP etc.) — weiterhin „Gruppe 1…n“
- Kein Rest / unverteilt (bewusst abweichend vom heutigen `Summe ≤ menge`)
- Kein neues Drag-Framework — Nutzung des vorhandenen Radix/shadcn-`Slider`

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Layout | Oben: Slider Gruppenanzahl (1…max). Unten: Multi-Thumb-Aufteilung |
| Allokation | Summe der Gruppengrößen ist **immer exakt** `menge` |
| Thumbs | `n` Gruppen → `n−1` Thumbs (Grenzen); bei 1 Gruppe kein Thumb, nur Anzeige |
| Schritt / Min | Unverändert: Step 50, min. 50 Stück pro Gruppe |
| Technik | Ansatz A: bestehender `Slider` mit Multi-Value + farbige Track-Segmente |
| Farben | Feste Palette pro Gruppenindex (wie Brainstorm-Demo: Blau/Grün/Amber/Violett/…) |
| Labels | Über dem Track: „Gruppe i: X Stück“ in Segmentfarbe |
| Gruppenwechsel | Neu gleichmäßig splitten (bestehende `defaultGroesseProGruppe` / Equal-Split, Summe = menge) |
| Validierung | `gruppenVerteilungGueltig`: Summe **===** `menge` (und jede Gruppe ≥ 50) |
| Datenmodell | Weiterhin `config.gruppenGroessen: number[]` — keine Schema-Änderung |

## UX

```text
[ Gruppenprogrammierung: 4 Gruppen     ]  ← bestehender Count-Slider
[ Hinweis Preis / max physisch / min 50 ]

[ G1: 300 ] [ G2: 250 ] [ G3: 200 ] [ G4: 250 ]
[████░░░░|████|████|████████]   ← farbige Segmente + Thumbs an Grenzen
[ 1000 von 1000 Bändern auf 4 Gruppe(n) verteilt ]

[ Verfügbarkeits-Hinweis (unverändert) ]
```

Verhalten beim Ziehen von Thumb `i` (Grenze zwischen Gruppe `i` und `i+1`):

1. Paar-Summe `S = groessen[i] + groessen[i+1]` bleibt konstant.
2. Neue linke Größe = gerundet auf Step 50, geclampt auf `[50, S−50]`.
3. Rechte Größe = `S − links`.
4. Alle anderen Gruppen unverändert.

## Architektur

### Hilfsfunktionen (`lib/konfigurator/gruppen-config.ts`)

| Funktion | Rolle |
|---|---|
| `groessenToBoundaries(groessen)` | Kumulative Grenzen `[g0, g0+g1, …]` ohne Endpunkt `menge` → Slider-`value` |
| `boundariesToGroessen(boundaries, menge)` | Grenzen → Größenarray (letzter Rest = menge − letzte Grenze) |
| `applyBoundaryDrag(groessen, handleIndex, newBoundary)` | Paar-Umschichtung mit Min/Step |
| `equalSplitToMenge(menge, gruppen)` | Startverteilung Summe === menge |
| `gruppenVerteilungGueltig` | Verschärfen auf Summe === menge + min 50 |

`normalizeGruppenGroessen` / `syncGruppenGroessen`: bei Count-/Mengen-Änderung Equal-Split mit Summe === menge (nicht mehr „jeder Default, Clamp nur wenn Overflow“).

### UI-Komponente

Neue Komponente z. B. `components/konfigurator/gruppen-verteilungs-slider.tsx`:

- Props: `menge`, `groessen`, `onChange`, `disabled`
- Intern: Radix-`Slider` mit `min={0}`, `max={menge}`, `step={50}`, `value={boundaries}`
- Track: Standard-Range ausblenden oder transparent; darunter/darüber farbige Flex-Segmente proportional zu `groessen`
- `onValueChange`: nur den bewegten Thumb auswerten (oder volles Boundary-Array mappen) → `applyBoundaryDrag` / `boundariesToGroessen` → `onChange`

Einbau in `configurator-wizard.tsx` Schritt PRO/Gruppen: die `n` Einzel-Slider ersetzen; Count-Slider und Availability-Block bleiben.

### Edge Cases

| Fall | Verhalten |
|---|---|
| 1 Gruppe | Kein Thumb; Segment = volle `menge`; Label „Gruppe 1: menge“ |
| Gruppen ↑/↓ | Equal-Split neu; bisherige Größen verwerfen |
| `menge` ändert sich | Equal-Split neu (wie sync heute, aber Summe erzwingen) |
| Edit-Mode | Slider disabled (wie heute) |
| Thumbs kollidieren | Min-Abstand = 50 (über Clamp der Nachbargrößen) |

## Fehlerbehandlung / Validierung

- Client: Weiter-Button blockiert, wenn Verteilung ungültig (nach neuer Regel selten, außer inkonsistenter State).
- Server: bestehende Config-Normalisierung; sicherstellen, dass Submit/Update `gruppenGroessen` mit Summe === menge akzeptiert bzw. normalisiert — keine API-Vertragsänderung nötig, solange Array-Form gleich bleibt.

## Tests

- Unit: `groessenToBoundaries` / `boundariesToGroessen` Roundtrip; `applyBoundaryDrag` erhält Summe und Minima; Equal-Split Summe === menge.
- Unit: `gruppenVerteilungGueltig` true nur bei exakter Summe und min 50.
- Optional: Komponenten-Smoke (Render mit 2/4 Gruppen, disabled).

## Out of Scope für Follow-ups

- Benannte Gruppen / Farben wählbar durch Kunden
- Persistenz der Farben in Angebots-PDF
