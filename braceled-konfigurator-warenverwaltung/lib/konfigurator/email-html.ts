const URL_RE = /https?:\/\/[^\s<>\n]+/g
const BROKEN_URL_RE = /(https?:\/\/[^\s<>\n/]+)\s*\n\s*(\/[^\s<>\n]*)/g

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function normalizeBrokenUrls(text: string): string {
  let result = text
  let prev = ""
  while (result !== prev) {
    prev = result
    result = result.replace(BROKEN_URL_RE, (_, start: string, path: string) => start + path)
  }
  return result
}

export function linkLabel(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith("/angebot/")) {
      return "Angebot und Status öffnen"
    }
    if (
      parsed.hostname === "checkout.stripe.com" ||
      parsed.hostname.endsWith(".stripe.com") ||
      parsed.pathname.includes("checkout")
    ) {
      return "Jetzt online bezahlen"
    }
    if (parsed.pathname.startsWith("/konfigurator/verify")) {
      return "E-Mail-Adresse bestätigen"
    }
  } catch {
    // ignore invalid URLs
  }
  return url
}

export function wrapUrlsForPlainText(text: string): string {
  return normalizeBrokenUrls(text).replace(URL_RE, (url, offset, full) => {
    const before = full[offset - 1]
    const after = full[offset + url.length]
    if (before === "<" && after === ">") return url
    return `<${url}>`
  })
}

function linkifyEscapedText(text: string): string {
  let html = ""
  let lastIndex = 0

  for (const match of text.matchAll(URL_RE)) {
    const url = match[0]
    const index = match.index ?? 0
    html += escapeHtml(text.slice(lastIndex, index))
    const safeUrl = escapeHtml(url)
    const label = linkLabel(url)
    const safeLabel = escapeHtml(label)
    if (label === url) {
      html += `<a href="${safeUrl}" style="color:#2563eb;text-decoration:underline;word-break:break-all;">${safeLabel}</a>`
    } else {
      html += `<a href="${safeUrl}" style="color:#2563eb;text-decoration:underline;">${safeLabel}</a>`
    }
    lastIndex = index + url.length
  }

  html += escapeHtml(text.slice(lastIndex))
  return html
}

export function plainTextToHtml(text: string): string {
  const normalized = normalizeBrokenUrls(text)
  const body = linkifyEscapedText(normalized).replace(/\n/g, "<br>\n")
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:sans-serif;font-size:14px;line-height:1.5;color:#111827;">
${body}
</body>
</html>`
}

export function buildEmailBodies(text: string): { text: string; html: string } {
  const normalized = normalizeBrokenUrls(text)
  return {
    text: wrapUrlsForPlainText(normalized),
    html: plainTextToHtml(normalized),
  }
}
