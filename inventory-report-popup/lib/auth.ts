"use server"

import { cookies } from "next/headers"
import { getDb } from "@/lib/db"
import { verifyPasswordHash } from "@/lib/password"
import { checkLoginRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit"
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  verifyToken,
  signToken,
} from "@/lib/auth-core"

export type SessionUser = {
  id: string
  email: string
  name: string
  role: "ADMIN" | "EDITOR" | "VIEWER"
}

type DbUserRow = {
  id: number
  email: string
  name: string
  role: SessionUser["role"]
  password: string
}

function mapDbUser(row: Pick<DbUserRow, "id" | "email" | "name" | "role">): SessionUser {
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
  }
}

async function findUserByEmail(email: string): Promise<DbUserRow | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, email, password, name, role
    FROM users
    WHERE LOWER(email) = LOWER(${email.trim()})
    LIMIT 1
  `
  return (rows[0] as DbUserRow | undefined) ?? null
}

async function findUserById(id: number): Promise<SessionUser | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, email, name, role
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `
  const row = rows[0] as Pick<DbUserRow, "id" | "email" | "name" | "role"> | undefined
  return row ? mapDbUser(row) : null
}

export async function createSession(userId: number) {
  const timestamp = Math.floor(Date.now() / 1000)
  const token = signToken(userId, timestamp)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
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
    return verifyToken(sessionCookie.value) !== null
  } catch {
    return false
  }
}

export async function login(email: string, password: string) {
  const ip = await getClientIpFromHeaders()
  const rateLimit = await checkLoginRateLimit(ip)
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Zu viele Anmeldeversuche. Bitte in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} Minute(n) erneut versuchen.`,
    }
  }

  const normalizedEmail = email.trim()
  if (!normalizedEmail || !password) {
    return { success: false, error: "E-Mail und Passwort sind erforderlich" }
  }

  try {
    const user = await findUserByEmail(normalizedEmail)
    if (!user || !verifyPasswordHash(password, user.password)) {
      return { success: false, error: "Ungültige E-Mail oder Passwort" }
    }

    await createSession(user.id)
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return {
      success: false,
      error: "Anmeldung ist derzeit nicht möglich (Datenbank nicht erreichbar).",
    }
  }
}

export async function logout() {
  await deleteSession()
}

export async function verifyPassword(password: string) {
  const user = await getUser()
  if (!user) return false

  try {
    const row = await findUserByEmail(user.email)
    if (!row) return false
    return verifyPasswordHash(password, row.password)
  } catch {
    return false
  }
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
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) return null

    const session = verifyToken(sessionCookie.value)
    if (!session) return null

    return await findUserById(session.userId)
  } catch {
    return null
  }
}

export async function canEdit(user: SessionUser | null): Promise<boolean> {
  return user?.role === "ADMIN" || user?.role === "EDITOR"
}

export async function canAdmin(user: SessionUser | null): Promise<boolean> {
  return user?.role === "ADMIN"
}
