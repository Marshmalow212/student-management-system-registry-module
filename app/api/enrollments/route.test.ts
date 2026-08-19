import { GET, POST } from "@/app/api/enrollments/route";
import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    studentEnrollment: { findMany: jest.fn(), create: jest.fn() },
    paymentTransaction: { aggregate: jest.fn() },
    student: { findFirst: jest.fn(), update: jest.fn() },
    programme: { findFirst: jest.fn(), updateMany: jest.fn() },
    userLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireRegistrar: jest.fn() }));

describe("enrolment API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 7, role: 2 },
    });
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    (prisma.studentEnrollment.findMany as jest.Mock).mockResolvedValue([]);
  });

  it("rejects unauthenticated reads", async () => {
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    });
    const response = await GET(new Request("http://localhost/api/enrollments"));
    expect(response.status).toBe(401);
    expect(prisma.studentEnrollment.findMany).not.toHaveBeenCalled();
  });

  it("calculates and snapshots fee from the active programme", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({ id: 4 });
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({
      fee: "1250.00",
      discount: "100.00",
      coupon: "SAVE100",
      couponLimit: 2,
      couponUsed: 0,
    });
    (prisma.programme.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.studentEnrollment.create as jest.Mock).mockResolvedValue({
      id: 9,
      reference: "ENR-9",
      feeTotal: "1150.00",
      dueDate: null,
    });
    const response = await POST(
      new Request("http://localhost/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          reference: "ENR-9",
          studentId: 4,
          programmeId: 2,
          enrolledYear: 2026,
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.feeTotal).toBe("1150.00");
    expect(prisma.studentEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feeTotal: "1150.00", feeSnapshot: "1250.00", discountSnapshot: "100.00", createdById: 7 }),
      }),
    );
  });

  it("snapshots decimal fees without binary floating point rounding", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({ id: 4 });
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({
      fee: "10.10",
      discount: "0.10",
      coupon: "TENOFF",
      couponLimit: 1,
      couponUsed: 0,
    });
    (prisma.programme.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.studentEnrollment.create as jest.Mock).mockResolvedValue({
      id: 9,
      reference: "ENR-10",
      feeTotal: "10.00",
      dueDate: null,
    });
    const response = await POST(
      new Request("http://localhost/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          reference: "ENR-10",
          studentId: 4,
          programmeId: 2,
          enrolledYear: 2026,
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(prisma.studentEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feeTotal: "10.00" }),
      }),
    );
  });

  it("maps duplicate enrolments to a conflict", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({ id: 4 });
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({
      fee: "100.00",
      discount: "0.00",
      coupon: null,
      couponLimit: null,
      couponUsed: 0,
    });

    (prisma.studentEnrollment.create as jest.Mock).mockRejectedValue({
      code: "P2002",
    });
    const response = await POST(
      new Request("http://localhost/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          reference: "ENR-9",
          studentId: 4,
          programmeId: 2,
          enrolledYear: 2026,
        }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("ENROLLMENT_EXISTS");
  });

  it("does not create enrolment or logs when the coupon is exhausted", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({ id: 4 });
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({
      fee: "100.00", discount: "10.00", coupon: "SAVE10", couponLimit: 1, couponUsed: 1,
    });
    (prisma.programme.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const response = await POST(new Request("http://localhost/api/enrollments", {
      method: "POST",
      body: JSON.stringify({ reference: "ENR-11", studentId: 4, programmeId: 2, enrolledYear: 2026 }),
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("COUPON_EXHAUSTED");
    expect(prisma.studentEnrollment.create).not.toHaveBeenCalled();
    expect(prisma.userLog.create).not.toHaveBeenCalled();
  });

  it("rejects malformed list filters before querying", async () => {
    const response = await GET(
      new Request("http://localhost/api/enrollments?status=UNKNOWN"),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(prisma.studentEnrollment.findMany).not.toHaveBeenCalled();
  });
});
