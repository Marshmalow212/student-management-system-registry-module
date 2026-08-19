// POST /api/auth/logout
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LogEvent } from "@/lib/auth/log-events";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import { getClientInfo, jsonResponse, errorResponse } from "@/lib/api-utils";

interface LogoutResponse {
  message: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { ipAddress, userAgent } = await getClientInfo(request);
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    const userId = verifySession(cookie?.value);

    // Log logout event even if session is invalid
    if (userId !== null) {
      await prisma.userLog.create({
        data: {
          userId,
          eventType: LogEvent.LOGOUT,
          ipAddress,
          userAgent,
          metadata: {},
        },
      });
    }

    // Clear the session cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    const response: LogoutResponse = {
      message: "Logged out successfully",
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[POST /api/auth/logout] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
