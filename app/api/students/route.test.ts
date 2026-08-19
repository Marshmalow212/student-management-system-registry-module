import { GET, POST } from "@/app/api/students/route";
import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    student: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    programme: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireRegistrar: jest.fn() }));

describe("student registry collection API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 1, role: 2 },
    });
  });

  it("searches students with filters and pagination", async () => {
    (prisma.student.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        studentUid: "S-1",
        fullName: "A Student",
        email: "a@example.com",
      },
    ]);
    (prisma.student.count as jest.Mock).mockResolvedValue(1);
    const response = await GET(
      new Request(
        "http://localhost/api/students?search=student&status=ACTIVE&programmeId=4&pageSize=5",
      ),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data[0]).not.toHaveProperty("passwordHash");
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ passwordHash: true }),
      }),
    );
    expect(body.pagination.total).toBe(1);
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 5 }),
    );
  });

  it("rejects invalid filters before querying", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/students?status=REMOVED&programmeId=not-a-number",
      ),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(prisma.student.findMany).not.toHaveBeenCalled();
  });

  it("rejects malformed student input before persistence", async () => {
    const response = await POST(
      new Request("http://localhost/api/students", {
        method: "POST",
        body: JSON.stringify({ email: "bad", fullName: "" }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(prisma.student.create).not.toHaveBeenCalled();
  });

  it("requires an active programme and student-role user when linking", async () => {
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/students", {
        method: "POST",
        body: JSON.stringify({
          studentUid: "S-1",
          fullName: "A Student",
          email: "a@example.com",
          programmeId: 4,
          userId: 8,
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.code).toBe("PROGRAMME_NOT_FOUND");
    expect(prisma.student.create).not.toHaveBeenCalled();
  });

  it("maps duplicate identity to a conflict", async () => {
    (prisma.student.create as jest.Mock).mockRejectedValue({ code: "P2002" });
    const response = await POST(
      new Request("http://localhost/api/students", {
        method: "POST",
        body: JSON.stringify({
          studentUid: "S-1",
          fullName: "A Student",
          email: "a@example.com",
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.code).toBe("STUDENT_EXISTS");
  });

  it("rejects writes from staff below registrar", async () => {
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      ),
    });
    const response = await POST(
      new Request("http://localhost/api/students", {
        method: "POST",
        body: JSON.stringify({
          studentUid: "S-1",
          fullName: "A Student",
          email: "a@example.com",
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect(prisma.student.create).not.toHaveBeenCalled();
  });
});
