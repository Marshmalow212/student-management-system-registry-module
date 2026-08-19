// GET /api/auth/me
import { requireAuth } from "@/lib/auth-guards";
import { jsonResponse } from "@/lib/api-utils";

interface MeResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: number;
    isActive: boolean;
    createdAt: Date;
  };
}

export async function GET(): Promise<Response> {
  try {
    const { user, error } = await requireAuth();

    if (error || !user) {
      return error!;
    }

    const response: MeResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[GET /api/auth/me] Error:", error);
    return Response.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
