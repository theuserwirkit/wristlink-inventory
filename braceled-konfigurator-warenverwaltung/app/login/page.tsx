import { LoginForm } from "@/components/auth/login-form"
import { isAuthenticated } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const authenticated = await isAuthenticated()

  if (authenticated) {
    redirect("/warenverwaltung")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-balance">WIRKUNG.wristlink</h1>
          <p className="text-muted-foreground mt-2">Warenverwaltung</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
