import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-guards";
import { UserRole } from "@/lib/auth/roles";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/api-utils";
import { parsePage, parseSort, programmeCreateSchema, programmeSelect, programmeStatuses, publicProgramme } from "@/lib/registry";

export async function GET(request: Request): Promise<Response> {
  try {
    const { error } = await requireStaff();
    if (error) return error;
    const params = new URL(request.url).searchParams;
    const page = parsePage(params.get("page"), 1, 100000);
    const pageSize = parsePage(params.get("pageSize"), 20, 100);
    const search = params.get("search")?.trim();
    const status = params.get("status");
    if (status && !programmeStatuses.includes(status as (typeof programmeStatuses)[number])) return errorResponse("Invalid programme status", 400, undefined, "VALIDATION_ERROR");
    const sort = parseSort(params.get("sort"), ["name", "fee", "createdAt", "updatedAt"], "name");
    const order = params.get("order") === "desc" ? "desc" : "asc";
    const where = { deletedAt: null, ...(status ? { status: status as never } : {}), ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}) };
    const [items, total] = await Promise.all([
      prisma.programme.findMany({ where, select: programmeSelect, orderBy: { [sort]: order }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.programme.count({ where }),
    ]);
    return jsonResponse({ data: items.map((item) => publicProgramme(item as unknown as Record<string, unknown>)), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) {
    console.error("[GET /api/programmes] Error:", error);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { error } = await requireStaff(UserRole.REGISTRAR);
    if (error) return error;
    const parsed = programmeCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const programme = await prisma.programme.create({ data: parsed.data, select: programmeSelect });
    return jsonResponse({ data: publicProgramme(programme as unknown as Record<string, unknown>) }, 201);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") return errorResponse("Programme name already exists", 409, undefined, "PROGRAMME_EXISTS");
    console.error("[POST /api/programmes] Error:", error);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}