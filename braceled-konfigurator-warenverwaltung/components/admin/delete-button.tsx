"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { deleteGroup, deleteBatch, deleteBase } from "@/lib/actions/admin"

interface DeleteButtonProps {
  type: "group" | "batch" | "base"
  id: number
  name: string
}

export function DeleteButton({ type, id, name }: DeleteButtonProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Möchten Sie "${name}" wirklich löschen?`)) return

    setLoading(true)
    const result = type === "group" ? await deleteGroup(id) : type === "batch" ? await deleteBatch(id) : await deleteBase(id)
    setLoading(false)

    const typeLabel = type === "group" ? "Gruppe" : type === "batch" ? "Charge" : "Basis"
    if (result.success) {
      toast({ title: "Erfolg", description: `${typeLabel} wurde gelöscht` })
    } else {
      toast({ title: "Fehler", description: result.error, variant: "destructive" })
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
    </Button>
  )
}
