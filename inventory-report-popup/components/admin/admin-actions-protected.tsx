"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"
import { AdminActions } from "./admin-actions"
import { getBatches, getGroups } from "@/lib/actions/bookings"
import { verifyPassword } from "@/lib/auth"

export function AdminActionsProtected() {
  const [password, setPassword] = useState("")
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [batches, setBatches] = useState<Array<{ id: number; code: string; funktionsumfang: string }>>([])
  const [existingGroups, setExistingGroups] = useState<Array<{ name: string }>>([])

  useEffect(() => {
    if (isUnlocked) {
      Promise.all([getBatches(), getGroups()]).then(([batchData, groupData]) => {
        setBatches(batchData as Array<{ id: number; code: string; funktionsumfang: string }>)
        setExistingGroups(groupData as Array<{ name: string }>)
      })
    }
  }, [isUnlocked])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const ok = await verifyPassword(password)
    setIsLoading(false)
    if (ok) {
      setIsUnlocked(true)
      setError("")
    } else {
      setError("Falsches Passwort")
      setPassword("")
    }
  }

  if (isUnlocked) {
    return <AdminActions batches={batches} existingGroups={existingGroups} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Datenbank-Verwaltung
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUnlock} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Bitte geben Sie das Passwort ein, um auf die Datenbank-Verwaltungsfunktionen zuzugreifen.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-password">Passwort</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              placeholder="Passwort eingeben"
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" disabled={!password.trim() || isLoading}>
            {isLoading ? "Prüfe..." : "Entsperren"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
