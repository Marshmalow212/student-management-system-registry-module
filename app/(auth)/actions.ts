"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { LogEvent } from "@/lib/auth/log-events"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { SESSION_COOKIE_NAME, sessionCookieOptions, signSession } from "@/lib/auth/session"
import { UserRole } from "@/lib/auth/roles"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  name: z.string().trim().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
})

export type ActionState = {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

function flattenErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_"
    if (!out[key]) out[key] = []
    out[key].push(issue.message)
  }
  return out
}

async function getClientInfo() {
  const h = await headers()
  return {
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent") ?? null,
  }
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  const { ipAddress, userAgent } = await getClientInfo()

  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenErrors(parsed.error) }
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.isActive) {
    await prisma.userLog.create({
      data: {
        userId: null,
        eventType: LogEvent.LOGIN_FAILURE,
        ipAddress,
        userAgent,
        metadata: { email, reason: user ? "inactive" : "unknown_user" },
      },
    })
    return { ok: false, error: "Invalid email or password" }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    await prisma.userLog.create({
      data: {
        userId: user.id,
        eventType: LogEvent.LOGIN_FAILURE,
        ipAddress,
        userAgent,
        metadata: { email, reason: "bad_password" },
      },
    })
    return { ok: false, error: "Invalid email or password" }
  }

  await prisma.userLog.create({
    data: {
      userId: user.id,
      eventType: LogEvent.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
      metadata: { email },
    },
  })

  const cookieStore = await cookies()
  const cookie = sessionCookieOptions()
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: signSession(user.id),
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
  })

  redirect("/dashboard")
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return { ok: false, fieldErrors: flattenErrors(parsed.error) }
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return {
      ok: false,
      fieldErrors: { confirmPassword: ["Passwords do not match"] },
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) {
    return {
      ok: false,
      fieldErrors: { email: ["An account with this email already exists"] },
    }
  }

  const passwordHash = await hashPassword(parsed.data.password)
  const created = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: UserRole.STUDENT,
    },
  })

  const { ipAddress, userAgent } = await getClientInfo()
  await prisma.userLog.create({
    data: {
      userId: created.id,
      eventType: LogEvent.REGISTER,
      ipAddress,
      userAgent,
      metadata: { email: created.email },
    },
  })

  redirect("/login")
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)
  if (cookie?.value) {
    const { verifySession } = await import("@/lib/auth/session")
    const userId = verifySession(cookie.value)
    if (userId !== null) {
      const { ipAddress, userAgent } = await getClientInfo()
      await prisma.userLog.create({
        data: {
          userId,
          eventType: LogEvent.LOGOUT,
          ipAddress,
          userAgent,
        },
      })
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect("/login")
}
