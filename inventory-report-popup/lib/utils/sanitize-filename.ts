/** Erlaubt nur alphanumerische Zeichen, Punkt und Bindestrich – verhindert Header-/Pfad-Injection. */
export function sanitizeFilename(filename: string, fallback = "download"): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9.\-]/g, "_")
  return sanitized || fallback
}
