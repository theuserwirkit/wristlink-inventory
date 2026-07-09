import { timingSafeEqual } from "crypto"

/** Deutsche PLZ (5 Ziffern) aus Freitext-Adresse extrahieren */
export function extractPlzFromAddress(address: string | undefined | null): string | null {
  if (!address?.trim()) return null
  const match = address.match(/\b(\d{5})\b/)
  return match?.[1] ?? null
}

export function normalizePlz(plz: string): string {
  return plz.replace(/\D/g, "").slice(0, 5)
}

export function verifyPlzInput(input: string, expected: string): boolean {
  const a = normalizePlz(input)
  const b = normalizePlz(expected)
  if (a.length !== 5 || b.length !== 5) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}
