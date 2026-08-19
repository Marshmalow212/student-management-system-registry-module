// Server-side helper to load the currently logged-in user from the
// `sms_session` cookie. Returns `null` when no valid session is present.
// Used by Server Components, Server Actions, and Route Handlers.

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  const userId = verifySession(cookie?.value);
  if (userId === null) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!user || !user.isActive) return null;
  return user;
}
