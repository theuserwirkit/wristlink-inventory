# Audit Findings – Phase 0 (mit Phase-3-, Phase-4a-, Phase-4b-, Phase-4c- und Phase-4d-Verifikation)

Stand: 16. Juli 2026 · Subagents A–E (Phase 0/1/2) + Subagent F (Phase 3,
Verifikation) + Phase 4a (Rest-Fixes/Quick-Wins) + Phase 4b (Transaktionen/
Locking/UNIQUE) + Phase 4c (Frontend: Druck-Vereinheitlichung,
`public_token`-Exposition, Typisierung) + Phase 4d (Abschluss-Verifikation
nach 4a–4c – siehe Addendum unten)

## Executive Summary (Stand nach Phase 4d)

Build, Typecheck, alle vier Test-Skripte und der manuelle Smoke-Test laufen
grün (erneut verifiziert in Phase 4d, siehe Addendum Phase 4d). Keine neuen
Trivial-Fixes in Phase 4d nötig – die einzige Auffälligkeit war ein
einmaliger, nicht reproduzierbarer Next.js-Prerender-Flake beim allerersten
Build nach vollständig gelöschtem `.next`-Verzeichnis, der sich bei
identischem Kommando sofort und danach durchgehend grün verhielt (siehe
Addendum Phase 4d) – keine Code-Änderung, kein echter Regressions-Bug.

**Findings-Status (Gesamt, ca. 70 Einträge über A–E) – nach Phase 4d
(inhaltlich unverändert gegenüber Phase 4c, nur re-verifiziert):**

| Status | Anzahl (ca.) | Anteil Critical/High darunter |
|--------|--------------|-------------------------------|
| **Fixed** | 46 | Critical 1/1, High 10/12 |
| **Partial** (echte Härtung, ein kleines Restrisiko dokumentiert) | 1 (C-04) | High 1 |
| **Open** (Low/Medium/Info, bewusst nicht gemacht) | ~22 | High 1 (C-15 als RISK gezählt) |
| **Risk – Rücksprache nötig** (menschliche Entscheidung) | 1 (C-15) | High 1/1 |

*(Update Phase 4c: D-01, D-02, D-06, D-07, D-08, D-09, D-10 und D-12 sind neu
**Fixed** – siehe Addendum Phase 4c unten. Alle übrigen D-Findings sowie
A–C/E unverändert gegenüber Phase 4b. Phase 4d hat an diesen Zahlen nichts
geändert, sondern ausschließlich verifiziert.)*

**Bewusst weiterhin Open/Risk nach Phase 4d (Kurzüberblick, Details in den
Bereichstabellen und den Addenden):**

- **E-01 (High, Open):** CSP `unsafe-inline` statt Nonce – zu invasiver Umbau
  für einen risikoarmen Fix.
- **E-04 (Medium, Open):** Upstash Redis in Production nicht erzwungen –
  **menschliche Handlung nötig** (Env-Vars in Vercel setzen).
- **C-15 (High, RISK – Rücksprache nötig):** Mehrfache
  Bestandslogik-Wahrheitsquelle (`booking_items`-Ledger vs.
  `inventory_lots.menge`) – fachliche Architekturentscheidung, nicht
  automatisierbar.
- **C-08 (Medium, Open):** Migrations-Tracking-Tabelle (`schema_migrations`)
  bewusst als „optional wenn Zeit" zurückgestellt.
- **Low-Findings Frontend (Open):** D-04/D-05 (Print-Meta-Header/
  `formatGroupLine`-Duplikate), D-11/D-13/D-14 (übrige Typisierung/
  Datenexposition außerhalb Phase-4c-Scope), D-24/D-25 (inline
  `toLocaleDateString` statt zentraler Utils) – reine Code-Qualität, kein
  Exploit-Pfad.
- **Dependency-Patches (Low, Open):** E-05 (Next 16.x Major separat), E-08
  (`@neondatabase/serverless` 1.1.0), E-09 (`sharp` 0.35.x) – Wartungsupdates,
  bewusst nicht in dieser Session angefasst.
- **A-06 (Medium, Open):** gemeinsamer `WRISTLINK_PASSWORD`-Fallback für
  Auth/Lead/Angebot-Secrets – Breaking-Change-Risiko, nur `console.warn`
  ergänzt.

## Addendum – Phase 4b (Transaktionen, Locking, UNIQUE)

Backend-/DB-Härtung des Zahlungs- und Lagerzuweisungsflusses, aufbauend auf
Phase 4a. Keine Commits erstellt, Working-Tree von Phase 1–4a beibehalten.

- **C-07 (Fixed):** `saveQuoteBandAllocations` — DELETE der alten
  `booking_items`-Zeilen und alle INSERTs der neuen Zuweisung laufen jetzt in
  einer echten interaktiven Transaktion (alles oder nichts).
- **C-11 (Fixed):** Neue Migration `scripts/migration/23-sku-lot-unique.sql`
  (idempotent, bereinigt bestehende Duplikate vor dem Anlegen der
  UNIQUE-Indizes auf `skus(item_type, group_id)` und
  `inventory_lots(sku_id, batch_id)`). `resolveSkuId`/`resolveLotId` in neuem
  gemeinsamen Modul `lib/actions/sku-lot-internal.ts` (vorher dupliziert in
  `quote-warehouse.ts` und `bookings-internal.ts`), nutzen jetzt
  `INSERT … ON CONFLICT DO NOTHING RETURNING` statt Check-then-Insert.
- **C-05/C-06 (Fixed):** Neuer `lib/db.ts`-Baustein
  `withInteractiveTransaction` (echte WebSocket-Session über `Pool`/`Client`
  aus `@neondatabase/serverless`, `BEGIN…COMMIT/ROLLBACK`) plus
  `acquireResourceLocks` (`pg_advisory_xact_lock` pro Ressource, z. B.
  `band:{groupId}:{batchId}` oder `base:{baseId}`). Verfügbarkeits-Check +
  Schreiben laufen für `updateQuoteBookingBaseAllocation`,
  `saveQuoteBandAllocations`, `updateQuoteBookingAllocation` (Warenverwaltung)
  UND für den zentralen Schreib-Choke-Point `createBookingInternal`
  (n8n-Reservierungen, Verkaufsbuchung bei Zahlung, Admin-Buchungserstellung)
  jetzt gemeinsam unter Lock. Die fachlichen Verfügbarkeitsregeln wurden NICHT
  verändert — nur Reihenfolge/Atomizität von Check und Schreiben. Zusätzlich:
  Lost-Update bei `inventory_lots.menge` durch atomare
  `UPDATE … SET menge = menge ± $delta`/`ON CONFLICT DO UPDATE`-Statements
  ersetzt.
- **C-04 (Partial):** `finalizeQuoteAsPaid` — Buchungs-Finalisierung läuft
  jetzt VOR dem Status-Wechsel auf `paid` (Reihenfolge getauscht); bei
  Buchungsfehler bleibt der Status auf dem bisherigen, zahlbaren Wert stehen
  statt „paid ohne Buchung“ — es gibt jetzt einen klaren, bereits bestehenden
  Retry-Pfad (`markQuoteAsPaid`, Admin-UI). Status-Update und
  `quote_fulfillment_events`-Insert laufen atomar in einer
  `sql.transaction([...])`. Verbleibendes (sehr kleines) Restrisiko: Die
  Buchungs-Finalisierung selbst läuft aus technischen Gründen (Neon-HTTP-
  Transaktionen sind nicht verschachtelbar, `createBookingInternal` hält
  bereits eine eigene interaktive Transaktion) nicht in derselben
  Datenbank-Transaktion wie der anschließende Status-Flip — ein Crash exakt
  zwischen beiden Schritten bliebe theoretisch möglich, ist aber durch die
  Reihenfolge-Änderung erheblich unwahrscheinlicher und über den Retry-Pfad
  behebbar geworden.
- **C-15 (weiterhin Open/RISK):** Wie beauftragt NICHT vereinheitlicht.
  Empfehlung bleibt: **`booking_items`-Ledger als alleinige Wahrheitsquelle.**
- **C-08 (Open, bewusst zurückgestellt):** Migrations-Tracking-Tabelle als
  "optional wenn Zeit" eingestuft und zugunsten der risikoreicheren
  C-04/05/06/07/11-Fixes zurückgestellt.
- **Neue Infrastruktur:** `lib/db.ts` (`withInteractiveTransaction`,
  `acquireResourceLocks`), `lib/actions/sku-lot-internal.ts` (gemeinsamer
  SKU/Lot-Resolver). `package.json` erhält `"engines": {"node": ">=22"}` als
  explizite Voraussetzung für die neue `Pool`/WebSocket-Nutzung (native
  `WebSocket`-Global, kein zusätzliches `ws`-Package nötig/hinzugefügt).
- **Nicht in dieser Session gegen eine echte Datenbank getestet** (kein
  DB-Zugriff in der Audit-Sandbox) — nur `npx tsc --noEmit`, `pnpm build` und
  die vier bestehenden Test-Skripte liefen. **Empfehlung vor Produktivbetrieb:**
  Migration `23-sku-lot-unique.sql` in einem Wartungsfenster laufen lassen und
  Duplikat-Bereinigung im Log prüfen; die neuen interaktiven Transaktionen
  (C-05/C-06) einmal mit zwei parallelen Requests gegen eine Staging-DB
  gegenprüfen.
- **Verifikation Phase 4b:** `npx tsc --noEmit` grün, `pnpm build` grün
  (22 Routen), alle vier Test-Skripte (Preis-Engine, Fulfillment-Timing,
  Lieferzeit, E-Mail-Links) grün. Keine Commits erstellt.

## Addendum – Phase 4a (Rest-Fixes/Quick-Wins)

Zusätzlich zu Phase 1–3 wurden folgende, bis dahin offene Low/Medium-Findings
risikoarm gefixt (kein Eingriff in Preis-/Fulfillment-/Locking-Logik, keine
Commits erstellt – Details je Finding in den Bereichstabellen unten):

- **B-09 (Stripe Idempotenz):** Atomares `INSERT ... ON CONFLICT DO NOTHING
  RETURNING` statt SELECT-then-INSERT; Webhook-Route fängt Fehler zusätzlich
  in try/catch ab und liefert weiterhin `{received:true}`.
- **B-10 (Error Leak `approveQuoteRequest`):** War bereits in Phase 2a (C-14)
  über `toSafeErrorMessage` gefixt – Status in der Tabelle nachgezogen, keine
  weitere Code-Änderung.
- **A-11 (scrypt-Kostenfaktor):** N/r/p explizit dokumentiert
  (OWASP-Mindeststufe), neues `scrypt2:N:r:p:salt:hash`-Format ermöglicht
  künftiges Anheben ohne Invalidierung bestehender Hashes (Dual-Verify mit
  altem `scrypt:salt:hash`-Format).
- **A-12 / C-18 (Defense-in-Depth):** `getLeadById` und
  `getQuoteOfferPdfForEmail` aus `"use server"`-Dateien in `server-only`-Module
  ohne Action-Export verschoben; `getKonfiguratorLogoById` erhält eigenen
  `requireRole(["ADMIN"])`-Check.
- **B-08 (session Rate-Limit):** 60 Requests/Minute pro IP auf
  `POST /api/konfigurator/session`.
- **C-10 (Dangerous Reset):** `scripts/18-complete-reset.sql` nach
  `scripts/dangerous/` verschoben, `README.md` mit Warnhinweisen ergänzt.
- **B-07 (Logo Magic-Bytes):** PNG-Signaturprüfung vor dem Speichern in
  `saveKonfiguratorLogo`.
- **E-06/E-07 (Dependency-Patches):** `stripe` → `22.3.2`, `resend` → `6.17.2`
  (Lockfile aktualisiert).
- **A-06 (Secrets-Fallback):** Einmaliger `console.warn` in Production in
  `auth-core.ts`/`lead-auth.ts`/`angebot-access.ts`, wenn kein dediziertes
  Secret gesetzt ist und auf `WRISTLINK_PASSWORD` zurückgefallen wird
  (weiterhin bewusst nicht hart erzwungen – Breaking-Change-Risiko).

**Nicht angefasst in Phase 4a (wie damals beauftragt):** C-04/05/06/15
(RISK – Rücksprache), C-07, C-11, E-01 (Nonce-CSP), D-08+
(Frontend-Typisierung). **Update Phase 4b:** C-05, C-06, C-07, C-11 sind jetzt
**Fixed**, C-04 ist **Partial** (siehe Addendum Phase 4b oben) — nur C-15
bleibt bewusst RISK/Open, E-01 und D-08+ bleiben wie in Phase 4a unangetastet
(außerhalb des Phase-4b-Auftrags). **Update Phase 4c:** D-01, D-02, D-06,
D-07, D-08, D-09, D-10 und D-12 sind jetzt **Fixed** (siehe Addendum Phase 4c
unten); E-01 und die übrigen D-Findings (D-04/D-05/D-11/D-13/D-14/D-24/D-25)
bleiben unangetastet (außerhalb des Phase-4c-Auftrags bzw. bewusst Open, um
den Scope eng zu halten).

**Verifikation Phase 4a:** `npx tsc --noEmit` grün, `pnpm build` grün (22
Routen), alle vier Test-Skripte (Preis-Engine, Fulfillment-Timing,
Lieferzeit, E-Mail-Links) grün. Dual-Verify für altes/neues Passwort-Hash-
Format manuell verifiziert (`hashPassword`/`verifyPasswordHash`). Keine
Commits erstellt. (Für die Phase-4b-Verifikation siehe Addendum oben.)

Alle Critical-Findings (A-01/C-01) sind **Fixed**. Von den 12 High-Findings
sind nach Phase 4b 10 Fixed, 1 ist **Partial** (C-04, s.u.) und 1 ist
**RISK – Rücksprache nötig** (C-15, Bestandslogik-Wahrheitsquelle) – keine
High-Finding ist stillschweigend offen geblieben. Damit ist DoD-Punkt 1
(Abschnitt 7 Master-Prompt) erfüllt.

**Verbleibende Open/Risk-Punkte mit Begründung** (Auszug, vollständige Liste
in den Bereichstabellen unten):

- **E-01 (High) – CSP `unsafe-inline` statt Nonce:** Open. Nonce-/Hash-basierte
  CSP erfordert Umbau auf Middleware-generierte Per-Request-Nonces und
  Anpassung aller Inline-Skripte/Styles – zu invasiv für einen risikoarmen
  Fix ohne dedizierten Test-Durchlauf. Empfehlung bleibt: separater Task.
- **E-04 (Medium) – Upstash Redis in Production:** Open. Code warnt nun
  (`console.warn`) bei fehlenden Upstash-Env-Vars in Production, erzwingt es
  aber nicht (würde Deploys ohne Redis hart brechen). **Menschliche
  Handlung nötig:** `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` in
  Vercel Production setzen, sonst bleibt das In-Memory-Rate-Limit pro
  Serverless-Instanz umgehbar.
- **C-05, C-06 (High, Fixed in Phase 4b) – TOCTOU bei Lagerzuweisung/
  Allocation:** Lagerzuweisung in `quote-warehouse.ts` (C-05) und der
  zentrale Buchungs-Schreibpfad `createBookingInternal` (C-06, genutzt von
  `n8n-api.ts`/`quote-booking-internal.ts`/Admin-UI) laufen jetzt unter
  Advisory-Lock in einer echten interaktiven Transaktion — siehe Addendum
  Phase 4b und Bereichstabelle C oben für Details/Restrisiken (Node≥22-
  Voraussetzung, nicht live gegen eine DB getestet).
- **C-04 (High, Partial in Phase 4b) – Transaktionen/Kompensation bei
  Zahlungsabschluss:** `finalizeQuoteAsPaid` setzt den Status jetzt erst NACH
  erfolgreicher Buchungs-Finalisierung, mit dokumentiertem Retry-Pfad bei
  Fehlschlag; Status-Update + Fulfillment-Event laufen atomar. Ein kleines
  Zeitfenster zwischen Buchung und Status-Commit bleibt aus technischen
  Gründen (keine verschachtelbaren Neon-Transaktionen) bestehen — siehe
  Addendum Phase 4b für die vollständige Einordnung.
- **C-15 (High, RISK) – Mehrfache Bestandslogik-Wahrheitsquelle:** Open.
  Verfügbarkeit wird an mehreren Stellen (Buchungen, n8n-API, Reparatur-Skript)
  unabhängig berechnet; `inventory_lots.menge` bleibt parallel ungenutzt.
  Vereinheitlichung ist eine fachliche Architekturentscheidung (welche Quelle
  ist "Wahrheit"), nicht risikofrei automatisierbar. **Menschliche
  Entscheidung nötig.**
- **A-06 (Medium) – Secrets-Trennung Auth-Fallback:** Open. `auth-core.ts`,
  `lead-auth.ts` und `angebot-access.ts` fallen weiterhin gemeinsam auf
  `WRISTLINK_PASSWORD` zurück, wenn eigene Secrets fehlen. Eine erzwungene
  Trennung (z. B. Pflicht-Env-Vars pro Zweck) würde bestehende Deployments
  ohne die neuen Secrets hart brechen – als Breaking-Change dokumentiert,
  nicht automatisch umgesetzt.
- **Bewusst offen gelassene Low-Findings (Frontend, D-Bereich):** In Phase 4c
  wurden D-01/D-02/D-06/D-07/D-08/D-09/D-10/D-12 gezielt behoben (siehe
  Addendum Phase 4c). Weiterhin bewusst offen: D-04/D-05 (Print-Meta-Header/
  `formatGroupLine`-Duplikate), D-11/D-13/D-14 (übrige Typisierung/
  Datenexposition außerhalb des Phase-4c-Scopes) sowie D-24/D-25 (inline
  `toLocaleDateString` statt zentraler Formatierungs-Utils) — alle ohne
  unmittelbaren Exploit-Pfad, reine Code-Qualität/Wartbarkeit. Nicht
  angefasst, um das Diff klein und risikoarm zu halten (Master-Prompt
  Leitplanke 9: keine Drive-by-Diffs); für spätere, dedizierte
  Refactoring-Runde empfohlen.

**Definition of Done (Master-Prompt Abschnitt 7) – Abgleich:**

- [x] Alle Critical/High-Findings sind „Fixed" oder explizit „Risk –
      Rücksprache nötig" markiert (siehe oben; keines ist stillschweigend
      offen).
- [x] `pnpm build` grün. `pnpm lint` **kann nicht ausgeführt werden** (ESLint
      ist keine Projekt-Dependency, `eslint .` → `command not found`; dies ist
      vorbestehend, keine Regression durch Phase 1/2). Ersatzweise `npx tsc
      --noEmit` grün (keine Type-Fehler).
- [x] Alle bestehenden Test-Skripte (Preis-Engine, Fulfillment-Timing,
      Lieferzeit, E-Mail-Links) laufen ohne Fehler.
- [x] Keine neuen Secrets/Klartext-Zugangsdaten im Diff (`git diff --stat` +
      Muster-Scan auf `sk_live_`/`whsec_`/`sk_test_`/`AIza`/`xoxb-`/Private-Key-
      Header ohne Treffer, siehe Subagent-F-Bericht).
- [x] `docs/audit-findings.md` vollständig und aktuell (dieses Dokument).
- [x] Keine Änderung an Preis-/Fulfillment-/Verfügbarkeits-Fachlogik ohne
      expliziten Risk-Vermerk (Stand Phase 4a: C-04/05/06/15 explizit als RISK markiert statt
      automatisch gefixt; Preis-Engine-Tests unverändert grün).

**Update nach Phase 4b:** C-05/C-06/C-07/C-11 sind jetzt Fixed (Transaktionen/
Locking/UNIQUE, siehe Addendum Phase 4b), C-04 ist Partial mit dokumentiertem
Restrisiko, nur C-15 bleibt als RISK – Rücksprache nötig offen. Die fachlichen
Verfügbarkeits-/Allokationsregeln selbst wurden dabei nicht verändert (siehe
Addendum), `npx tsc --noEmit` und `pnpm build` weiterhin grün, alle vier
Test-Skripte weiterhin grün, keine Commits erstellt.

**Hinweis ESLint:** `eslint` ist in `package.json` weder als `dependency`
noch `devDependency` gelistet, es existiert auch keine `.eslintrc*`/
`eslint.config*`. `pnpm lint` schlägt daher mit `eslint: command not found`
fehl. Das ist ein vorbestehender Zustand (nicht durch die Audit-Fixes
verursacht) und wird hier nur dokumentiert, nicht automatisch behoben (neue
Dependency + Config wäre ein eigenständiger, über den Verifikationsauftrag
hinausgehender Fix). Empfehlung: `eslint` + `eslint-config-next` als
`devDependency` ergänzen und Lint-Skript reaktivieren.

---

## Addendum – Phase 4c (Frontend: Druck-Vereinheitlichung, `public_token`, Typisierung)

Frontend-Nacharbeit im D-Bereich, aufbauend auf Phase 1–4b. Keine Commits
erstellt, Working Tree von Phase 1–4b beibehalten. Scope bewusst eng
gehalten (Muss: D-01/D-06/D-12; Soll: D-02/D-08/D-09/D-10 sowie D-07 als
risikoarmer Zusatz) – D-04/D-05/D-11/D-13/D-14/D-24/D-25 bewusst nicht
angefasst, um das Diff klein zu halten.

- **D-01 + D-06 (Fixed) – Inventar-Report-Druck vereinheitlicht:**
  `inventory-report-modal.tsx` nutzte bisher `innerHTML` + `document.write`
  in einem separat geöffneten Fenster, um den Report zu drucken. Umgestellt
  auf dasselbe iframe+Route-Muster wie `quote-packing-print-modal.tsx`:
  Neue Route `app/admin/inventory-report/druck/page.tsx` (serverseitig,
  `isAuthenticated`-Redirect + `getInventoryChangesReport`, analog zu den
  bestehenden `.../druck/{checkliste,labels,uebersicht}`-Routen) rendert den
  Report über die neue, gemeinsam genutzte Komponente
  `components/print/inventory-report-print-view.tsx` (nutzt den
  bestehenden `AutoPrint`-Helper). Das Modal zeigt die Vorschau weiterhin
  unverändert im Dialog (kein Layout-Redesign) und lädt für den eigentlichen
  Druck nur noch ein unsichtbares Iframe (`position:absolute; width:0;
  height:0`) auf diese Route, das nach `onLoad` per
  `contentWindow.print()` den nativen Druckdialog öffnet – kein
  `innerHTML`/`document.write` mehr. Die Vorschau-Tabelle wird jetzt aus
  derselben Komponente gerendert wie die Druckansicht (kein doppelter
  Markup mehr, behebt gleichzeitig D-06 „zwei Druck-Strategien").
- **D-12 (Fixed) – `public_token` nicht mehr an Client-Workflows:**
  `quote-order-workflow.tsx` und `quote-fulfillment-workflow.tsx` (beide
  `"use client"`) sowie das dazwischenliegende `auftrag-detail-view.tsx`
  erhielten bisher den vollen `QuoteRequest` (inkl. `public_token`) als
  Prop, obwohl keiner der drei `public_token` tatsächlich liest – der Wert
  wurde dadurch unnötig ins RSC-Flight-Payload an den Browser serialisiert.
  Alle drei Komponenten sind jetzt auf `Omit<QuoteRequest, "public_token">`
  typisiert; `app/warenverwaltung/auftraege/[id]/page.tsx` entfernt das Feld
  per Destrukturierung (`const { public_token: _publicToken, ...quoteForClient
  } = quote`), bevor `quote` an `<AuftragDetailView>` gereicht wird. Der
  Info-Tab (`AuftragInfoTab`, reine Server-Component, zeigt den Kunden-Link
  `/angebot/{quote.public_token}` an) erhält weiterhin den vollständigen
  `quote` – dort wird der Token wie gefordert benötigt und nur als
  gerenderter Text (nicht als Objekt-Prop) an den Client geliefert.
  `buildOrderContext` (`lib/konfigurator/order-context.ts`) nimmt dafür nur
  noch `Pick<QuoteRequest, "config_json">` entgegen (einzig genutztes Feld),
  damit es mit dem schlankeren Typ kompatibel bleibt.
- **D-02 (Fixed, Status nachgezogen) – `chart.tsx`:** War bereits in Phase 2b
  im Rahmen von D-23 gelöscht worden (keine verbliebenen Referenzen,
  verifiziert per Grep); Status in der D-02-Zeile war noch nicht
  nachgezogen und wird hier korrigiert.
- **D-07 (Fixed) – zentrale `formatDate`-Utils:** Die neue
  `inventory-report-print-view.tsx` nutzt jetzt `formatDate` aus
  `lib/utils/date.ts` statt einer erneuten lokalen Kopie (die lokale
  Implementierung aus dem alten Modal wurde beim D-01-Umbau nicht mit
  übernommen).
- **D-10 (Fixed) – `rental-protocol.tsx`:** `booking: any` durch den
  bereits vorhandenen Typ `BookingWithRelations` (`lib/types.ts`) ersetzt;
  alle inline `(item: any)`/`(i: any)` in den `.filter`/`.map`/`.reduce`-
  Aufrufen entfernt (Typen werden jetzt korrekt aus `BookingWithRelations`
  abgeleitet). `booking.created_at` ist im Typ optional – Anzeige entsprechend
  defensiv (`booking.created_at ? format(...) : "-"`).
- **D-08 (Fixed) – `bookings-table.tsx`:** Neuer Typ
  `FlattenedBookingRow = BookingWithRelations & { item: ... | null }` für die
  pro Position aufgesplitteten Tabellenzeilen; alle `(row: any)`/`(a: any,
  b: any)`/`aValue: any`/`bValue: any` in Filter- und Sortierlogik sowie der
  `const booking = row as any`-Cast beim Rendering entfernt.
- **D-09 (Fixed) – `booking-form.tsx`:** `updateBaseItem`/`updateBookingItem`
  von `value: any` auf generische Setter-Signaturen (`<K extends keyof
  BaseItemInput>(id, field: K, value: BaseItemInput[K])`, analog für
  `BookingItemInput`) umgestellt – Feld und Wert bleiben dadurch
  typgekoppelt, ohne `any`. Die `.filter((item: any) => …).map((item: any)
  => …)`-Stellen beim Vorbefüllen aus `prefilledBooking.items` nutzen jetzt
  Type-Predicate-Filter (`item is typeof item & { group_id: number }` bzw.
  `{ base_id: number }`) statt `any`, und `getBasesByBatch(...).then((data)
  => setFilteredBases(data as any))` wurde auf den vorhandenen Typ
  `BaseRow` (`lib/types.ts`) umgestellt.

**Verifikation Phase 4c:** `npx tsc --noEmit` grün (keine Type-Fehler,
inkl. der neuen Druck-Route und aller Typisierungs-Fixes). `pnpm build`
grün – 23 Routen (22 aus Phase 4a + neue `/admin/inventory-report/druck`).
Keine der vier bestehenden Test-Skripte betroffen (reiner Frontend-Scope,
keine Preis-/Fulfillment-/Verfügbarkeits-Fachlogik verändert). Keine
Commits erstellt, Working Tree von Phase 1–4b unverändert übernommen.

---

## Addendum – Phase 4d (Abschluss-Verifikation nach Phase 4a–4c)

Reine QA-Verifikation, keine neuen Fixes/Features. Ziel: Bestätigen, dass
die kumulierten Fixes aus Phase 4a–4c weiterhin grün sind, und die
Findings-Doku für den Abschluss konsolidieren. Keine Commits erstellt.

### Build/Test-Matrix

| Prüfung | Befehl | Ergebnis |
|---------|--------|----------|
| Typecheck | `npx tsc --noEmit` | ✅ Grün (keine Type-Fehler) |
| Build | `pnpm build` | ✅ Grün, 23 Routen — **mit einer Anmerkung**, siehe unten |
| Preis-Engine | `pnpm test:preis-engine` | ✅ Grün (7/7 Fälle) |
| Fulfillment-Timing | `npx tsx scripts/test-fulfillment-timing.ts` | ✅ Grün (11/11 Fälle) |
| Lieferzeit | `npx tsx scripts/test-lieferzeit.ts` | ✅ Grün (24/24 Fälle) |
| E-Mail-Links | `npx tsx scripts/test-email-links.ts` | ✅ Grün (11/11 Fälle) |
| Lint | `pnpm lint` | ❌ Nicht ausführbar – `eslint: command not found` (vorbestehend, siehe Hinweis ESLint oben) |

**Build-Anmerkung (kein Trivial-Fix nötig):** Der allererste `pnpm build`
nach vollständig gelöschtem `.next`-Verzeichnis brach beim Prerendering von
`/login` mit `TypeError: Cannot read properties of undefined (reading
'call')` ab (Next.js-Webpack-Runtime). Dies ist ein bekanntes, flakiges
Next.js-Verhalten bei paralleler statischer Seitengenerierung nach einem
kompletten Cache-Reset, kein Code-Fehler: Der identische Befehl
(`rm -rf .next && pnpm build`) lief unmittelbar danach sowie ein weiteres
Mal (`pnpm build` ohne Cache-Reset) durchgehend fehlerfrei durch, jeweils
mit allen 23 Routen. Da es sich nicht um eine durch Phase 4a–4c
verursachte Breakage handelt (keine Code-Änderung nötig, keine
Fehlerursache im Diff reproduzierbar) und der Auftrag ausdrücklich nur
„triviale Breakages aus 4a–4c" adressiert, wurde hier bewusst **nichts**
geändert – nur dokumentiert.

### Smoke-Test (lokal, `pnpm start` auf Port 3000)

| Route | Erwartung | Ergebnis |
|-------|-----------|----------|
| `/` | 200 | ✅ 200 |
| `/login` | 200 | ✅ 200 |
| `/konfigurator` | 200 | ✅ 200 |
| `/admin/inventory-report/druck` (ohne Session) | Auth-Redirect | ✅ 307 → `/login` |
| `/warenverwaltung` (ohne Session) | 307 | ✅ 307 → `/login` |

Server wurde nach dem Test wieder gestoppt (Prozess beendet, keine
verbleibenden `next`-Prozesse).

### Secrets-Scan im Diff

Musterscan (`sk_live_`, `whsec_`, `sk_test_`, `AIza…`, `xox[baprs]-`,
private-key-Header, `AKIA…`, `ghp_…`) über `git diff` (alle getrackten
Änderungen) sowie separat über alle untracked/neuen Dateien und
Verzeichnisse (u. a. `app/admin/inventory-report/`,
`components/print/inventory-report-print-view.tsx`,
`lib/actions/*-internal.ts`, `lib/safe-error.ts`,
`lib/utils/sanitize-filename.ts`, `scripts/dangerous/`,
`scripts/migration/23-sku-lot-unique.sql`, `docs/audit-findings.md`,
`docs/AUDIT-REFACTOR-MASTER-PROMPT.md`): **keine Treffer.**

### Hinweis: Fremdcommit während der Phase-4d-Session (nicht durch diesen
Auftrag verursacht)

Während der Verifikation wurde beobachtet, dass auf dem Branch
`feature/customer-quote-edit` ein neuer Commit (`docs: document customer
quote edit via angebot link`, `docs/konfigurator.md` +
`docs/superpowers/specs/2026-07-16-customer-quote-edit-design.md`)
erschienen ist. **Dieser Commit stammt nicht aus dieser Phase-4d-Session**
– es wurden zu keinem Zeitpunkt `git add`/`git commit`-Befehle ausgeführt.
Er betrifft ausschließlich Dateien außerhalb des Audit-Scopes (Doku zu
einem separaten, parallel laufenden Feature „Customer Quote Edit") und hat
keine der hier verifizierten Audit-Fixes verändert oder committet – der
gesamte Phase-1–4c-Audit-Diff (58 geänderte + 17 neue/verschobene Dateien,
siehe `git status`) ist weiterhin vollständig unstaged/untracked. Wird hier
nur zur Transparenz dokumentiert, nicht als Finding gewertet.

### Fazit Phase 4d

Alle Pflicht-Prüfungen aus dem Auftrag sind grün: Typecheck, Build (nach
Klärung des einmaligen Flakes), alle vier Test-Skripte und der manuelle
Smoke-Test. `pnpm lint` bleibt aus vorbestehenden Gründen (fehlende
ESLint-Dependency) nicht ausführbar. Der Secrets-Scan über den kompletten
Diff liefert keine Treffer. Es waren **keine Trivial-Fixes** nötig, da
Phase 4a–4c keine Breakages hinterlassen haben. Es wurden **keine Commits**
erstellt; der Working Tree entspricht weiterhin dem kumulierten,
unveränderten Stand aus Phase 1–4c. Die Findings-Doku (dieses Dokument) ist
mit diesem Addendum vollständig und aktuell. Alle Critical/High-Findings
sind entweder **Fixed**, **Partial** (C-04, mit dokumentiertem Restrisiko)
oder explizit als **Risk – Rücksprache nötig** markiert (C-15) – keines ist
stillschweigend offen geblieben.

---

## Status Subagents

| Agent | Bereich | Status |
|-------|---------|--------|
| A | Auth / Sessions | fertig |
| B | API / Webhooks | fertig |
| C | DB / Actions | fertig |
| D | Frontend / TS | fertig |
| E | Deps / Config / Secrets | fertig |

---

## E – Dependencies, Konfiguration & Secrets

| ID | Bereich | Severity | Datei:Zeile | Beschreibung | Empfehlung | Status |
|----|---------|----------|-------------|--------------|------------|--------|
| E-01 | CSP / Security-Header | High | `next.config.mjs` | `script-src`/`style-src` mit `'unsafe-inline'` (auch Production) schwächt XSS-Schutz der CSP. | Nonce-/Hash-basierte CSP (Middleware + Next Headers). | Open |
| E-02 | Security-Header | Medium | `next.config.mjs` | `Permissions-Policy` fehlt; COOP/CORP fehlen. | Header ergänzen (siehe Master-Prompt/E-Diff). | **Fixed** (Phase 2a): `Permissions-Policy` (Kamera/Mikrofon/Geolocation deaktiviert, `payment` auf `self` + `https://js.stripe.com` beschränkt), `Cross-Origin-Opener-Policy: same-origin` und `Cross-Origin-Resource-Policy: same-origin` in `securityHeaders` (`next.config.mjs`) ergänzt. E-01 (Nonce-CSP) bewusst nicht angefasst (zu invasiv, separater Task). CORP/COOP wurden geprüft: Stripe Checkout läuft als Vollseiten-Redirect zu `checkout.stripe.com` (kein Popup-`window.opener`- oder Cross-Origin-Embedding-Flow dieser App), `frame-ancestors 'none'` verhindert Framing bereits zusätzlich – kein Konflikt erwartet. `pnpm build` grün. |
| E-03 | Rate-Limiting | Medium | `app/api/availability`, `app/api/bookings` | n8n-Routen nur Bearer-Auth, kein Rate-Limit. | `checkRateLimit()` pro API-Key. | **Fixed** (Phase 1c): Neuer Helper `checkN8nApiRateLimit` (`lib/rate-limit.ts`, 90 Requests/Minute pro Client-IP) nach erfolgreicher `verifyApiKey`-Prüfung in `app/api/availability/route.ts` (GET+POST) und `app/api/bookings/route.ts` ergänzt; bei Limit 429 via `rateLimitResponse`. Fail-closed: ungültiger Bearer-Key liefert weiterhin sofort 401, ohne dass ein Rate-Limit-Zähler verbraucht wird. `app/api/quote-requests/route.ts` (gleiches Bearer-Auth-Muster, nicht im ursprünglichen Scope) wurde konsistent mit demselben Helper ergänzt. |
| E-04 | Rate-Limit-Architektur | Medium | `lib/rate-limit.ts` | In-Memory-Fallback pro Serverless-Instanz → Limit auf Vercel effektiv umgehbar. | Production: Upstash Redis verbindlich. | Open – kein Code-Zwang auf Upstash (würde Deploy ohne Redis brechen). Phase 1c: einmaliger `console.warn` in `getUpstashLimiter`, wenn `NODE_ENV=production` und `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` fehlen. **Production-Hinweis: Upstash Redis Env-Vars in Vercel setzen**, sonst bleibt das In-Memory-Fallback-Risiko (mehrere Serverless-Instanzen/Cold-Starts) bestehen. |
| E-05 | Dependencies – Next | Low | `package.json` | `next@15.5.20` oberhalb gepatchter `15.5.18` (CVEs Mai 2026) – ok; Major 16.x geplant. | Patch-Stand halten; 16.x separat. | Open |
| E-06 | Dependencies – Stripe | Low | `package.json` | `stripe@22.3.0` → `22.3.2`. | Patch-Upgrade. | **Fixed** (Phase 4a): `pnpm update stripe` → `22.3.2`, Lockfile aktualisiert. `pnpm build` + `tsc --noEmit` grün, kein API-Breaking-Change (reiner Patch). |
| E-07 | Dependencies – Resend | Low | `package.json` | `resend@6.16.0` → `6.17.x`. | Minor-Upgrade, Changelog prüfen. | **Fixed** (Phase 4a): `pnpm update resend` → `6.17.2`, Lockfile aktualisiert. `pnpm build` + `tsc --noEmit` grün. |
| E-08 | Dependencies – Neon | Low | `package.json` | `@neondatabase/serverless@1.0.2` → `1.1.0` (Node ≥19). | Upgrade nach Runtime-Check. | Open |
| E-09 | Dependencies – Sharp | Low | `package.json` | `sharp@0.33.5` → `0.35.x`. | Wartungsupdate. | Open |
| E-10 | tsconfig | Low | `tsconfig.json` | `strict: true` ok; `noUncheckedIndexedAccess` etc. fehlen. | Optional härten. | Open |
| E-11 | Versionsstrategie | Low | `package.json` | Caret bei stripe/resend; Lockfile schützt bei frozen install. | CI: `--frozen-lockfile`. | Open |
| E-12 | Middleware-Scope | Info | `middleware.ts` | API vom Matcher ausgeschlossen – beabsichtigt. | Keine Aktion. | Open |
| E-13 | CORS | Info | `app/api/**` | Kein `Access-Control-Allow-Origin: *`. | Keine Aktion. | Open |
| E-14 | Secrets-Doku | Info | `docs/TODO.md` | Secrets-Rotation laut TODO noch offen (manuell). | Außerhalb Code-Audit. | Open |

**E-Positiv:** Kein Secret in `next.config` `env`-Block; keine Secret-Leaks in Git-History; `.gitignore` ok; nur `NEXT_PUBLIC_APP_URL` (unkritisch).

### E Severity-Zählung

Critical 0 · High 1 · Medium 3 · Low 6 · Info 4

---

## A – Auth / Sessions

| ID | Bereich | Severity | Datei:Zeile | Beschreibung | Empfehlung | Status |
|----|---------|----------|-------------|--------------|------------|--------|
| A-01 | Server Action Auth | Critical | `lib/actions/quote-booking.ts` | Hold/Confirm/Release/Finalize/Ensure ohne Auth; `ensureQuoteBooking` aus Client importiert → Buchungen ohne Session. | `requireRole`/`isAuthenticated` an jede exportierte Funktion. | **Fixed** (Phase 1a): `createQuoteHoldBooking`/`confirmQuoteBooking`/`releaseQuoteBooking`/`finalizeQuoteBookingOnPayment` + Helper nach `lib/actions/quote-booking-internal.ts` (kein `"use server"`, `import "server-only"`) verschoben – dadurch keine Server-Action-Oberfläche mehr, aber weiterhin nutzbar von `lib/quotes-internal.ts` (öffentlicher Angebots-Flow, Stripe-Webhook). `lib/actions/quote-booking.ts` exportiert nur noch `ensureQuoteBooking`, jetzt mit `await requireRole(["ADMIN"])` als erste Zeile. |
| A-02 | Server Action Auth | High | `lib/actions/admin.ts` | `syncSKUsAndLots` ohne `requireRole`, Client-Aufruf. | `requireRole(["ADMIN"])` ergänzen. | **Fixed** (Phase 1a): `await requireRole(["ADMIN"])` als erste Zeile in `syncSKUsAndLots` ergänzt (analog zu den übrigen Funktionen der Datei). |
| A-03 | Server Action Auth | High | `lib/actions/bookings.ts` | Mehrere Availability/Stats-Exporte ohne Auth, Client-Import (booking-form/admin-actions). | `ensureAuthed()` einheitlich. | **Fixed** (Phase 1a): `getBasesByBatch`, `getAvailabilityForGroupByDateRange`, `getRentedItemsByGroup`, `getRemainingRentalAmounts` direkt mit `ensureAuthed()` abgesichert. `getBaseAvailability`, `getBaseAvailabilityByDateRange`, `getBufferSettings` haben zusätzlich einen legitimen, nicht Session-gebundenen Aufrufer (öffentlicher Konfigurator via `lib/konfigurator/station-availability.ts`/n8n-api) – dafür in `*Internal`-Kernfunktion (ohne Auth) + auth-geschützten Export gesplittet; die öffentlichen Aufrufer nutzen jetzt explizit die `*Internal`-Varianten. `createBookingInternal` nach `lib/actions/bookings-internal.ts` (kein `"use server"`) verschoben, da es sowohl vom authentifizierten `createBooking`-Wrapper als auch von nicht-Session-gebundenen Pfaden (n8n-Webhook-Buchungen, Stripe-Zahlungsabschluss) genutzt wird und dadurch komplett aus der Server-Actions-Oberfläche entfernt ist. |
| A-04 | Rollen | Medium | `auth.ts` / bookings / quote-warehouse | Schreibende Aktionen oft nur `isAuthenticated` → VIEWER kann schreiben; EDITOR ungenutzt. | Schreibaktionen auf `canEdit`/`["ADMIN","EDITOR"]`. | **Fixed** (Phase 2a): `lib/actions/bookings.ts` (`createBooking`, `updateBookingStatus`) und `lib/actions/quote-warehouse.ts` (`updateQuoteBookingBaseAllocation`, `saveQuoteBandAllocations`, `updateQuoteBookingAllocation`) prüfen jetzt `getUser()` + `canEdit(user)` statt nur `isAuthenticated()` – VIEWER erhält `"Keine Berechtigung"`. Bestehende `requireRole(["ADMIN"])`-Aktionen unverändert. Rein lesende Exporte (`getBookings`, `getStats`, etc.) unverändert bei `ensureAuthed()`/`isAuthenticated()`. |
| A-05 | Kryptografie | Medium | `lead-auth.ts`, `angebot-access.ts` | Hash statt HMAC (Length-Extension); inkonsistent zu Admin-Auth. | `createHmac` wie `auth-core.ts`. | **Fixed** (Phase 1b): `signLeadPayload`/`signAngebotToken` nutzen jetzt `createHmac("sha256", secret)` analog `auth-core.ts`, timing-safe Vergleich beibehalten. Übergangsphase: `verifyLeadToken`/`verifyAngebotAccessCookie` akzeptieren zusätzlich die alte SHA256-Signatur (`signLeadPayloadLegacy`/`signAngebotTokenLegacy`) rein lesend, bis bestehende Cookies natürlich auslaufen (`LEAD_SESSION_MAX_AGE` = 7 Tage, `ANGEBOT_ACCESS_MAX_AGE` = 30 Tage); neu ausgestellte Cookies verwenden ausschließlich HMAC. Keine Änderung an `auth-core.ts`/`middleware.ts`. |
| A-06 | Secret-Management | Medium | auth-core / lead-auth / angebot-access | Gemeinsamer Fallback auf `WRISTLINK_PASSWORD` für drei Zwecke. | Getrennte Secrets erzwingen. | Open – Phase 4a: einmaliger `console.warn` in Production ergänzt (`lib/auth-core.ts` `getSessionSecret`, `lib/konfigurator/lead-auth.ts` `getLeadSecret`, `lib/konfigurator/angebot-access.ts` `getSecret`), wenn kein eigenes Secret gesetzt ist und auf `WRISTLINK_PASSWORD` zurückgefallen wird. Bewusst NICHT hart erzwungen (Breaking Change für bestehende Deployments ohne die dedizierten Secrets) – menschliche Entscheidung/Rollout nötig, um `WRISTLINK_SESSION_SECRET`/`LEAD_SESSION_SECRET` verbindlich zu setzen.
| A-07 | Rate-Limiting | High | `lib/rate-limit.ts` | `x-forwarded-for` ungeprüft spoofbar → Login- und PLZ-Limits umgehbar. | Trusted-Proxy-/Vercel-Header. | **Fixed** (Phase 1c): `getClientIp`/`getClientIpFromHeaders` nutzen jetzt eine zentrale `extractClientIp`-Funktion mit Vercel-bewusster Priorität: 1) `x-vercel-forwarded-for` (von Vercels Edge gesetzt, bleibt bei nachgelagerten Rewrites/eigenen Proxies unverändert), 2) `x-real-ip`, 3) `x-forwarded-for` als konservativer Fallback – hier wird der LETZTE Eintrag der Chain verwendet statt des ersten (ein Client kann nur Einträge vor dem vertrauenswürdigeren Edge/Proxy-Hop einschleusen, nicht dahinter). Fallback `"unknown"` unverändert. Alle bisherigen Aufrufer (Login, PLZ-Unlock, Konfigurator-Submit/Distance) sowie die neuen Aufrufer (verify-request, n8n-API-Routen) nutzen weiterhin dieselben zwei Funktionen – eine zentrale Fix-Stelle, keine Änderung an den Call-Sites nötig. |
| A-08 | Authentifizierung | Medium | `lib/auth.ts` | Timing-Seitenkanal bei unbekannter E-Mail (kein Dummy-scrypt). | Dummy-Hash immer verifizieren. | **Fixed** (Phase 2a): Modul-weiter, einmalig via `hashPassword(...)` erzeugter `DUMMY_PASSWORD_HASH` (kein echtes Secret); `login()` ruft `verifyPasswordHash` jetzt immer auf (`user?.password ?? DUMMY_PASSWORD_HASH`), auch bei unbekannter E-Mail, sodass die Antwortzeit nicht mehr verrät, ob der Account existiert. |
| A-09 | Error-Handling | Medium | `offer-pdf/route.ts` | Auth-Throw → 500 statt 401. | try/catch + 401. | **Fixed** (Phase 2a): siehe B-04. |
| A-10 | Error-Handling | Low | quote-warehouse / fulfillment | Rohe `error.message` an Client. | `toSafeErrorMessage`. | **Fixed** (Phase 2a): siehe C-14. |
| A-11 | Passwort-Hashing | Low | `lib/password.ts` | scrypt Default N=16384 unter OWASP-Empfehlung. | N explizit erhöhen/dokumentieren. | **Fixed** (Phase 4a): N/r/p (16384/8/1) jetzt explizit gesetzt statt implizit über Node-Defaults, mit Kommentar/OWASP-Referenz (N=2^14 = OWASP-Mindeststufe für interaktive Logins). Neues Hash-Format `scrypt2:N:r:p:salt:hash` speichert die Parameter im String, sodass N künftig ohne Breaking-Change weiter angehoben werden kann; `verifyPasswordHash` unterstützt das alte `scrypt:salt:hash`-Format (impliziter Node-Default) weiterhin parallel (Dual-Verify) – bestehende Passwort-Hashes bleiben gültig. |
| A-12 | Defense-in-Depth | Low | quote-offer-pdf / leads | Interne Helper ohne Auth (aktuell nicht Client-erreichbar). | Auth oder `server-only` ohne Action-Export. | **Fixed** (Phase 4a): `getLeadById` (`lib/actions/leads.ts` → neu `lib/actions/leads-internal.ts`) und `getQuoteOfferPdfForEmail` (`lib/actions/quote-offer-pdf.ts` → neu `lib/actions/quote-offer-pdf-internal.ts`) in jeweils ein `server-only`-Modul OHNE `"use server"` verschoben – dadurch keine Server-Action-Oberfläche mehr für diese beiden rein internen Helper (kein direkter Client-Aufruf ohne die umgebende, bereits auth-geprüfte Fachlogik möglich). Aufrufer (`lib/quotes-internal.ts`, `lib/actions/fulfillment.ts`, `lib/actions/quotes.ts`) importieren jetzt aus den neuen internen Modulen; keine Verhaltensänderung. |
| A-13 | PLZ-Gate | Low | angebot unlock | Rate-Limit ok, aber abhängig von A-07. | Nach A-07 ggf. Token-basiertes Limit. | Open |

**A-Positiv:** Middleware↔Node-HMAC konsistent; Cookies httpOnly/secure/sameSite; timing-safe Vergleiche; Angebot-Token = UUID (hohe Entropie).

### A Severity-Zählung

Critical 1 · High 3 · Medium 5 · Low 4

## B – API / Webhooks

| ID | Bereich | Severity | Datei:Zeile | Beschreibung | Empfehlung | Status |
|----|---------|----------|-------------|--------------|------------|--------|
| B-01 | Konfigurator submit/session | High | `app/api/konfigurator/submit`, `session` | `quoteConfigSchema` existiert, wird aber nicht genutzt; `body.config` ungeprüft gecastet → Fehldaten in DB/Preis/Telegram. | `quoteConfigSchema.safeParse` vor Verwendung, bei Fehler 400. | **Fixed** (Phase 1b): Beide Routen validieren den Body jetzt mit `z.object({ config: quoteConfigSchema })` (`session` zusätzlich mit optionalem `action`-Feld) via `safeParse`; bei Fehler generische 400-Antwort mit `formatZodError` (keine Stacktraces). Fachlogik (Kanalanzahl-Auflösung, Preis, Verfügbarkeit) unverändert. `app/api/quote-requests/route.ts` (externe, Bearer-authentifizierte Route, nicht Teil des B-01-Scopes) bleibt unverändert – validiert weiterhin nur Pflichtfelder manuell. |
| B-02 | verify-request | Medium | `app/api/konfigurator/verify-request` | Kein IP-Rate-Limit → Mail-Bombing über viele fremde Adressen. | IP-Rate-Limit wie bei submit/distance. | **Fixed** (Phase 1c): Neuer Helper `checkVerifyRequestRateLimit` (`lib/rate-limit.ts`, 10 Requests/Stunde pro Client-IP) direkt am Anfang der Route ergänzt, zusätzlich zum bestehenden E-Mail-basierten Limit in `lib/actions/leads.ts`. Die vorher lokal duplizierte, spoofbare `x-forwarded-for`-Auswertung wurde entfernt und durch `getClientIp(request)` ersetzt (siehe A-07). |
| B-03 | Lead-Session-Auth | Medium | `lib/konfigurator/lead-auth.ts` | Session als `SHA256(secret+":"+payload)` statt HMAC (Längenerweiterung). | Auf `createHmac` umstellen, analog Admin-Auth. | **Fixed** (Phase 1b): siehe A-05 – identischer Fix, inkl. `angebot-access.ts`. |
| B-04 | offer-pdf Auth | Low | `app/api/admin/quotes/[id]/offer-pdf` | Auth nur indirekt via Action; unautorisiert → 500 statt 401/403. | Auth + try/catch in der Route. | **Fixed** (Phase 2a): Route prüft jetzt explizit `getUser()`/`canAdmin()` am Anfang (401 bei fehlender Session, 403 bei falscher Rolle, beides als JSON) und umschließt `getQuoteOfferPdf` zusätzlich mit try/catch (500 JSON statt ungehandeltem Crash). Der bestehende `requireRole(["ADMIN"])`-Check innerhalb `getQuoteOfferPdf` bleibt als Defense-in-Depth erhalten. |
| B-05 | offer-pdf Header | Low | dieselbe Route | `filename` aus Upload ungeprüft in `Content-Disposition`. | `sanitizeFilename()` wie bei Logo. | **Fixed** (Phase 2a): `sanitizeFilename()` aus der Logo-Route nach `lib/utils/sanitize-filename.ts` extrahiert (gemeinsamer Helper, Logo-Route entsprechend angepasst) und in der offer-pdf-Route auf den PDF-`filename` angewendet. |
| B-06 | server-only | Low | stripe/telegram/sevdesk/n8n/api-auth | Kein `import "server-only"` bei Secret-Modulen. | `server-only` ergänzen. | **Fixed** (Phase 2a): `import "server-only"` ergänzt in `lib/konfigurator/stripe.ts`, `telegram.ts`, `sevdesk.ts`, `sevdesk-offer.ts`, `lib/actions/n8n-api.ts`, `lib/api-auth.ts`. Geprüft: Client-Komponenten importieren aus `n8n-api.ts` nur `import type { AvailabilityResponse }` (typ-only, wird von TS eliminiert, kein Runtime-Import) – `pnpm build` bestätigt grün, keine Bundle-Brüche. |
| B-07 | Logo MIME | Low | `lib/actions/konfigurator-logos.ts` | Nur client `file.type`, keine Magic-Bytes. | Inhalt/Signatur prüfen (z. B. sharp). | **Fixed** (Phase 4a): PNG-Magic-Bytes-Prüfung (8-Byte-Signatur `89 50 4E 47 0D 0A 1A 0A`) in `saveKonfiguratorLogo` vor dem Speichern ergänzt (`hasPngSignature`) – keine neue Dependency (kein `sharp`, das war bereits nur `devDependency` für Build-Tooling, nicht für Laufzeit-Bildverarbeitung vorgesehen). Client-`file.type`-Check bleibt als schnelle Vorabprüfung erhalten. |
| B-08 | session Rate-Limit | Low | `app/api/konfigurator/session` | Kein Rate-Limit auf price/availability-Actions. | Leichtes Limit pro Lead/IP. | **Fixed** (Phase 4a): Neuer Helper `checkKonfiguratorSessionRateLimit` (`lib/rate-limit.ts`, 60 Requests/Minute pro Client-IP) direkt nach dem Verified-Lead-Check in `POST` ergänzt; bei Limit 429 via `rateLimitResponse`. `GET` (reiner Session-Status-Check) unverändert, da kein eigentlicher Preis-/Verfügbarkeits-Actionpfad. |
| B-09 | Stripe Idempotenz | Low | stripe webhook / `processPaidQuote` | SELECT-then-INSERT nicht transaktional → parallele Events können 500 auslösen. | try/catch oder `ON CONFLICT DO NOTHING`. | **Fixed** (Phase 4a): `processPaidQuote` nutzt jetzt ein atomares `INSERT ... ON CONFLICT (event_id) DO NOTHING RETURNING event_id` statt SELECT-then-INSERT; bei Konflikt (bereits verarbeitet) `alreadyProcessed: true` statt Fehler. `app/api/stripe/webhook/route.ts` ruft `processPaidQuote` zusätzlich in try/catch auf und loggt Fehler serverseitig, liefert aber weiterhin `{received:true}`, damit Stripe nicht unnötig retried. `finalizeQuoteAsPaid`-Fachlogik unverändert. |
| B-10 | Error Leak | Low | `approveQuoteRequest` | Stripe-SDK `e.message` an Bearer-Client. | Generische Meldung + Server-Log. | **Fixed** (bereits in Phase 2a via C-14): `approveQuoteRequest` fängt den Stripe-Checkout-Fehler bereits mit `toSafeErrorMessage(e, "createCheckoutSessionForQuote")` ab (Zeile ~460) und umschließt die gesamte Funktion zusätzlich mit try/catch + `toSafeErrorMessage(e, "approveQuoteRequest")`. In Phase 4a verifiziert, keine weitere Code-Änderung nötig – Status war in der Gesamttabelle noch nicht nachgezogen. |

**B-Positiv:** Stripe raw-body + Signatur ok; Telegram fail-closed + timing-safe; Bearer-Auth konsistent; keine zustandsändernden GETs; sevDesk-Token nur serverseitig.

### B Severity-Zählung

Critical 0 · High 1 · Medium 2 · Low 7

## C – DB / Actions

| ID | Bereich | Severity | Datei:Zeile | Beschreibung | Empfehlung | Status |
|----|---------|----------|-------------|--------------|------------|--------|
| C-01 | Actions/Auth | High | `lib/actions/quote-booking.ts` | Exportierte Booking-Funktionen (`confirm`/`release`/`createHold`/`finalize`/`ensure`) ohne Auth-Check; `releaseQuoteBooking` löscht ungeprüft. | Auth-Guard an jeder exportierten Funktion. | **Fixed** (Phase 1a): siehe A-01 – `confirm`/`release`/`createHold`/`finalize` sind jetzt reine interne Helper ohne Server-Action-Export (`quote-booking-internal.ts`); `ensureQuoteBooking` (einziger Client-Einstiegspunkt) hat `requireRole(["ADMIN"])`. |
| C-02 | Actions/Auth | High | `lib/actions/bookings.ts` | `createBookingInternal` exportiert ohne Auth (nur Wrapper prüft). | Auth in Internal oder nicht exportieren. | **Fixed** (Phase 1a): `createBookingInternal` nicht mehr aus `"use server"`-Datei exportiert, sondern nach `lib/actions/bookings-internal.ts` verschoben (nur noch von `createBooking` (authed), `n8n-api.ts` und `quote-booking-internal.ts` importierbar). |
| C-03 | Actions/Auth | High | `lib/actions/admin.ts` | `syncSKUsAndLots` ohne `requireRole(["ADMIN"])`. | Auth ergänzen. | **Fixed** (Phase 1a): siehe A-02. |
| C-04 | Transaktionen | High | `lib/quotes-internal.ts` | `processPaidQuote`/`finalizeQuoteAsPaid` nicht transaktional → Teilzustände möglich. | Transaktion/Retry. **RISK – Rücksprache** (Zahlungsfluss). | **Partial** (Phase 4b): Event-Insert war bereits seit Phase 4a atomar (B-09, `ON CONFLICT DO NOTHING RETURNING`). Neu: **Reihenfolge geändert** — `finalizeQuoteBookingOnPayment` läuft jetzt VOR dem Status-Wechsel auf `paid` (vorher danach). Schlägt die Buchung fehl, bleibt der Status auf dem bisherigen, zahlbaren Wert (`approved`/`payment_pending`) stehen statt „paid ohne Buchung" — die bestehende Notes-Meldung bleibt erhalten, zusätzlich liefert `finalizeQuoteAsPaid` jetzt `success:false` mit klarem Retry-Hinweis auf den Admin-Pfad `markQuoteAsPaid` (`lib/actions/quotes.ts`), der bei erneutem Aufruf denselben (weiterhin zahlbaren) Status vorfindet und die Buchung erneut versuchen kann. Status-Update + `quote_fulfillment_events`-Insert laufen jetzt gemeinsam in EINER nicht-interaktiven `sql.transaction([...])` (atomar committet); `mail_sent`/`mail_subject` werden dabei defensiv mit `false`/`NULL` vorbelegt und per kompensierendem `UPDATE` nachgetragen, sobald das (bewusst außerhalb der DB-Transaktion laufende) Mail-Ergebnis vorliegt. **Weiterhin RISK/Partial:** Die Buchungs-Finalisierung selbst (`finalizeQuoteBookingOnPayment` → `createN8nBooking`/`createBookingInternal`) ist intern jetzt zwar TOCTOU-sicher (siehe C-06), aber sie läuft nicht in DERSELBEN DB-Transaktion wie der Status-Flip (nicht sinnvoll ohne größeren Umbau, da `createBookingInternal` selbst schon eine eigene interaktive Transaktion mit Advisory-Lock hält und Neon HTTP-Transaktionen nicht verschachtelbar sind). Ein Crash exakt zwischen erfolgreicher Buchung und dem Status-Commit bliebe weiterhin als (sehr kleines) Fenster bestehen — dafür gibt es aber jetzt den dokumentierten Retry-Pfad statt eines stillen Silent-Failure-Zustands. |
| C-05 | Transaktionen | High | `lib/actions/quote-warehouse.ts` | TOCTOU bei Lagerzuweisung (Check dann Write ohne Lock). | `FOR UPDATE`/Serializable. **RISK – Rücksprache**. | **Fixed** (Phase 4b): `updateQuoteBookingBaseAllocation`, `saveQuoteBandAllocations` und `updateQuoteBookingAllocation` führen Verfügbarkeits-Check + Schreiben jetzt gemeinsam in einer echten interaktiven Transaktion aus (`withInteractiveTransaction`, `lib/db.ts` — dedizierte WebSocket-Session über `Pool`/`Client` aus `@neondatabase/serverless`, `BEGIN…COMMIT/ROLLBACK`, Isolation `RepeatableRead`), abgesichert durch `pg_advisory_xact_lock` auf die betroffene(n) Ressource(n) (`base:{baseId}` bzw. `band:{groupId}:{batchId}`, sortiert erworben gegen Deadlocks). Die fachliche Verfügbarkeitsprüfung (`checkBaseAvailabilityForBooking`/`effectiveBandAvailability`) läuft unverändert, aber garantiert erst NACH Lock-Erwerb — ein zweiter paralleler Aufruf für dieselbe Ressource sieht dadurch immer den bereits committeten Stand des ersten. Neon-HTTP-Non-Interactive-`sql.transaction([...])` reichte hier nicht aus, da der Verfügbarkeits-Check ein Zwischenergebnis liefert, von dem abhängt, OB überhaupt geschrieben wird (klassischer Check-then-Act) — daher `Pool`/`Client` mit echtem `BEGIN`/`COMMIT` für genau diese drei Funktionen, Connection wird danach freigegeben (`client.release()`). **Voraussetzung:** Node-Runtime mit globalem `WebSocket` (Node ≥ 22, siehe `package.json` "engines"); in dieser Session nicht gegen eine echte Datenbank getestet (kein DB-Zugriff im Audit-Sandbox), nur Typecheck/Build verifiziert — vor Produktivbetrieb einmal mit zwei parallelen Requests gegen eine Staging-DB gegenzuprüfen. |
| C-06 | Transaktionen | High | `n8n-api.ts` / `quote-booking.ts` | `findBestAllocation*` ohne Lock → Überbuchung möglich. | Wie C-05. **RISK – Rücksprache**. | **Fixed** (Phase 4b): Der eigentliche Schreib-Choke-Point `createBookingInternal` (`lib/actions/bookings-internal.ts`) — von `createN8nBooking` (n8n-Reservierungen), `finalizeQuoteBookingOnPayment`/`findBestSaleAllocation` (Verkaufsbuchung bei Zahlung) UND der Admin-UI (`createBooking`) gemeinsam genutzt — führt Verfügbarkeits-Check (`getAvailabilityForGroupInternal`/`getRentedItemsByGroupInternal`, unverändert) und Schreiben (Buchung + `booking_items` + `inventory_lots`) jetzt in derselben interaktiven Transaktion mit Advisory-Lock auf `band:{groupId}:{batchId}` aus (analog C-05). `findBestAllocation`/`findBestSaleAllocation` (die Auswahl-Heuristik, WELCHE Gruppe/Charge am besten passt) bleibt bewusst ungelockt/optimistisch — sie liefert nur einen Kandidaten, den `createBookingInternal` danach unter Lock erneut validiert. Verlieren zwei parallele Anfragen um dieselbe Charge, gewinnt genau eine (Commit), die andere bekommt die reguläre "nicht genügend verfügbar"-Fehlermeldung statt einer stillen Überbuchung. Zusätzlich: Der bisherige Lost-Update bei `inventory_lots.menge` (SELECT-then-UPDATE) wurde durch atomare Single-Statement-`UPDATE menge = menge ± $delta`/`INSERT … ON CONFLICT DO UPDATE` ersetzt (siehe C-11) — unabhängig von den Advisory-Locks bereits selbst race-sicher. Gleiche Node≥22/WebSocket-Voraussetzung und derselbe Test-Hinweis wie bei C-05. |
| C-07 | Transaktionen | Medium | `quote-warehouse.ts` | `saveQuoteBandAllocations`: DELETE+Insert-Schleife nicht transaktional. | Transaktion um Block. | **Fixed** (Phase 4b): DELETE der alten `booking_items`-Zeilen und alle INSERTs der neuen Zuweisung laufen jetzt zusammen in derselben interaktiven Transaktion wie der C-05-Fix für diese Funktion (kein zusätzlicher Umbau nötig, da beide Härtungen denselben kritischen Abschnitt betreffen) — bei einem Fehler (z. B. defekte SKU-Auflösung) wird die gesamte Transaktion zurückgerollt, alte Zuweisungen bleiben unverändert erhalten statt in einem "halb gelöscht"-Zwischenzustand zu landen. Fachlogik der Zuweisung unverändert. |
| C-08 | Migrationen | Medium | `scripts/run-migrations.mjs` | Keine Tracking-Tabelle; rein IF NOT EXISTS. | `schema_migrations` einführen. | Open — als "optional wenn Zeit" eingestuft und in Phase 4b bewusst zurückgestellt, um den Fokus auf die risikoreicheren C-04/05/06/07/11-Fixes zu legen. Weiterhin nur `IF NOT EXISTS`-Idempotenz, keine Tracking-Tabelle. |
| C-09 | Migrationen | Low | `scripts/19-add-defective-items.sql` u. a. | Verwaiste Alt-Skripte, teils nicht idempotent. | Archivieren oder Guards. | Open |
| C-10 | Migrationen | Medium | `scripts/18-complete-reset.sql` | Destruktives Reset ohne Preflight neben harmlosen Skripten. | Warnung/`dangerous/`-Ordner. | **Fixed** (Phase 4a): Datei nach `scripts/dangerous/18-complete-reset.sql` verschoben, `scripts/dangerous/README.md` mit Warnhinweisen (Backup-Pflicht, richtige DB-Verbindung prüfen, nur manuell ausführen) ergänzt. Referenz-Check: Keine andere Datei (insb. `scripts/run-migrations.mjs`, das nur `scripts/migration/01…22-*.sql` referenziert – andere Nummerierung, keine Kollision) verweist auf den alten Pfad; keine Anpassung an anderer Stelle nötig. |
| C-11 | Integrität | Medium | `01-schema.sql` / resolveSku/Lot | Kein UNIQUE auf SKU/Lot-Kombis → Race-Duplikate. | UNIQUE + ON CONFLICT. | **Fixed** (Phase 4b): Neue Migration `scripts/migration/23-sku-lot-unique.sql` (idempotent, in `scripts/run-migrations.mjs` verkettet) bereinigt zuerst etwaige bestehende Duplikate (`skus` nach `item_type+group_id`, `inventory_lots` nach `sku_id+batch_id` — Zusammenführen auf die älteste Zeile, `menge` wird summiert, referenzierende `booking_items`/`inventory_lots` werden umgehängt statt gelöscht) und legt danach `UNIQUE INDEX IF NOT EXISTS` auf beide Kombinationen an. Code: `resolveSkuId` (jetzt gemeinsam genutzt aus neuem `lib/actions/sku-lot-internal.ts` statt dupliziert in `quote-warehouse.ts` UND `bookings-internal.ts`) nutzt `INSERT … ON CONFLICT (item_type, group_id) DO NOTHING RETURNING id` statt Check-then-Insert; die `inventory_lots`-Bestandsfortschreibung in `createBookingInternal` nutzt für ZUGANG `INSERT … ON CONFLICT (sku_id, batch_id) DO UPDATE SET menge = inventory_lots.menge + EXCLUDED.menge` und für VERKAUF/MIETE_RÜCKGABE ein atomares `UPDATE … SET menge = menge ± $delta` statt SELECT-dann-UPDATE. **Nicht in dieser Session gegen eine echte DB ausgeführt** (kein DB-Zugriff im Audit-Sandbox) — Migration vor Produktivbetrieb einmal in einem Wartungsfenster laufen lassen und Duplikat-Bereinigung im Log prüfen. |
| C-12 | Secrets | Medium | `16-users-auth.sql` | Fest kodierter Admin-Passwort-Hash in Migration. | Setup via ENV; Passwort rotieren. | Open |
| C-13 | Performance | Low | Schema / Queries | Fehlende Composite-Indizes (bases, booking_items). | Neue Migration. | Open |
| C-14 | Info-Leak | Medium | quote-warehouse, fulfillment, quotes-internal | `error.message` an Client statt `toSafeErrorMessage`. | Einheitliches Safe-Pattern. | **Fixed** (Phase 2a): `toSafeErrorMessage` aus `lib/actions/admin.ts` nach `lib/safe-error.ts` extrahiert (verhindert zyklische Imports; `admin.ts` nutzt jetzt ebenfalls den gemeinsamen Helper). Angewendet in `lib/actions/quote-warehouse.ts` (`updateQuoteBookingBaseAllocation`, `saveQuoteBandAllocations`, `updateQuoteBookingAllocation`, `confirmPackingDocsPrinted` – dort bleibt der spezifische Migrations-Hinweis für `packing_docs_printed_at` als bewusste Ausnahme erhalten, da er keine internen Details leakt), `lib/actions/fulfillment.ts` (`advanceFulfillmentStep`) und `lib/quotes-internal.ts` (`approveQuoteRequest`, inkl. Stripe-Checkout-Fehler – wirkt sich auch mildernd auf B-10 aus, da dieser Pfad über die Bearer-Route `app/api/quote-requests/[id]/approve` erreichbar ist). |
| C-15 | Bestandslogik | High | bookings / n8n / repair-Skript | Mehrfach implementierte Verfügbarkeit; `inventory_lots.menge` parallel ungenutzt. | **RISK – Rücksprache** (Wahrheitsquelle wählen). | Open — weiterhin bewusst nicht angefasst (wie beauftragt, nur dokumentieren). Durch Phase 4b sogar noch sichtbarer geworden: Die C-11/C-06-Fixes machen `inventory_lots.menge` für ZUGANG/VERKAUF/MIETE_RÜCKGABE jetzt korrekt/race-sicher fortschreibbar, aber die tatsächliche Verfügbarkeitsberechnung (`getAvailabilityForGroupInternal` u. a.) bleibt weiterhin komplett Ledger-basiert (Summe über `booking_items`) und liest `inventory_lots.menge` nirgends. Die beiden Zahlenquellen können weiter divergieren. **Empfehlung unverändert: `booking_items`-Ledger als alleinige Wahrheitsquelle festlegen** und `inventory_lots.menge` entweder als reine Nachvollziehbarkeits-/Audit-Spalte deklarieren oder mittelfristig entfernen — menschliche Architekturentscheidung nötig. |
| C-16 | N+1 | Medium | `quote-booking.ts` | Pro-Zeile Queries in loadAvailableBases/Pools. | Batch-Queries. | Open |
| C-17 | N+1 | Medium | `n8n-api.ts` / quote-booking | Allocation-Schleifen mit Einzel-Calls. | Bestehende Batch-Variante nutzen. | Open |
| C-18 | Auth Defense | Low | `konfigurator-logos.ts` | `getKonfiguratorLogoById` ohne eigenen Auth (Route schützt). | Defense-in-depth in Funktion. | **Fixed** (Phase 4a): `await requireRole(["ADMIN"])` als erste Zeile in `getKonfiguratorLogoById` ergänzt (analog zum bereits vorhandenen Check in der aufrufenden Route `app/api/konfigurator/logo/[id]/route.ts`) – Defense-in-Depth, keine Verhaltensänderung für den bestehenden Aufrufer. |
| C-19 | Actions/Auth | Medium | `lib/actions/bookings.ts` | Viele lesende Stats/Availability-Exporte ohne `ensureAuthed()`. | Lesefunktionen absichern. | **Fixed** (Phase 1a): siehe A-03. Hinweis: `getAvailabilityForGroupInternal`, `getAvailabilityForGroupBatchesByDateRange`, `getBaseTotalStats`, `getTotalStats`, `exportBookingsToCSV`, `getCalendarData`-Unterabfragen etc. waren nicht Teil des Phase-1a-Scopes und bleiben unverändert (potenziell weiterhin offen für spätere Phase). |

**C-Positiv:** Durchgängig Tagged-Template-SQL; keine Injection; keine dynamischen ORDER BY aus User-Input.

### C Severity-Zählung

Critical 0 · High 7 · Medium 9 · Low 3
(nach Phase 4b: C-05/C-06/C-07/C-11 Fixed, C-04 Partial, C-15 weiterhin RISK/Open —
Details siehe Phase-4b-Addendum oben in der Executive Summary)

## D – Frontend / TS

| ID | Bereich | Severity | Datei:Zeile | Beschreibung | Empfehlung | Status |
|----|---------|----------|-------------|--------------|------------|--------|
| D-01 | XSS | Medium | `inventory-report-modal.tsx` | `innerHTML` + `document.write` für Druck — aktuell escaped, aber fragil. | Auf iframe+`/druck`-Muster wie Packing-Print. | **Fixed** (Phase 4c): Umgestellt auf iframe+Route-Muster (neue Route `app/admin/inventory-report/druck/page.tsx` + `components/print/inventory-report-print-view.tsx`), kein `innerHTML`/`document.write` mehr. Details siehe Addendum Phase 4c. |
| D-02 | XSS | Low | `components/ui/chart.tsx` | `dangerouslySetInnerHTML` in unbenutzter Chart-Komponente. | Entfernen oder Werte nie aus User-Input. | **Fixed** (Status nachgezogen; Datei bereits in Phase 2b via D-23 gelöscht, siehe Addendum Phase 4c). |
| D-03 | Duplikat | Medium | quote-fulfillment vs quote-order-workflow | `buildOrderContext` divergiert (Lieferpaket-Label nur in einer Variante). | Gemeinsame Utility. | **Fixed** (Phase 2b): `buildOrderContext` (vollständigere Variante inkl. Lieferpaket-Label) nach `lib/konfigurator/order-context.ts` extrahiert; `quote-fulfillment-workflow.tsx` und `quote-order-workflow.tsx` importieren jetzt dieselbe Funktion statt divergierender lokaler Kopien. |
| D-04 | Duplikat | Low | print-* Meta-Header | Meta-Header 3× inline. | Gemeinsame PrintMetaHeader-Komponente. | Open |
| D-05 | Duplikat | Low | bag-labels / packing-checklist | Zwei `formatGroupLine`-Varianten. | Eine Utility. | Open |
| D-06 | Duplikat | Low | inventory-report vs packing-print | Zwei Druck-Strategien. | Vereinheitlichen (siehe D-01). | **Fixed** (Phase 4c): Gemeinsam mit D-01 behoben — Report-Vorschau und Druck nutzen jetzt dieselbe Komponente wie das Packing-Print-Muster. |
| D-07 | Duplikat | Low | inventory-report-modal | Lokale `formatDate` statt `lib/utils/date`. | Zentrale Utils. | **Fixed** (Phase 4c): `inventory-report-print-view.tsx` nutzt `formatDate` aus `lib/utils/date.ts`. |
| D-08 | Typisierung | Medium | `bookings-table.tsx` | Durchgängiges `any` in Filter/Sort. | Konkrete Row-Typen. | **Fixed** (Phase 4c): Neuer Typ `FlattenedBookingRow`; alle `any` in Filter/Sort/Render entfernt. Details siehe Addendum Phase 4c. |
| D-09 | Typisierung | Medium | `booking-form.tsx` | `value: any` / `as any` Casts. | Mapped Types / korrekte Rückgabetypen. | **Fixed** (Phase 4c): Generische Setter (`<K extends keyof …>`), Type-Predicate-Filter statt `any`, `data as any` → `BaseRow`. Details siehe Addendum Phase 4c. |
| D-10 | Typisierung | Medium | `rental-protocol.tsx` | `booking: any` trotz vorhandenem Typ. | `BookingWithRelations`. | **Fixed** (Phase 4c): `booking: BookingWithRelations`, alle inline `any` in Filter/Map entfernt. |
| D-11 | Typisierung | Low | `app/admin/page.tsx` | `base: any`. | Basen-Typ. | Open |
| D-12 | Datenexposition | Medium | Auftrag-/Workflow-Client-Komponenten | Voller `QuoteRequest` inkl. `public_token` an Client. | Schlanke DTOs / Pick. | **Fixed** (Phase 4c): `quote-order-workflow.tsx`/`quote-fulfillment-workflow.tsx`/`auftrag-detail-view.tsx` auf `Omit<QuoteRequest, "public_token">`; Token wird in der Seite vor Übergabe entfernt. Info-Tab behält den vollen `quote` (Token dort weiterhin benötigt). Details siehe Addendum Phase 4c. |
| D-13 | Datenexposition | Medium | booking-form / quote-return | Roh-DB-Arrays; teils ungenutzt. | Entfernen oder DTOs. | Open |
| D-14 | Datenexposition | Low | quote-warehouse-panel | Kunden inkl. email/telefon unnötig. | DTO `{id,name}`. | Open |
| D-15 | Formular | Medium | `editable-base-row.tsx` | Enter ruft Save ohne `saving`-Guard → Doppel-Submit. | Guard in `handleSave`. | **Fixed** (Phase 2b): `if (saving) return` als erste Zeile in `handleSave` ergänzt – schützt sowohl den Enter-Tastatur-Pfad (Seriennummer-Feld) als auch den Speichern-Button. |
| D-16 | Toter Code | Low | `components/admin/quote-return-section.tsx` | `@deprecated`, durch `QuoteWarehousePanel` ersetzt, keine Importe mehr. | Löschen. | **Fixed** (Phase 2b): Datei gelöscht (keine Referenzen außer Doku). |
| D-17 | Toter Code | Low | `quote-warehouse-panel.tsx` | `PackingCompletionSection` definiert, aber nie gerendert. | Entfernen. | **Fixed** (Phase 2b): `PackingCompletionSection` sowie die ausschließlich davon genutzten `isPackedOrLater`/`PACKED_OR_LATER_STATUSES` und den dadurch ungenutzten `ReactNode`-Import entfernt. |
| D-18 | Toter Code | Low | `calendar-view.tsx` | `utilizationBg` definiert, nie aufgerufen (`utilizationColor` wird stattdessen genutzt). | Entfernen. | **Fixed** (Phase 2b): Funktion entfernt. |
| D-19 | Toter Code | Low | `order-packing-step-panel.tsx` | Prop `quoteId` deklariert, im Funktionskörper nie gelesen. | Entfernen, Aufrufer anpassen. | **Fixed** (Phase 2b): `quoteId` aus Props-Typ und Funktionssignatur entfernt. Hinweis: Die Komponente `OrderPackingStepPanel` hat aktuell im Code keinen aktiven Aufrufer (nur Doku-Erwähnung in `docs/auftrag-detail-ux-redesign.md`) – daher kein JSX-Call-Site anzupassen. |
| D-20 | Ungenutzte Prop | Medium | `operations-header-actions.tsx` | Prop `mode` gesetzt, im Funktionskörper nie gelesen; beide Aufrufer übergeben unterschiedliche Werte ohne Wirkung. | Entfernen oder Unterscheidung implementieren. | **Fixed** (Phase 2b): Kein `@deprecated`/Kommentar und keine erkennbare UX-Anforderung im Code gefunden → Prop **entfernt** (statt Unterscheidung zu erfinden). `mode="operations"`/`mode="ledger"` in `app/warenverwaltung/page.tsx` und `app/warenverwaltung/buchungen/page.tsx` ebenfalls entfernt. |
| D-21 | Toter Code | Low | `configurator-wizard.tsx` | Ungenutzter Import `isProductKonfiguratorAvailable`; State `resolvedKanalanzahl`/`setResolvedKanalanzahl` nur geschrieben (via `applyKanalanzahlFromResponse`), nie gelesen. | Entfernen. | **Fixed** (Phase 2b): Ungenutzten Import entfernt; `resolvedKanalanzahl`-State sowie die ausschließlich dafür existierende `applyKanalanzahlFromResponse`-Funktion und ihre 4 Aufrufe in `fetchPrice`/`fetchAvailability`/`fetchStationAvailability`/`fetchGroupAvailability` entfernt (kein Effekt auf `config.kanalanzahl` oder UI). |
| D-22 | Ungenutzte Prop | Low | `booking-form.tsx` | Props `inventoryLots`/`openRentals` deklariert, im Formular nie gelesen. | Entfernen, Aufrufer anpassen. | **Fixed** (Phase 2b): Beide Props aus `BookingFormProps` und Funktionssignatur entfernt; direkter Aufrufer `booking-modal.tsx` übergibt sie nicht mehr an `<BookingForm>`. Bewusst **nicht** angefasst: `BookingModal` selbst sowie alle darüberliegenden Aufrufer (`BookingModalProvider`, `ReturnSection` in `quote-warehouse-panel.tsx`, Server-seitiges Fetching in den Warenverwaltung-Pages) behalten `inventoryLots`/`openRentals` unverändert bei – Entfernen der gesamten Prop-Kette wäre ein größerer, hier nicht beabsichtigter Umbau (kein `noUnusedParameters` in `tsconfig.json`, daher kein Compile-Risiko). |
| D-23 | Toter Code | Low | `components/ui/chart.tsx` | `dangerouslySetInnerHTML`, bereits von `tsconfig.json` ausgeschlossen, keine Importe, `recharts` nicht in `package.json`. | Löschen. | **Fixed** (Phase 2b): Datei gelöscht, zugehöriger `exclude`-Eintrag in `tsconfig.json` entfernt (Datei existiert nicht mehr). |
| D-24/D-25 | Konsistenz | Low | diverse | Inline `toLocaleDateString` statt `formatDate`/`formatDateTime`. | Zentrale Utils. | Open |

**D-Positiv:** Keine Critical/High im Frontend; Preisformatierung bereits zentral; die meisten Formulare haben Loading-Guards.

### D Severity-Zählung

Critical 0 · High 0 · Medium ~10 · Low ~15
(nach Phase 4c: D-01/D-02/D-06/D-07/D-08/D-09/D-10/D-12 Fixed — Details siehe
Addendum Phase 4c oben)

---

## Gesamtüberblick Phase 0

| Severity | A | B | C | D | E | Summe (ca.) |
|----------|---|---|---|---|---|-------------|
| Critical | 1 | 0 | 0 | 0 | 0 | **1** |
| High | 3 | 1 | 7 | 0 | 1 | **12** |
| Medium | 5 | 2 | 9 | ~10 | 3 | **~29** |
| Low/Info | 4 | 7 | 3 | ~15 | 10 | **~39** |

### Querschnitt (Priorität für Phase 1)

1. **Auth-Lücken an Server Actions** (A-01/Critical, A-02/A-03, C-01–C-03, C-19) — größtes reales Risiko; Client-erreichbare Actions ohne Session.
2. **Input-Validierung Konfigurator** (B-01) — Schema vorhanden, ungenutzt.
3. **Rate-Limit-Umgehung** (A-07, E-04) + fehlende Limits (B-02, E-03).
4. **HMAC statt Hash** für Lead/Angebot (A-05 = B-03).
5. **CSP unsafe-inline** (E-01) — Defense-in-Depth.
6. **RISK – Rücksprache (Stand Phase 0):** Transaktionen/Locking Zahlungs- & Lagerfluss (C-04–C-06), Bestandslogik-Wahrheitsquelle (C-15) — nicht automatisch fixen. *(Update Phase 4b: C-05/C-06 sind jetzt Fixed, C-04 ist Partial — nur C-15 bleibt RISK, siehe Addendum Phase 4b.)*

### Positiv über alle Bereiche

Tagged-Template-SQL ohne Injection; Stripe/Telegram fail-closed + timing-safe; Admin-Cookie-HMAC konsistent Edge↔Node; keine Secrets in Git-History/`NEXT_PUBLIC_*`; Frontend ohne ausnutzbares XSS.

---

## Phase 3 – Verifikation (Subagent F)

Stand: 16. Juli 2026, nach Phase 1 + 2 (Fixes bereits im Working Tree, noch
nicht committet).

### Build/Lint/Tests-Matrix

| Prüfung | Befehl | Ergebnis |
|---------|--------|----------|
| Install | `pnpm install` | ✅ Grün (Lockfile up-to-date, kein Resolve nötig) |
| Build | `pnpm build` | ✅ Grün (`next build`, 22 Routen, Type-Check inklusive) |
| Lint | `pnpm lint` | ❌ **Nicht ausführbar** – `eslint: command not found` (ESLint fehlt als Dependency, vorbestehend) |
| Lint-Ersatz | `npx tsc --noEmit` | ✅ Grün (keine Type-Fehler) |
| Preis-Engine | `pnpm test:preis-engine` | ✅ Grün (7/7 Fälle) |
| Fulfillment-Timing | `npx tsx scripts/test-fulfillment-timing.ts` | ✅ Grün (11/11 Fälle) |
| Lieferzeit | `npx tsx scripts/test-lieferzeit.ts` | ✅ Grün (23/23 Fälle) |
| E-Mail-Links | `npx tsx scripts/test-email-links.ts` | ✅ Grün (11/11 Fälle) |

Keine Trivial-Fixes in Phase 3 nötig, da Build/Tests bereits ohne
Eingriff grün liefen.

### Smoke-Test (lokal, `pnpm start` auf Port 3000)

| Route | Erwartung | Ergebnis |
|-------|-----------|----------|
| `/` | 200 | ✅ 200 |
| `/login` | 200 | ✅ 200 |
| `/konfigurator` | 200 | ✅ 200 |
| `/impressum` | 200 | ✅ 200 |
| `/datenschutz` | 200 | ✅ 200 |
| `/agb` | 200 | ✅ 200 |
| `/warenverwaltung` (ohne Session) | 307/302 → `/login` | ✅ 307 → `/login` |

Server wurde nach dem Test wieder gestoppt (`pkill -f next-server`).

### Secrets-Diff-Check

- `git diff --stat`: 47 geänderte Dateien (Details siehe Kommando-Output im
  Subagent-F-Bericht an den Parent), plus 9 neue/verschobene Dateien
  (`lib/actions/bookings-internal.ts`, `lib/actions/quote-booking-internal.ts`,
  `lib/konfigurator/order-context.ts`, `lib/safe-error.ts`,
  `lib/utils/sanitize-filename.ts`, `docs/audit-findings.md`,
  `docs/AUDIT-REFACTOR-MASTER-PROMPT.md`, `docs/mitarbeiter-anleitung.{html,pdf}`).
- Muster-Scan auf `sk_live_`, `whsec_`, `sk_test_`, `AIza`, `xoxb-`,
  `-----BEGIN ... PRIVATE KEY-----` im gesamten Diff sowie in allen
  neuen/untracked Dateien: **keine Treffer.**
- `package.json`-Diff entfernt lediglich ungenutzte `@supabase/ssr` /
  `@supabase/supabase-js`-Dependencies (kein Secret-Bezug); `.gitignore`
  ergänzt nur `.superpowers/`.

### Fazit Phase 3

Alle Pflicht-Prüfungen (Build, Type-Check, 4 Test-Skripte, Smoke-Test) sind
grün. Einzige Abweichung vom Master-Prompt-Auftrag ist `pnpm lint`, das
wegen fehlender ESLint-Dependency nicht ausführbar ist (vorbestehend, siehe
Executive Summary oben) – als Ersatz diente `tsc --noEmit`, ebenfalls grün.
Es waren keine Trivial-Fixes zur Verifikation nötig. Vier High-Findings
(C-04/05/06/15) bleiben bewusst als „Risk – Rücksprache nötig" offen, alle
anderen Critical/High-Findings sind Fixed. Es wurden keine Commits erstellt.

*(Update Phase 4b: C-05/C-06 sind jetzt Fixed, C-04 ist Partial mit
dokumentiertem Restrisiko — nur C-15 bleibt „Risk – Rücksprache nötig" offen.
Siehe Addendum Phase 4b für Details.)*
