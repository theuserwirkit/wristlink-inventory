/**
 * Tests für Produkt-Mapping und Verfügbarkeits-API-Logik (ohne DB).
 * Integrationstest optional mit WRISTLINK_API_URL + WRISTLINK_API_KEY.
 *
 * Ausführen: node scripts/test-n8n-api.mjs
 */
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// --- Inline-Kopie der reinen Mapping-Logik (kein TS-Import nötig) ---
const DEFAULT_PRODUCT_PATTERNS = {
  armband: ["armband"],
  zauberstab: ["zauberstab", "stab"],
  licht: ["licht"],
}

function groupMatchesPatterns(groupName, patterns) {
  const normalized = groupName.toLowerCase()
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()))
}

function parseMappingJson(raw) {
  try {
    const parsed = JSON.parse(raw)
    const result = {}
    for (const produkt of ["armband", "zauberstab", "licht"]) {
      const patterns = parsed[produkt]
      if (!Array.isArray(patterns) || patterns.length === 0) return null
      result[produkt] = patterns.map(String)
    }
    return result
  } catch {
    return null
  }
}

console.log("=== Unit: Produkt-Mapping ===")

assert(groupMatchesPatterns("LED Armband Standard", DEFAULT_PRODUCT_PATTERNS.armband), "armband match")
assert(groupMatchesPatterns("Zauberstab Pro", DEFAULT_PRODUCT_PATTERNS.zauberstab), "zauberstab match")
assert(groupMatchesPatterns("Mini Licht", DEFAULT_PRODUCT_PATTERNS.licht), "licht match")
assert(!groupMatchesPatterns("Zauberstab", DEFAULT_PRODUCT_PATTERNS.armband), "no false armband")

const custom = parseMappingJson('{"armband":["band"],"zauberstab":["stab"],"licht":["light"]}')
assert(custom.armband[0] === "band", "custom mapping parse")

console.log("OK – Produkt-Mapping")

console.log("\n=== Unit: Workflow-Datei ===")
const workflowPath = join(__dirname, "../../uebergabe/wristlink-n8n-workflow.json")
const workflow = JSON.parse(readFileSync(workflowPath, "utf8"))
const nodeNames = workflow.nodes.map((n) => n.name)
assert(nodeNames.includes("Verfuegbarkeit API"), "Verfuegbarkeit API node")
assert(nodeNames.includes("Buchung API"), "Buchung API node")
assert(!nodeNames.includes("Bestand lesen"), "Bestand lesen entfernt")
assert(!nodeNames.includes("Buchungen lesen"), "Buchungen lesen entfernt")
assert(workflow.connections["Felder parsen"].main[0][0].node === "Verfuegbarkeit API", "Felder parsen -> API")

const kiNode = workflow.nodes.find((n) => n.name === "KI: Klassifizieren")
assert(kiNode.parameters.jsonBody.includes("claude-sonnet-4-6"), "Extraktions-Prompt eingebettet")

console.log("OK – Workflow-Struktur")

async function integrationTest() {
  const baseUrl = process.env.WRISTLINK_API_URL
  const apiKey = process.env.WRISTLINK_API_KEY
  if (!baseUrl || !apiKey) {
    console.log("\n=== Integration: übersprungen (WRISTLINK_API_URL / WRISTLINK_API_KEY nicht gesetzt) ===")
    return
  }

  console.log("\n=== Integration: Verfügbarkeit API ===")
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/availability`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      produkt: "armband",
      modus: "kauf",
      menge: 500,
      missing_fields: [],
    }),
  })
  assert(res.status === 200, `availability status ${res.status}`)
  const data = await res.json()
  assert(data.verfuegbar === true, "kauf immer verfuegbar")
  console.log("OK – GET/POST availability (Kauf)")
}

integrationTest()
  .then(() => {
    console.log("\nAlle Tests bestanden.")
  })
  .catch((err) => {
    console.error("\nFEHLER:", err.message)
    process.exit(1)
  })
