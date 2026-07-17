import { NextRequest, NextResponse } from "next/server"
import { verifyEmailToken } from "@/lib/actions/leads"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(new URL("/konfigurator", request.url))
  }

  const result = await verifyEmailToken(token)
  const resultUrl = new URL("/konfigurator/verify/ergebnis", request.url)

  if (result.success) {
    resultUrl.searchParams.set("success", "1")
  } else {
    resultUrl.searchParams.set("error", result.error || "Bestätigung fehlgeschlagen")
  }

  return NextResponse.redirect(resultUrl)
}
