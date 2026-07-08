import {
  EMAIL_DATENSCHUTZ,
  EMAIL_KONFIGURATOR,
} from "@/lib/contact-emails"

export const CONSENT_TEXT_VERSION = "1.4"

/** CRM / Konfigurator-Nutzung (immer bei DOI) */
export const CRM_CONSENT_TEXT = `WIRKUNG digital GmbH verarbeitet Ihre E-Mail und Konfiguratordaten zur Bearbeitung Ihrer Anfrage (Art. 6 Abs. 1 lit. b/f DSGVO). Transaktions-E-Mails versenden wir von ${EMAIL_KONFIGURATOR}. Speicherung bis zum Abschluss der Anfrage bzw. gesetzlicher Fristen. Widerruf: ${EMAIL_DATENSCHUTZ}`

/** Marketing-Einwilligung (optional, getrennt – wirksam erst nach E-Mail-Bestätigung) */
export const MARKETING_CONSENT_TEXT = `Ich möchte Informationen zu LED-Eventprodukten per E-Mail erhalten (freiwillig, wirksam erst nach Bestätigung Ihrer E-Mail-Adresse, jederzeit widerrufbar an ${EMAIL_DATENSCHUTZ}).`

/** B2B-Bestätigung (Pflicht) */
export const B2B_CONFIRMATION_TEXT = `Ich bestätige, dass ich als Unternehmer im Sinne des § 14 BGB (B2B) handle und der Konfigurator ausschließlich für gewerbliche Anfragen genutzt wird. Die angezeigten Preise verstehen sich als Nettopreise zzgl. der gesetzlichen Mehrwertsteuer.`

export const PRICING_NOTICE_B2B =
  "Alle Preise in EUR, netto (B2B). zzgl. 19 % MwSt. bei Zahlung in Deutschland."

/** Hinweis bei Event-Szenario Hochzeit */
export const HOCHZEIT_B2B_NOTICE =
  "Wir liefern ausschließlich an Gewerbekunden (B2B). Für Privatpersonen gelten die Kosten zzgl. MwSt."
