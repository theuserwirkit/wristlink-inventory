# Security – Secret Rotation Checkliste

Diese Checkliste beschreibt, welche Secrets **manuell** rotiert werden müssen
(z. B. nach einem Leak, bei Personalwechsel oder turnusmäßig).

> ⚠️ **Niemals echte Werte in dieses Repo committen.** Secrets ausschließlich in
> `.env.local` (lokal) bzw. im Vercel-Projekt (Production) pflegen.
> Die entsprechenden `.env*`-Dateien sind über `.gitignore` ausgeschlossen.

## Vorgehen (allgemein)

1. Neues Secret beim jeweiligen Anbieter generieren.
2. Wert in Vercel (Production/Preview) **und** lokal in `.env.local` aktualisieren.
3. App neu deployen bzw. lokalen Dev-Server neu starten.
4. Funktion testen (siehe „Verifikation" je Secret).
5. Altes Secret beim Anbieter widerrufen/löschen.

## Zu rotierende Secrets

### 1. Neon Datenbank (`DATABASE_URL` / Neon Connection String)
- **Wo rotieren:** Neon Console → Project → Roles/Passwords → Reset password
  (bzw. neuen Connection String erzeugen).
- **Wo eintragen:** `DATABASE_URL` (und ggf. `POSTGRES_*`-Varianten) in Vercel + `.env.local`.
- **Verifikation:** App startet, DB-Abfragen (Leads/Quotes) funktionieren.

### 2. Anthropic API Key (`ANTHROPIC_API_KEY`)
- **Wo rotieren:** Anthropic Console → API Keys → neuen Key erstellen.
- **Wo eintragen:** `ANTHROPIC_API_KEY` in Vercel + `.env.local`.
- **Verifikation:** KI-Angebotsgenerierung liefert Ergebnis.
- **Danach:** alten Key deaktivieren.

### 3. n8n (Webhook-/API-Zugang)
- **Wo rotieren:** n8n → Credentials / Webhook-URL bzw. zugehöriges Secret/Token neu erzeugen.
- **Wo eintragen:** entsprechende n8n-bezogene Env-Vars (z. B. Webhook-URL/-Secret)
  in Vercel + `.env.local`.
- **Verifikation:** n8n-Flow löst korrekt aus, eingehende Requests werden akzeptiert.

### 4. Telegram Bot (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`)
- **Bot-Token rotieren:** Telegram @BotFather → `/revoke` → neuer Token.
- **Webhook-Secret rotieren:** neuen Zufallswert für `TELEGRAM_WEBHOOK_SECRET` erzeugen
  und beim `setWebhook`-Aufruf als `secret_token` setzen.
- **Wo eintragen:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` in Vercel + `.env.local`.
- **Verifikation:** Freigabe-/Ablehnen-Buttons im Telegram-Chat funktionieren;
  Webhook ohne gültiges Secret liefert 401 (fail-closed).

### 5. Wristlink API Key (`WRISTLINK_API_KEY`)
- **Wo rotieren:** im Wristlink-System / beim Anbieter neuen API-Key ausstellen.
- **Wo eintragen:** `WRISTLINK_API_KEY` in Vercel + `.env.local`.
- **Verifikation:** Verfügbarkeits-/Inventar-Abfragen funktionieren.

### 6. Wristlink Passwort (`WRISTLINK_PASSWORD`)
- **Wo rotieren:** Neues Passwort wählen (kein Account-System – ein gemeinsames Admin-Passwort).
- **Wo eintragen:** `WRISTLINK_PASSWORD` in Vercel + `.env.local` (Zeile **ohne** Anführungszeichen, auch bei Sonderzeichen wie `!`).
- **Nicht eintragen:** `next.config.mjs` → `env` (würde Secret beim Build ins Bundle schreiben).
- **Optional getrennt:** `WRISTLINK_SESSION_SECRET` für Cookie-HMAC (`lib/auth-core.ts`); Fallback: `WRISTLINK_PASSWORD`.
- **Lokal:** `npm run dev` aus `inventory-report-popup/` – entfernt ggf. leeren Shell-Wert via `env -u WRISTLINK_PASSWORD`.
- **Hinweis:** Wird ggf. auch als Fallback für die Lead-Session-Verschlüsselung genutzt
  (siehe `LEAD_SESSION_SECRET`). Nach Rotation bestehende Lead-Sessions ggf. ungültig.
- **Verifikation:** Login unter `/login` → Redirect auf `/warenverwaltung`.

## Ergänzende Secrets (bei Bedarf mitrotieren)

- `LEAD_SESSION_SECRET` – Signierung/Verschlüsselung der Lead-Session.
- `RESEND_API_KEY` – Versand von Double-Opt-In-/Transaktionsmails.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` – Zahlungsabwicklung.
- `KONFIGURATOR_TESTMODE_SECRET` – nur relevant, wenn Testmode in Production
  aktiviert ist (`KONFIGURATOR_TESTMODE_ENABLED=true`).

## Nach jeder Rotation

- [ ] Alter Wert beim Anbieter widerrufen/gelöscht
- [ ] Neuer Wert in Vercel (Production + Preview) gesetzt
- [ ] Neuer Wert lokal in `.env.local` gesetzt
- [ ] Deploy/Neustart durchgeführt
- [ ] Betroffene Funktion getestet
