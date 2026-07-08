#!/usr/bin/env node
/**
 * Aktualisiert wristlink-n8n-workflow.json: Anfragen → quote-requests API.
 */
const fs = require("fs")
const path = require("path")

const root = __dirname
const promptsDir = path.join(root, "prompts")
const workflowPath = path.join(root, "wristlink-n8n-workflow.json")

function readPrompt(name) {
  return fs.readFileSync(path.join(promptsDir, name), "utf8").trim()
}

const extraktionSystem = readPrompt("extraktion-system.md")
const angebotSystem = readPrompt("angebot-system.md")
const produktWissen = readPrompt("produkt-wissen.md")
const rueckfrageSystem = readPrompt("rueckfrage-system.md").replace(
  "{{PRODUKT_WISSEN}}",
  produktWissen,
)

const preisEngineCode = fs.readFileSync(
  path.join(root, "wristlink-preis-engine.js"),
  "utf8",
)

const ANFRAGE_BODY = `={{ (() => {
  const avail = $('Verfuegbarkeit API').first().json;
  const preis = $('Preis-Engine').first().json;
  const gmail = $('Gmail Trigger').first().json;
  const angebot = ($('KI: Angebot').first().json.content || []).filter(b => b.type === 'text').map(b => b.text).join('\\n');
  const email = gmail.from?.value?.[0]?.address || (gmail.from?.text || '').match(/<([^>]+)>/)?.[1] || (gmail.from?.text || '').trim();
  return JSON.stringify({
    email,
    skip_notifications: false,
    external_ref: String(gmail.id || gmail.threadId || gmail.messageId || ''),
    notes: angebot,
    config: {
      produkt: avail.produkt,
      modus: avail.modus,
      menge: avail.menge,
      von: avail.von || undefined,
      bis: avail.bis || undefined,
      druck: Boolean(avail.druck),
      gruppen: Number(avail.gruppen || 0),
      station: avail.station || 'keine',
      stationModus: avail.modus,
      lieferzeit: avail.lieferzeit || 'standard',
      land: avail.land || 'DE',
    },
    price_snapshot: preis,
  });
})() }}`

function anthropicNode(id, name, position, systemPrompt, userContentExpr) {
  const jsonBody = `={{ JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2048, system: ${JSON.stringify(systemPrompt)}, messages: [{ role: "user", content: ${userContentExpr} }] }) }}`
  return {
    parameters: {
      method: "POST",
      url: "https://api.anthropic.com/v1/messages",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "x-api-key", value: "={{$env.ANTHROPIC_API_KEY}}" },
          { name: "anthropic-version", value: "2023-06-01" },
          { name: "content-type", value: "application/json" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody,
    },
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    notes: "Header Auth Credential optional – alternativ x-api-key via $env",
  }
}

function wristlinkApiNode(id, name, position, method, urlExpr, notes) {
  return {
    parameters: {
      method,
      url: urlExpr,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    notes,
  }
}

const workflow = {
  name: "WIRKUNG Wristlink - Anfragen, Verfuegbarkeit & Angebote",
  nodes: [
    {
      parameters: {
        pollTimes: { item: [{ mode: "everyMinute" }] },
        simple: false,
        filters: {
          q: 'in:inbox -subject:"Ihr WIRKUNG Wristlink Angebot" -subject:"Rueckfrage zu Ihrer WIRKUNG Wristlink Anfrage"',
        },
      },
      id: "Gmail_Trigger",
      name: "Gmail Trigger",
      type: "n8n-nodes-base.gmailTrigger",
      typeVersion: 1.2,
      position: [0, 480],
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: false, leftValue: "", typeValidation: "loose" },
          conditions: [
            {
              id: "no-angebot-reply",
              leftValue: "={{ $json.subject || '' }}",
              rightValue: "Ihr WIRKUNG Wristlink Angebot",
              operator: { type: "string", operation: "notContains" },
            },
            {
              id: "no-rueckfrage-reply",
              leftValue: "={{ $json.subject || '' }}",
              rightValue: "Rueckfrage zu Ihrer WIRKUNG Wristlink",
              operator: { type: "string", operation: "notContains" },
            },
          ],
          combinator: "and",
        },
      },
      id: "IF_echte_Anfrage",
      name: "IF: echte Anfrage",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [110, 480],
    },
    anthropicNode(
      "KI_Klassifizieren",
      "KI: Klassifizieren",
      [220, 480],
      extraktionSystem,
      `'Betreff: ' + ($json.subject || '') + '\\n\\n' + ($json.text || $json.snippet || $json.textPlain || JSON.stringify($json))`,
    ),
    {
      parameters: {
        jsCode:
          "// Anthropic-Antwort -> sauberes JSON-Objekt\nconst blocks = $json.content || [];\nconst text = blocks.filter(b => b.type === 'text').map(b => b.text).join('\\n');\ntry {\n  const data = JSON.parse(text.replace(/```json|```/g, '').trim());\n  return [{ json: data }];\n} catch (e) {\n  return [{ json: { gueltig: false, fehler: ['KI-Antwort war kein gueltiges JSON'], raw: text, missing_fields: ['produkt','modus','menge'] } }];\n}\n",
      },
      id: "Felder_parsen",
      name: "Felder parsen",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [440, 480],
    },
    {
      parameters: {
        method: "POST",
        url: "={{$env.WRISTLINK_API_URL}}/api/availability",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json) }}",
      },
      id: "Verfuegbarkeit_API",
      name: "Verfuegbarkeit API",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [660, 480],
      notes: "Header Auth: Authorization Bearer + WRISTLINK_API_KEY",
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
          conditions: [
            {
              id: "cond-missing",
              leftValue: "={{ ($json.missing_fields || []).length }}",
              rightValue: 0,
              operator: { type: "number", operation: "equals" },
            },
            {
              id: "cond-verfuegbar",
              leftValue: "={{ $json.verfuegbar }}",
              rightValue: true,
              operator: { type: "boolean", operation: "true" },
            },
          ],
          combinator: "and",
        },
      },
      id: "IF_vollst_&_verfuegbar",
      name: "IF: vollst & verfuegbar",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [880, 480],
    },
    {
      parameters: { jsCode: preisEngineCode },
      id: "Preis-Engine",
      name: "Preis-Engine",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1100, 320],
    },
    anthropicNode(
      "KI_Angebot",
      "KI: Angebot",
      [1320, 320],
      angebotSystem,
      `JSON.stringify($('Preis-Engine').first().json)`,
    ),
    {
      parameters: {
        method: "POST",
        url: "={{$env.WRISTLINK_API_URL}}/api/quote-requests",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        specifyBody: "json",
        jsonBody: ANFRAGE_BODY,
      },
      id: "Anfrage_anlegen",
      name: "Anfrage anlegen",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1540, 320],
      notes: "Legt quote_requests an + Soft-Hold. Telegram-Freigabe läuft über die Wristlink-App.",
    },
    anthropicNode(
      "KI_Rueckfrage",
      "KI: Rueckfrage",
      [1100, 660],
      rueckfrageSystem,
      `JSON.stringify({ anfrage: $('Verfuegbarkeit API').first().json, betreff: $('Gmail Trigger').first().json.subject, mailtext: $('Gmail Trigger').first().json.text || $('Gmail Trigger').first().json.snippet || '' })`,
    ),
    {
      parameters: {
        resource: "draft",
        operation: "create",
        subject: "=Rueckfrage zu Ihrer WIRKUNG Wristlink Anfrage",
        emailType: "text",
        message:
          "={{ ($json.content || []).filter(b => b.type === 'text').map(b => b.text).join('\\n') }}",
        options: {
          appendAttribution: false,
        },
      },
      id: "Rueckfrage-Entwurf",
      name: "Rueckfrage-Entwurf",
      type: "n8n-nodes-base.gmail",
      typeVersion: 2.1,
      position: [1320, 660],
    },
    {
      parameters: {
        content:
          "## Setup\\n\\nCredentials / Env:\\n- Gmail (OAuth2)\\n- Anthropic ($env.ANTHROPIC_API_KEY)\\n- WRISTLINK_API_URL (Vercel-App)\\n- WRISTLINK_API_KEY (Bearer)\\n\\nAnfragen: POST /api/quote-requests\\nFreigabe: Telegram-Buttons der App (Webhook)",
        height: 300,
        width: 340,
        color: 5,
      },
      id: "Setup",
      name: "Setup",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [0, 120],
    },
    {
      parameters: {
        content:
          "## Anfrage anlegen\\n\\nPOST /api/quote-requests\\n\\n- source=n8n_email\\n- Soft-Hold (ANFRAGE)\\n- Angebotstext in notes\\n- Telegram via Wristlink-App\\n\\nFreigabe/Ablehnung per Telegram-Webhook",
        height: 280,
        width: 320,
        color: 3,
      },
      id: "Note_Quote",
      name: "Note_Quote",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [1540, 80],
    },
    {
      parameters: {
        content:
          "## Telegram-Freigabe\\n\\nDie App sendet nach Anfrage anlegen\\neine Telegram-Nachricht mit Buttons.\\nFreigabe ruft /approve + Kundenmail auf.",
        height: 220,
        width: 300,
        color: 5,
      },
      id: "Note_Approve",
      name: "Note_Approve",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [1760, 80],
    },
  ],
  connections: {
    "Gmail Trigger": {
      main: [[{ node: "IF: echte Anfrage", type: "main", index: 0 }]],
    },
    "IF: echte Anfrage": {
      main: [[{ node: "KI: Klassifizieren", type: "main", index: 0 }], []],
    },
    "KI: Klassifizieren": {
      main: [[{ node: "Felder parsen", type: "main", index: 0 }]],
    },
    "Felder parsen": {
      main: [[{ node: "Verfuegbarkeit API", type: "main", index: 0 }]],
    },
    "Verfuegbarkeit API": {
      main: [[{ node: "IF: vollst & verfuegbar", type: "main", index: 0 }]],
    },
    "IF: vollst & verfuegbar": {
      main: [
        [{ node: "Preis-Engine", type: "main", index: 0 }],
        [{ node: "KI: Rueckfrage", type: "main", index: 0 }],
      ],
    },
    "Preis-Engine": {
      main: [[{ node: "KI: Angebot", type: "main", index: 0 }]],
    },
    "KI: Angebot": {
      main: [[{ node: "Anfrage anlegen", type: "main", index: 0 }]],
    },
    "KI: Rueckfrage": {
      main: [[{ node: "Rueckfrage-Entwurf", type: "main", index: 0 }]],
    },
  },
  settings: { executionOrder: "v1" },
  active: false,
}

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + "\n")
console.log("Workflow aktualisiert:", workflowPath)
