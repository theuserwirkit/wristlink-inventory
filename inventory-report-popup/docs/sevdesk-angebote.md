# sevDesk – Angebote & PDF-Ablauf

Stand: Juli 2026

Dokumentation, **wann** ein sevDesk-Angebot erstellt wird und **was** danach mit dem PDF passiert.

---

## Kurzfassung

| Frage | Antwort |
|-------|---------|
| Wann wird das Angebot erstellt? | **Manuell** durch Admin (Button oder PDF-Upload) – **nicht** automatisch bei Anfrage oder Freigabe |
| Wo liegt das PDF? | Kopie in der DB (`offer_pdf_*`) + Original in sevDesk |
| Wann geht das PDF an den Kunden? | Als **E-Mail-Anhang** bei **Freigabe** und bei **Zahlungsbestätigung** (falls vorhanden) |
| Wird es aus sevDesk versendet? | **Nein** – Versand läuft über Wristlink (Resend) |
| Rechnung aus Angebot? | **Noch nicht** implementiert |

---

## Zeitstrahl

```
Anfrage (submitted)
    │
    ▼
[Admin: Angebot anlegen]  ← manuell, vor Freigabe empfohlen
    │   • „In sevDesk erstellen“  ODER  • PDF hochladen
    ▼
PDF in DB (+ sevdesk_order_number bei sevDesk-Weg)
    │
    ▼
Freigabe (Admin)
    │   mit Stripe  → payment_pending + Mail (PDF-Anhang)
    │   ohne Stripe → approved         + Mail (PDF-Anhang)
    ▼
Zahlung
    │   Stripe-Webhook  → paid + Mail (PDF-Anhang)
    │   Manuell Admin   → paid + Mail (PDF-Anhang, optional)
    ▼
Fulfillment (angenommen → … → zurueckgepackt)
```

Ohne PDF in Schritt 2: Mails gehen **ohne Anhang** raus (Freigabe und Zahlung funktionieren trotzdem).

---

## 1. Anfrage kommt rein (automatisch)

- Quelle: Konfigurator (`source: konfigurator`) oder n8n (`source: n8n_email`)
- Status: `submitted`
- Preis-Snapshot wird gespeichert (`price_snapshot_json` mit `positionen`, `gesamt_netto`, …)
- **Noch kein** sevDesk-Angebot, **noch kein** PDF

---

## 2. Angebot anlegen (manuell)

Ort: `/admin/anfragen/[id]` → Bereich **Auftragsabwicklung** → **Angebots-PDF**

Sichtbar in Status `submitted`, `approved` und `payment_pending`.

### Option A: „In sevDesk erstellen“

Voraussetzungen:

- `SEVDESK_API_TOKEN` gesetzt (lokal + Vercel)
- Noch **kein** PDF und **kein** `sevdesk_order_id` für diese Anfrage

Ablauf (Server Action `createQuoteSevdeskOffer`):

1. Kontakt in sevDesk per Lead-E-Mail suchen; falls nicht vorhanden: anlegen (Kategorie „Kunde“, E-Mail, optional Telefon)
2. Nächste Angebotsnummer holen (`Order/Factory/getNextOrderNumber`, z. B. `AN-2026-575`)
3. Angebot anlegen (`Order/Factory/saveOrder`, `orderType: AN`) mit allen Preispositionen aus `price_snapshot_json`
4. PDF von sevDesk laden (`Order/{id}/getPdf`)
5. In DB speichern:
   - `sevdesk_order_id`, `sevdesk_order_number`
   - `offer_pdf_filename`, `offer_pdf_data`, `offer_pdf_mime_type`

### Option B: „PDF hochladen“

- PDF direkt in die DB (max. 10 MB)
- **Ohne** sevDesk-Referenz
- Alternative, wenn Angebot manuell in sevDesk erstellt und exportiert wurde

### Button-Logik

| Zustand | UI |
|---------|-----|
| Kein PDF, sevDesk konfiguriert | Button „In sevDesk erstellen“ + „PDF hochladen“ |
| PDF vorhanden | Download-Link + Löschen |
| `sevdesk_order_number` gesetzt | Anzeige der Nummer (z. B. `AN-2026-575`) |

---

## 3. Freigabe (Admin)

| Aktion | Status danach | Kunden-Mail | PDF-Anhang |
|--------|---------------|-------------|------------|
| Freigeben **mit Stripe** | `payment_pending` | `quote_approved_stripe` (+ Stripe-Link) | Ja, wenn PDF in DB |
| Freigeben **ohne Stripe** | `approved` | `quote_approved_manual` | Ja, wenn PDF in DB |
| Ablehnen | `rejected` | `quote_rejected` | Nein |

Implementierung: `approveQuoteRequest` in `lib/quotes-internal.ts` → `getQuoteOfferPdfForEmail` → `sendCustomerApprovedEmail`.

---

## 4. Zahlung

| Weg | Auslöser | Status | Kunden-Mail | PDF-Anhang |
|-----|----------|--------|-------------|------------|
| **Stripe** | Webhook | `paid` | `quote_paid` | Ja, wenn PDF in DB |
| **Manuell** | Admin „Geldeingang bestätigen“ | `paid` | `quote_paid` (abschaltbar) | Ja, wenn PDF in DB |

Nach `paid`:

- `fulfillment_status = angenommen`
- Miet-Buchung wird bestätigt (falls zutreffend)
- Fulfillment-Stepper wird sichtbar

Implementierung: `processPaidQuote` → `getQuoteOfferPdfForEmail` → `sendCustomerPaidEmail`.

---

## 5. Was passiert **nicht** automatisch

- Angebot bei Anfrage-Eingang erstellen
- Angebot bei Freigabe erstellen (falls Admin es vergessen hat)
- PDF aus sevDesk per E-Mail an Kunden senden
- Angebot in Rechnung umwandeln
- Angebot bei Fulfillment-Schritten erneut versenden

---

## 6. Sonderfall n8n-Anfragen

Bei `source: n8n_email`:

- Freigabe versendet den **Text aus `notes`** (`sendN8nApprovedOfferEmail`)
- **Nicht** das sevDesk-PDF aus der DB
- sevDesk-Integration ist primär für **Konfigurator-Anfragen** gedacht

---

## 7. Empfohlener Admin-Ablauf

1. Anfrage prüfen (`submitted`)
2. **„In sevDesk erstellen“** (oder PDF hochladen)
3. PDF kurz prüfen (Link in der Admin-UI)
4. **Freigeben** → Kunde erhält Mail inkl. Angebot
5. **Geldeingang** bestätigen (oder Stripe) → Bestätigungs-Mail
6. Fulfillment-Schritte durchklicken

---

## 8. Konfiguration (Umgebungsvariablen)

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `SEVDESK_API_TOKEN` | Ja | API-Token (sevDesk → Benutzer → API-Token) |
| `SEVDESK_CONTACT_PERSON_ID` | Nein | sevDesk-Benutzer als Ansprechpartner im Angebot |
| `SEVDESK_DEFAULT_PART_ID` | Nein | sevDesk-Artikel für Positionen (z. B. WIRKUNG.wristlink) |
| `SEVDESK_BASE_URL` | Nein | Default: `https://my.sevdesk.de/api/v1` |

Vorlage: `env.konfigurator.example` · Rotation: `docs/SECURITY-ROTATION.md`

---

## 9. Relevante Dateien

| Datei | Zweck |
|-------|--------|
| `lib/konfigurator/sevdesk.ts` | API-Client (Auth, Fetch) |
| `lib/konfigurator/sevdesk-offer.ts` | Kontakt, Angebot, PDF |
| `lib/actions/sevdesk-offer.ts` | Server Action für Admin-Button |
| `lib/actions/quote-offer-pdf.ts` | PDF Upload/Download/DB |
| `components/admin/quote-offer-pdf-upload.tsx` | UI (sevDesk + Upload) |
| `scripts/migration/10-offer-pdf.sql` | Spalten `offer_pdf_*` |
| `scripts/migration/12-sevdesk-offer.sql` | Spalten `sevdesk_order_*` |

---

## 10. Geplant / offen

- [ ] Angebot **automatisch bei Freigabe** erstellen, falls noch keins existiert
- [ ] Rechnung aus sevDesk-Angebot (nach Zahlung)
- [ ] n8n-Anfragen: optional ebenfalls sevDesk-PDF statt nur `notes`-Text
