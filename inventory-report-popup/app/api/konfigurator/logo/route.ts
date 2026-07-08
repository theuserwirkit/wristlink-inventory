import { NextRequest } from "next/server"
import { saveKonfiguratorLogo } from "@/lib/actions/konfigurator-logos"

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: "Ungültige Formulardaten" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Keine Datei hochgeladen" }, { status: 400 })
  }

  const result = await saveKonfiguratorLogo(file)
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  return Response.json({ logoId: result.logoId })
}
