import {
  firstAllowedLieferart,
  firstAllowedLieferzeit,
  hasAllowedLieferzeit,
  isLieferartOptionAllowed,
  isLieferzeitOptionAllowed,
  isTechnikerAllowed,
  LIEFERZEIT_MIN_TAGE,
  TECHNIKER_MIN_TAGE,
  werktageToCalendarDays,
} from "../lib/konfigurator/lieferzeit"

let failed = 0

function assert(name: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${name}`)
    failed++
  } else {
    console.log(`OK: ${name}`)
  }
}

assert("20 Werktage → 28 Kalendertage", werktageToCalendarDays(20) === 28)
assert("10 Werktage → 14 Kalendertage", werktageToCalendarDays(10) === 14)
assert("2 Werktage → 3 Kalendertage", werktageToCalendarDays(2) === 3)

assert("Standard braucht 28 Tage", LIEFERZEIT_MIN_TAGE.standard === 28)
assert("Express braucht 14 Tage", LIEFERZEIT_MIN_TAGE.express === 14)

assert("1 Tag: Standard nicht erlaubt", !isLieferzeitOptionAllowed("standard", 1))
assert("1 Tag: Express nicht erlaubt", !isLieferzeitOptionAllowed("express", 1))
assert("1 Tag: Hyperexpress nicht erlaubt", !isLieferzeitOptionAllowed("hyperexpress", 1))
assert("1 Tag: keine Lieferzeit möglich", !hasAllowedLieferzeit(1))

assert(
  "2 Tage: nur Hyperexpress erlaubt",
  isLieferzeitOptionAllowed("hyperexpress", 2) && !isLieferzeitOptionAllowed("express", 2),
)
assert(
  "14 Tage: Express erlaubt, Standard nicht",
  isLieferzeitOptionAllowed("express", 14) && !isLieferzeitOptionAllowed("standard", 14),
)

assert(
  "Bedruckung blockiert Hyperexpress nicht",
  isLieferzeitOptionAllowed("hyperexpress", 10, { hasDruck: true }),
)
assert(
  "Bedruckung: Express ab 14 Tagen",
  isLieferzeitOptionAllowed("express", 14, { hasDruck: true }),
)

assert(
  "1 Tag: keine Lieferart möglich",
  !isLieferartOptionAllowed("standard", 1) &&
    !isLieferartOptionAllowed("flex", 1) &&
    !isLieferartOptionAllowed("overnight", 1),
)
assert("3 Tage: Standard-Lieferart möglich", isLieferartOptionAllowed("standard", 3))
assert("7 Tage: Flex-Lieferart möglich", isLieferartOptionAllowed("flex", 7))
assert("2 Tage: Overnight möglich", isLieferartOptionAllowed("overnight", 2))
assert("1 Tag: Overnight nicht möglich", !isLieferartOptionAllowed("overnight", 1))

assert("28 Tage: firstAllowed = standard", firstAllowedLieferzeit(28) === "standard")
assert("1 Tag: firstAllowed = null", firstAllowedLieferzeit(1) === null)
assert("2 Tage: firstAllowedLieferart = overnight", firstAllowedLieferart(2) === "overnight")

assert("Techniker ab 7 Tagen", isTechnikerAllowed(7))
assert("Techniker nicht unter 7 Tagen", !isTechnikerAllowed(6))
assert("Techniker-Minimum = 7", TECHNIKER_MIN_TAGE === 7)

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen`)
  process.exit(1)
}

console.log("\nAlle Lieferzeit-Tests bestanden.")
