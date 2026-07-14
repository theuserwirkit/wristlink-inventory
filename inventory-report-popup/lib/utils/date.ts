import { format, parseISO, isBefore } from "date-fns"
import { de } from "date-fns/locale"

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return format(dateObj, "dd.MM.yyyy", { locale: de })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return format(dateObj, "dd.MM.yyyy HH:mm", { locale: de })
}

export function isOverdue(plannedReturnDate: Date | string | null | undefined): boolean {
  if (!plannedReturnDate) return false
  const dateObj = typeof plannedReturnDate === "string" ? parseISO(plannedReturnDate) : plannedReturnDate
  return isBefore(dateObj, new Date())
}

// Shared helpers for workday/day arithmetic (used by calendar, availability, etc.)
export function addWorkdays(date: Date, days: number): Date {
  const d = new Date(date)
  let remaining = Math.abs(days)
  const dir = days >= 0 ? 1 : -1
  while (remaining > 0) {
    d.setDate(d.getDate() + dir)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) remaining--
  }
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function subtractWorkdays(date: Date, workdays: number): Date {
  if (workdays <= 0) return new Date(date)
  return addWorkdays(date, -workdays)
}

export function rangesOverlap(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return a1.getTime() <= b2.getTime() && a2.getTime() >= b1.getTime()
}
