import { redirect } from "next/navigation"
import { verifyEmailToken } from "@/lib/actions/leads"

export const dynamic = "force-dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle2, XCircle } from "lucide-react"

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    redirect("/konfigurator")
  }

  const result = await verifyEmailToken(token)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            {result.success ? "E-Mail bestätigt" : "Bestätigung fehlgeschlagen"}
          </CardTitle>
          <CardDescription>
            {result.success
              ? "Sie können jetzt den Konfigurator nutzen."
              : result.error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/konfigurator">
              {result.success ? "Zum Konfigurator" : "Zurück"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
