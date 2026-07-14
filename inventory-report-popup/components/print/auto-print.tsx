"use client"

import { useEffect } from "react"

type AutoPrintProps = {
  autoprint?: boolean
}

export function AutoPrint({ autoprint = false }: AutoPrintProps) {
  useEffect(() => {
    if (!autoprint) return
    const timer = setTimeout(() => {
      window.print()
    }, 500)
    return () => clearTimeout(timer)
  }, [autoprint])

  return null
}
