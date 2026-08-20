import { GET, PATCH, DELETE } from "@/app/api/students/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireRegistrar, requireRole } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    student: { findFirst: jest.fn(), update: jest.fn() },
    programme: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/auth-guards", () => ({
  requireRegistrar: jest.fn(),
  requireRole: jest.fn(),
}));

describe("student registry detail API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 1, role: 3 },
    });
    (requireRole as jest.Mock).mockResolvedValue({
      user: { id: 1, role: 3 },
    });
  });
  it("returns a safe student detail projection", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      studentUid: "S-1",
      fullName: "A Student",
      email: "a@example.com",
    });
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "1" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).not.toHaveProperty("passwordHash");
    expect(prisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ passwordHash: true }),
      }),
    );
  });

  it("updates a student inside the shared success envelope", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      status: "ACTIVE",
    });
    (prisma.student.update as jest.Mock).mockResolvedValue({
      id: 1,
      studentUid: "S-1",
      fullName: "Updated Student",
      email: "updated@example.com",
    });
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: "Updated Student",
          email: " UPDATED@example.com ",
        }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      fullName: "Updated Student",
      email: "updated@example.com",
    });
    expect(prisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: "Updated Student",
          email: "updated@example.com",
        }),
      }),
    );
  });
  it("blocks reactivation after withdrawal", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      status: 0,
    });
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ status: 1 }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("STATUS_CHANGE_REQUIRES_ENROLLMENT");
  });
  it("soft deletes a student as withdrawn", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      status: 1,
    });
    (prisma.student.update as jest.Mock).mockResolvedValue({
      id: 1,
      status: "WITHDRAWN",
      deletedAt: new Date(),
    });
    const response = await DELETE(
      new Request("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(200);
    expect(prisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 0 }),
      }),
    );
  });

  it("rejects withdrawal requests from non-admin users", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      ),
    });
    const response = await DELETE(
      new Request("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(403);
    expect(prisma.student.update).not.toHaveBeenCalled();
  });
});
