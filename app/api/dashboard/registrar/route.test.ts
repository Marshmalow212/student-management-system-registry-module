import { GET } from "@/app/api/dashboard/registrar/route";
import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: { student: { count: jest.fn() } },
}));
jest.mock("@/lib/auth-guards", () => ({ requireRegistrar: jest.fn() }));

describe("registrar dashboard API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRegistrar as jest.Mock).mockResolvedValue({ user: { id: 8, role: 2 } });
    (prisma.student.count as jest.Mock)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
  });

  it("returns student lifecycle and overdue-payment counts", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      totalStudentCount: 20,
      enrolledStudentCount: 12,
      completedStudentCount: 3,
      deferredStudentCount: 2,
      withdrawnStudentCount: 3,
      overduePaymentStudentCount: 4,
    });
    expect(prisma.student.count).toHaveBeenNthCalledWith(6, {
      where: { deletedAt: null, hasOverdueBalance: true },
    });
  });

  it("rejects staff below registrar", async () => {
    (requireRegistrar as jest.Mock).mockResolvedValue({ user: null, error: Response.json({ code: "FORBIDDEN" }, { status: 403 }) });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(prisma.student.count).not.toHaveBeenCalled();
  });
});
