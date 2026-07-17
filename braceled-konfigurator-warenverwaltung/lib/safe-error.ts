import "server-only"

/**
 * Bekannte, bewusst geworfene Fehler, die keine internen Details (SQL, Stacktraces,
 * o. Ä.) enthalten und daher unverändert an den Client durchgereicht werden dürfen.
 */
const KNOWN_SAFE_MESSAGES = ["Nicht authentifiziert", "Keine Berechtigung"]

/**
 * Loggt den ursprünglichen Fehler serverseitig und gibt eine generische, für den
 * Client sichere Fehlermeldung zurück. Bekannte Fehler (siehe KNOWN_SAFE_MESSAGES)
 * werden unverändert durchgereicht.
 */
export function toSafeErrorMessage(error: unknown, action: string): string {
  if (error instanceof Error && KNOWN_SAFE_MESSAGES.includes(error.message)) {
    return error.message
  }
  console.error(`[safe-error:${action}] failed:`, error)
  return "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es später erneut."
}
