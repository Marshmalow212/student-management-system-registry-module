import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-guards"
import { UserRole } from "@/lib/auth/roles"
import { errorResponse, jsonResponse } from "@/lib/api-utils"

const roleSchema = z.coerce.number().int().min(UserRole.STUDENT).max(UserRole.ADMIN)

export async function GET(request: Request): Promise<Response> {
  try {
    const { error } = await requireRole([UserRole.ADMIN])
    if (error) return error

    const roleValue = new URL(request.url).searchParams.get("role")
    const parsedRole = roleValue === null || roleValue === "" ? null : roleSchema.safeParse(roleValue)
    if (parsedRole && !parsedRole.success) return errorResponse("Invalid role filter", 400, undefined, "VALIDATION_ERROR")

    const users = await prisma.user.findMany({
      where: parsedRole ? { role: parsedRole.data } : undefined,
      select: { id: true, name: true, email: true, role: true, isActive: true, isVerified: true, createdAt: true, updatedAt: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    })

    return jsonResponse({ data: users }, 200)
  } catch (error) {
    console.error("[GET /api/users] Error:", error)
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR")
  }
}