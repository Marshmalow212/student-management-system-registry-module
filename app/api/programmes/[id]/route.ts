import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-guards";
import { UserRole } from "@/lib/auth/roles";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/api-utils";
import { idSchema, isTerminalStatus, programmeCreateSchema, programmeSelect, programmeUpdateSchema, publicProgramme } from "@/lib/registry";

async function findProgramme(id: number) {
  return prisma.programme.findFirst({ where: { id, deletedAt: null }, select: programmeSelect });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { error } = await requireStaff();
    if (error) return error;
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success) return errorResponse("Invalid programme ID", 400, undefined, "VALIDATION_ERROR");
    const programme = await findProgramme(id.data);
    if (!programme) return errorResponse("Programme not found", 404, undefined, "PROGRAMME_NOT_FOUND");
    return jsonResponse({ data: publicProgramme(programme as unknown as Record<string, unknown>) });
  } catch (error) {
    console.error("[GET /api/programmes/:id] Error:", error);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { error } = await requireStaff(UserRole.REGISTRAR);
    if (error) return error;
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success) return errorResponse("Invalid programme ID", 400, undefined, "VALIDATION_ERROR");
    const current = await findProgramme(id.data);
    if (!current) return errorResponse("Programme not found", 404, undefined, "PROGRAMME_NOT_FOUND");
    const parsed = programmeUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const validated = programmeCreateSchema.safeParse({
      name: current.name,
      fee: Number(current.fee),
      discount: Number(current.discount),
      coupon: current.coupon,
      couponLimit: current.couponLimit,
      status: current.status,
      ...parsed.data,
    });
    if (!validated.success) return validationErrorResponse(validated.error);
    if (isTerminalStatus(current.status) && parsed.data.status && parsed.data.status !== current.status) return errorResponse("Archived programmes cannot be reactivated", 409, undefined, "INVALID_STATUS_TRANSITION");
    const programme = await prisma.programme.update({ where: { id: id.data }, data: parsed.data, select: programmeSelect });
    return jsonResponse({ data: publicProgramme(programme as unknown as Record<string, unknown>) });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") return errorResponse("Programme name already exists", 409, undefined, "PROGRAMME_EXISTS");
    console.error("[PATCH /api/programmes/:id] Error:", error);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { error } = await requireStaff(UserRole.ADMIN);
    if (error) return error;
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success) return errorResponse("Invalid programme ID", 400, undefined, "VALIDATION_ERROR");
    const programme = await findProgramme(id.data);
    if (!programme) return errorResponse("Programme not found", 404, undefined, "PROGRAMME_NOT_FOUND");
    const deleted = await prisma.programme.update({ where: { id: id.data }, data: { deletedAt: new Date(), status: "ARCHIVED" }, select: programmeSelect });
    return jsonResponse({ data: publicProgramme(deleted as unknown as Record<string, unknown>), message: "Programme archived" });
  } catch (error) {
    console.error("[DELETE /api/programmes/:id] Error:", error);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}