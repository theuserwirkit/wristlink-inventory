import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle2, XCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function VerifyErgebnisPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error } = await searchParams

  if (!success && !error) {
    redirect("/konfigurator")
  }

  const isSuccess = success === "1"

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            {isSuccess ? "E-Mail bestätigt" : "Bestätigung fehlgeschlagen"}
          </CardTitle>
          <CardDescription>
            {isSuccess
              ? "Sie können jetzt den Konfigurator nutzen."
              : error || "Bestätigung fehlgeschlagen"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/konfigurator">
              {isSuccess ? "Zum Konfigurator" : "Zurück"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
