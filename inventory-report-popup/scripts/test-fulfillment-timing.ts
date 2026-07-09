import {
  compareFulfillmentUrgency,
  getFulfillmentDueDate,
  getFulfillmentTiming,
} from "../lib/konfigurator/fulfillment-timing"
import type { QuoteRequest } from "../lib/konfigurator/types"

let failed = 0

function assert(name: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${name}`)
    failed++
  } else {
    console.log(`OK: ${name}`)
  }
}

const now = new Date("2026-07-09T10:00:00")

function makeQuote(partial: Partial<QuoteRequest>): QuoteRequest {
  return {
    id: 1,
    lead_id: 1,
    public_token: "t",
    config_json: {
      produkt: "armband",
      modus: "miete",
      menge: 100,
      druck: false,
      gruppen: 0,
      station: "keine",
      stationModus: "miete",
      lieferzeit: "standard",
      land: "DE",
      von: "2026-08-01",
      bis: "2026-08-03",
    },
    price_snapshot_json: {},
    status: "paid",
    source: "konfigurator",
    booking_id: 1,
    stripe_checkout_session_id: null,
    stripe_payment_link_url: null,
    rejection_reason: null,
    external_ref: null,
    notes: null,
    submitted_at: "2026-06-01",
    approved_at: "2026-06-02",
    paid_at: "2026-06-10",
    expires_at: null,
    cancelled_at: null,
    fulfillment_status: "angenommen",
    tracking_number: null,
    versand_dienstleister: null,
    payment_method: "bank_transfer",
    payment_note: null,
    return_booking_id: null,
    offer_pdf_filename: null,
    sevdesk_order_id: null,
    sevdesk_order_number: null,
    created_at: "2026-06-01",
    ...partial,
  }
}

const due = getFulfillmentDueDate(makeQuote({}))
assert(
  "Anlieferung 2 Tage vor Event",
  due?.toISOString().slice(0, 10) === "2026-07-30",
)

const overdue = getFulfillmentTiming(
  makeQuote({
    config_json: {
      ...makeQuote({}).config_json,
      von: "2026-07-10",
    },
    fulfillment_status: "vorbereitet",
  }),
  new Date("2026-07-09T10:00:00"),
)
assert("Überfällig erkannt", overdue.urgency === "overdue")
assert("Überfällig-Label", overdue.label.includes("Überfällig"))

const eil = getFulfillmentDueDate(
  makeQuote({
    config_json: {
      ...makeQuote({}).config_json,
      lieferpaket: "eil",
      lieferzeit: "hyperexpress",
      von: "2026-07-20",
    },
    paid_at: "2026-07-08",
  }),
)
assert("Eilauftrag: 2 Tage nach Zahlung", eil?.toISOString().slice(0, 10) === "2026-07-10")

const sorted = [
  makeQuote({ id: 1, config_json: { ...makeQuote({}).config_json, von: "2026-09-01" } }),
  makeQuote({ id: 2, config_json: { ...makeQuote({}).config_json, von: "2026-07-15" } }),
].sort(compareFulfillmentUrgency)
assert("Dringender Auftrag zuerst", sorted[0]?.id === 2)

if (failed > 0) {
  console.error(`\n${failed} Test(s) fehlgeschlagen`)
  process.exit(1)
}

console.log("\nAlle Fulfillment-Timing-Tests bestanden.")
