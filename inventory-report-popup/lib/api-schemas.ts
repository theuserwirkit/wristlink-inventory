import { z } from "zod"

/**
 * Locker gehaltene Validierungsschemas für externe/interne API-Grenzen.
 * Ziel: offensichtlich fehlerhafte/böswillige Payloads früh abfangen,
 * ohne die bestehende (flexible) Fachlogik in den Actions einzuschränken.
 */

export const quoteConfigSchema = z
  .object({
    kontaktName: z.string().max(200).optional(),
    kontaktFirma: z.string().max(200).optional(),
    kontaktTelefon: z.string().max(50).optional(),
    szenario: z.string().max(200).optional(),
    variante: z.string().max(100).optional(),
    produkt: z.string().min(1).max(100),
    modus: z.string().min(1).max(50),
    menge: z.coerce.number().finite().nonnegative(),
    von: z.string().max(30).optional(),
    bis: z.string().max(30).optional(),
    druck: z.boolean(),
    probedruckOption: z.enum(["none", "fotos", "versand"]).optional(),
    probedruck: z.boolean().optional(),
    logoId: z.string().max(200).optional(),
    lieferpaket: z.enum(["regulaer", "express", "eil"]).optional(),
    flexRueckgabe: z.boolean().optional(),
    lieferart: z.enum(["standard", "flex", "overnight"]).optional(),
    flex: z.boolean().optional(),
    gruppen: z.coerce.number().finite().nonnegative(),
    gruppenGroessen: z.array(z.coerce.number()).optional(),
    baenderProGruppe: z.coerce.number().optional(),
    kanalanzahl: z.coerce.number().optional(),
    station: z.string().max(50),
    stationModus: z.string().max(50),
    lieferzeit: z.string().max(50),
    land: z.string().max(50),
    techniker: z.boolean().optional(),
    technikerTage: z.coerce.number().optional(),
    technikerAdresse: z.string().max(500).optional(),
    technikerKm: z.coerce.number().optional(),
  })
  .passthrough()

export const priceSnapshotSchema = z
  .object({
    gesamt_netto: z.coerce.number().optional(),
    gesamt_brutto: z.coerce.number().optional(),
  })
  .catchall(z.unknown())

export const availabilityRequestSchema = z
  .object({
    produkt: z.string().min(1, "produkt ist erforderlich"),
    modus: z.string().min(1, "modus ist erforderlich"),
    menge: z.coerce.number().finite().nonnegative().default(0),
    von: z.string().max(30).optional(),
    bis: z.string().max(30).optional(),
    lieferzeit: z.string().max(50).optional(),
    missing_fields: z.array(z.string()).optional(),
  })
  .passthrough()

export const bookingRequestSchema = z.object({
  produkt: z.string().min(1, "produkt ist erforderlich"),
  modus: z.string().min(1, "modus ist erforderlich"),
  menge: z.coerce.number().finite().positive("menge muss größer als 0 sein"),
  von: z.string().min(1, "von ist erforderlich"),
  bis: z.string().max(30).optional(),
  kunde_name: z.string().max(200).optional(),
  kunde_email: z.string().email().optional(),
  event: z.string().max(500).optional(),
  status: z.enum(["ANFRAGE", "BESTAETIGT"]).optional(),
})

export const externalQuoteInputSchema = z.object({
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  config: quoteConfigSchema,
  price_snapshot: priceSnapshotSchema.optional(),
  external_ref: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  skip_notifications: z.boolean().optional(),
})

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ")
}
