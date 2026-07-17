import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const SCRYPT_KEYLEN = 64

// A-11: scrypt-Kostenfaktoren. Node-Defaults sind N=16384 (2^14), r=8, p=1 – das
// entspricht laut OWASP Password Storage Cheat Sheet bereits der MINDEST-Konfiguration
// für interaktive Logins (16 MiB Speicherbedarf: 128*N*r Bytes). Das alte Hash-Format
// (`scrypt:<salt>:<hash>`, ohne Parameter im String) legt implizit diesen Node-Default
// fest – ihn nachträglich global zu erhöhen würde ALLE bestehenden Passwort-Hashes
// ungültig machen (die Verifikation leitet N/r/p sonst nicht mehr korrekt ab).
//
// Neue Hashes verwenden daher ein zweites Format `scrypt2:N:r:p:<salt>:<hash>`, das die
// Parameter explizit im Hash-String trägt. Damit kann der Kostenfaktor zukünftig weiter
// angehoben werden (z. B. N=2^15/2^16 für stärkere OWASP-Stufen), ohne bestehende
// Nutzer-Hashes zu invalidieren – `verifyPasswordHash` unterstützt beide Formate parallel
// (Dual-Verify). Aktuell bleibt N bewusst auf dem bisherigen, bereits OWASP-konformen
// Default (16384), um das Diff risikoarm zu halten; ein zukünftiges Anheben ist rein
// additiv (neues N im `scrypt2`-Präfix), ohne Migration nötig.
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
// Muss > 128 * N * r sein (Node-Anforderung); Default-maxmem (32 MiB) reicht für die
// aktuellen Parameter, wird hier aber explizit gesetzt, damit ein künftiges Anheben von
// N/r nicht überraschend an einem impliziten Default scheitert.
const SCRYPT_MAXMEM = 64 * 1024 * 1024

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  })
  return `scrypt2:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString("hex")}:${hash.toString("hex")}`
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split(":")

  // Neues Format mit expliziten Parametern im Hash-String.
  if (parts.length === 6 && parts[0] === "scrypt2") {
    const N = parseInt(parts[1], 10)
    const r = parseInt(parts[2], 10)
    const p = parseInt(parts[3], 10)
    const salt = Buffer.from(parts[4], "hex")
    const expected = Buffer.from(parts[5], "hex")
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false
    if (salt.length === 0 || expected.length === 0) return false

    const actual = scryptSync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: Math.max(SCRYPT_MAXMEM, 128 * N * r + 1),
    })
    if (actual.length !== expected.length) return false
    return timingSafeEqual(actual, expected)
  }

  // Legacy-Format (vor A-11): implizit Node-Default N=16384/r=8/p=1, kein Parameter
  // im String. Muss weiterhin akzeptiert werden, damit bestehende Passwort-Hashes
  // gültig bleiben; neue Logins erzeugen beim nächsten `hashPassword`-Aufruf (Passwort
  // ändern) automatisch das neue `scrypt2`-Format.
  if (parts.length === 3 && parts[0] === "scrypt") {
    const salt = Buffer.from(parts[1], "hex")
    const expected = Buffer.from(parts[2], "hex")
    if (salt.length === 0 || expected.length === 0) return false

    const actual = scryptSync(password, salt, expected.length)
    if (actual.length !== expected.length) return false
    return timingSafeEqual(actual, expected)
  }

  return false
}
