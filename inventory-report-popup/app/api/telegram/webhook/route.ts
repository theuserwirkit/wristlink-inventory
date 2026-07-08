import { NextRequest } from "next/server"
import { timingSafeEqual } from "node:crypto"
import {
  answerCallbackQuery,
  editMessageAfterAction,
} from "@/lib/konfigurator/telegram"
import { approveQuoteRequest, getQuoteByIdInternal, rejectQuoteRequest } from "@/lib/quotes-internal"
import { getRejectionReasonById, type RejectionReasonId } from "@/lib/konfigurator/rejection-reasons"

export const dynamic = "force-dynamic"

type TelegramUpdate = {
  callback_query?: {
    id: string
    data?: string
    message?: { chat: { id: number }; message_id: number; text?: string }
  }
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8")
  const bBuf = Buffer.from(b, "utf8")
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export async function POST(request: NextRequest) {
  // Fail-closed: Ohne konfiguriertes Secret ist der Endpoint nicht erreichbar.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const header = request.headers.get("x-telegram-bot-api-secret-token")
  if (!header || !safeEqual(header, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const callback = update.callback_query
  if (!callback?.data || !callback.message) {
    return Response.json({ ok: true })
  }

  const parts = callback.data.split(":")
  const action = parts[0]
  const quoteId = Number(parts[1])

  try {
    if (!Number.isFinite(quoteId)) {
      await answerCallbackQuery(callback.id, "Ungültige Anfrage")
      return Response.json({ ok: true })
    }

    if (action === "approve") {
      const quote = await getQuoteByIdInternal(quoteId)
      const result = await approveQuoteRequest(quoteId)
      const successMsg =
        quote?.source === "n8n_email"
          ? `✅ Anfrage #${quoteId} freigegeben & Angebot versendet`
          : `✅ Anfrage #${quoteId} freigegeben – Zahlungslink gesendet`
      const msg = result.success ? successMsg : `❌ Freigabe fehlgeschlagen: ${result.error}`
      await answerCallbackQuery(callback.id, result.success ? "Freigegeben" : "Fehler")
      await editMessageAfterAction(
        callback.message.chat.id,
        callback.message.message_id,
        `${callback.message.text || ""}\n\n${msg}`,
      )
    } else if (action === "reject") {
      const reasonId = parts[2] as RejectionReasonId | undefined
      const reason = reasonId ? getRejectionReasonById(reasonId) : undefined

      if (!reason) {
        await answerCallbackQuery(callback.id, "Ungültiger Ablehnungsgrund")
        return Response.json({ ok: true })
      }

      const result = await rejectQuoteRequest(quoteId, reason.id)
      const msg = result.success
        ? `❌ Anfrage #${quoteId} abgelehnt (${reason.label})`
        : `Fehler: ${result.error}`
      await answerCallbackQuery(callback.id, result.success ? reason.label : "Fehler")
      await editMessageAfterAction(
        callback.message.chat.id,
        callback.message.message_id,
        `${callback.message.text || ""}\n\n${msg}`,
      )
    } else {
      await answerCallbackQuery(callback.id, "Unbekannte Aktion")
    }
  } catch (error) {
    console.error("Telegram webhook error:", error)
    try {
      await answerCallbackQuery(callback.id, "Interner Fehler – bitte im Admin prüfen")
    } catch (answerError) {
      console.error("Telegram answerCallbackQuery failed:", answerError)
    }
  }

  return Response.json({ ok: true })
}
