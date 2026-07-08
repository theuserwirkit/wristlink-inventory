import { getAppBaseUrl } from "@/lib/konfigurator/lead-auth"
import { REJECTION_REASONS } from "@/lib/konfigurator/rejection-reasons"

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN nicht gesetzt")
  return token
}

function getChatId(): string {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID nicht gesetzt")
  return chatId
}

async function telegramApi(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${getBotToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Telegram API Fehler: ${text}`)
  }
  return res.json()
}

export async function sendQuoteTelegramNotification(params: {
  quoteId: number
  email: string
  summary: string
  totalNetto: number
  totalBrutto: number
  source?: "konfigurator" | "n8n_email"
}) {
  const adminUrl = `${getAppBaseUrl()}/admin/anfragen/${params.quoteId}`
  const sourceLabel = params.source === "n8n_email" ? "E-Mail-Anfrage" : "Konfigurator-Anfrage"
  const text = `📋 Neue ${sourceLabel} #${params.quoteId}

👤 ${params.email}
💰 ${params.totalNetto.toFixed(2)} EUR netto
💳 ${params.totalBrutto.toFixed(2)} EUR inkl. MwSt.

${params.summary}

Admin: ${adminUrl}`

  await telegramApi("sendMessage", {
    chat_id: getChatId(),
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Freigeben", callback_data: `approve:${params.quoteId}` }],
        ...REJECTION_REASONS.map((reason) => [
          {
            text: `❌ ${reason.label}`,
            callback_data: `reject:${params.quoteId}:${reason.id}`,
          },
        ]),
      ],
    },
  })
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  })
}

export async function editMessageAfterAction(chatId: number, messageId: number, text: string) {
  await telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: { inline_keyboard: [] },
  })
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}
