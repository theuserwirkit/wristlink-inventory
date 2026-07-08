"use server"

import { cookies } from "next/headers"
import { checkLoginRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit"
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  verifyPassword as verifyPasswordCore,
  verifyToken,
  signToken,
} from "@/lib/auth-core"

export type SessionUser = {
  id: string
  email: string
  name: string
  role: "ADMIN" | "EDITOR" | "VIEWER"
}

export async function verifyPassword(password: string) {
  return verifyPasswordCore(password)
}

export async function createSession() {
  const timestamp = Math.floor(Date.now() / 1000)
  const token = signToken(timestamp)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) return false
    return verifyToken(sessionCookie.value)
  } catch {
    return false
  }
}

export async function login(password: string) {
  const ip = await getClientIpFromHeaders()
  const rateLimit = await checkLoginRateLimit(ip)
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Zu viele Anmeldeversuche. Bitte in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} Minute(n) erneut versuchen.`,
    }
  }

  let passwordOk = false
  try {
    passwordOk = verifyPasswordCore(password)
  } catch (error) {
    console.error("Login configuration error:", error)
    return {
      success: false,
      error: "Anmeldung ist derzeit nicht konfiguriert (WRISTLINK_PASSWORD fehlt).",
    }
  }

  if (passwordOk) {
    await createSession()
    return { success: true }
  }
  return { success: false, error: "Falsches Passwort" }
}

export async function logout() {
  await deleteSession()
}

export async function requireRole(roles: string[]) {
  const user = await getUser()
  if (!user) {
    throw new Error("Nicht authentifiziert")
  }
  const allowed = roles.map((role) => role.toUpperCase())
  if (!allowed.includes(user.role)) {
    throw new Error("Keine Berechtigung")
  }
  return true
}

export async function getUser(): Promise<SessionUser | null> {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return null
  }

  return {
    id: "admin",
    email: "admin@wristlink.app",
    name: "Administrator",
    role: "ADMIN",
  }
}

export async function canEdit(user: SessionUser | null): Promise<boolean> {
  return user?.role === "ADMIN" || user?.role === "EDITOR"
}

export async function canAdmin(user: SessionUser | null): Promise<boolean> {
  return user?.role === "ADMIN"
}
