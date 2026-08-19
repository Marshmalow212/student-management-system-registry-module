import {
  requireAssessmentStaff,
  requireRegistrar,
  requireRegistrarOrStudent,
  requireRole,
} from "@/lib/auth-guards";
import { UserRole } from "@/lib/auth/roles";
import { signSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const cookieGet = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({ get: cookieGet })),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

const users = {
  student: {
    id: 1,
    email: "student@example.com",
    name: "Student",
    role: UserRole.STUDENT,
    studentId: "S-1",
    isActive: true,
    createdAt: new Date(),
  },
  staff: {
    id: 2,
    email: "staff@example.com",
    name: "Staff",
    role: UserRole.STAFF,
    studentId: null,
    isActive: true,
    createdAt: new Date(),
  },
  registrar: {
    id: 3,
    email: "registrar@example.com",
    name: "Registrar",
    role: UserRole.REGISTRAR,
    studentId: null,
    isActive: true,
    createdAt: new Date(),
  },
  admin: {
    id: 4,
    email: "admin@example.com",
    name: "Admin",
    role: UserRole.ADMIN,
    studentId: null,
    isActive: true,
    createdAt: new Date(),
  },
};

async function authorize(user: (typeof users)[keyof typeof users]) {
  cookieGet.mockReturnValue({ value: signSession(user.id) });
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
}

describe("role authorization policy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("limits student, enrollment, and payment management to registrar or admin", async () => {
    await authorize(users.staff);
    expect((await requireRegistrar()).error?.status).toBe(403);

    await authorize(users.registrar);
    expect((await requireRegistrar()).user?.id).toBe(users.registrar.id);

    await authorize(users.admin);
    expect((await requireRegistrar()).user?.id).toBe(users.admin.id);
  });

  it("limits assessment management to staff or admin", async () => {
    await authorize(users.staff);
    expect((await requireAssessmentStaff()).user?.id).toBe(users.staff.id);

    await authorize(users.registrar);
    expect((await requireAssessmentStaff()).error?.status).toBe(403);

    await authorize(users.admin);
    expect((await requireAssessmentStaff()).user?.id).toBe(users.admin.id);
  });

  it("allows students only alongside registrar or admin for their own payment reads", async () => {
    await authorize(users.student);
    expect((await requireRegistrarOrStudent()).user?.id).toBe(users.student.id);

    await authorize(users.staff);
    expect((await requireRegistrarOrStudent()).error?.status).toBe(403);
  });

  it("restricts staff-account creation to admin", async () => {
    await authorize(users.registrar);
    expect((await requireRole([UserRole.ADMIN])).error?.status).toBe(403);

    await authorize(users.admin);
    expect((await requireRole([UserRole.ADMIN])).user?.id).toBe(users.admin.id);
  });
});
