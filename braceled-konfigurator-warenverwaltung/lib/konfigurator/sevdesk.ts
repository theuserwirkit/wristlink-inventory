import "server-only"

const DEFAULT_BASE_URL = "https://my.sevdesk.de/api/v1"

function getApiToken(): string {
  const token = process.env.SEVDESK_API_TOKEN
  if (!token) throw new Error("SEVDESK_API_TOKEN nicht gesetzt")
  return token
}

function getBaseUrl(): string {
  return (process.env.SEVDESK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "")
}

export function isSevdeskConfigured(): boolean {
  return Boolean(process.env.SEVDESK_API_TOKEN)
}

export async function sevdeskFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${getBaseUrl()}/${path.replace(/^\//, "")}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: getApiToken(),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`sevDesk API Fehler (${res.status}): ${text}`)
  }
  return res
}

export async function sevdeskJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await sevdeskFetch(path, options)
  return res.json() as Promise<T>
}
