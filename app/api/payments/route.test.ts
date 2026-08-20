import { POST, GET } from "@/app/api/payments/route";
import { prisma } from "@/lib/prisma";
import { requireRegistrar, requireRegistrarOrStudent } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    paymentTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    studentEnrollment: { findUnique: jest.fn() },
    student: { findUnique: jest.fn() },
    userLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth-guards", () => ({
  requireRegistrar: jest.fn(),
  requireRegistrarOrStudent: jest.fn(),
}));

describe("payment ledger API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 7, role: 2 },
    });
    (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
      user: { id: 7, role: 2 },
    });
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.paymentTransaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: "0.00" },
    });
    (prisma.studentEnrollment.findUnique as jest.Mock).mockResolvedValue({
      id: 9,
      feeTotal: "100.00",
      status: 1,
    });
    (prisma.paymentTransaction.create as jest.Mock).mockResolvedValue({
      id: 1,
      reference: "PAY-1",
      idempotencyKey: "idem-1",
      enrollmentId: 9,
      amount: "40.10",
      currency: "USD",
    });
  });

  it("rejects invalid amounts before touching the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        body: JSON.stringify({
          reference: "PAY-1",
          idempotencyKey: "idem-1",
          enrollmentId: 9,
          amount: "10.999",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects zero payments before touching the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        body: JSON.stringify({
          reference: "PAY-1",
          idempotencyKey: "idem-1",
          enrollmentId: 9,
          amount: "0.00",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("records decimal-safe payments and returns string money", async () => {
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        body: JSON.stringify({
          reference: "PAY-1",
          idempotencyKey: "idem-1",
          enrollmentId: 9,
          amount: "40.10",
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.data.amount).toBe("40.10");
    expect(prisma.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: "40.10", receivedById: 7 }),
      }),
    );
  });

  it("blocks overpayment inside the transaction", async () => {
    (prisma.paymentTransaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: "90.00" },
    });
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        body: JSON.stringify({
          reference: "PAY-2",
          idempotencyKey: "idem-2",
          enrollmentId: 9,
          amount: "10.01",
        }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("OVERPAYMENT");
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("returns the original payment for an idempotent replay", async () => {
    (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      reference: "PAY-1",
      idempotencyKey: "idem-1",
      enrollmentId: 9,
      amount: "40.10",
      currency: "USD",
    });
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        body: JSON.stringify({
          reference: "PAY-1",
          idempotencyKey: "idem-1",
          enrollmentId: 9,
          amount: "40.10",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).replay).toBe(true);
    expect(prisma.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("rejects an idempotency key reused with different payment data", async () => {
    (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      reference: "PAY-1",
      idempotencyKey: "idem-1",
      enrollmentId: 9,
      amount: "40.10",
      currency: "USD",
    });
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        body: JSON.stringify({
          reference: "PAY-2",
          idempotencyKey: "idem-1",
          enrollmentId: 9,
          amount: "40.10",
        }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("rejects payments for completed enrolments", async () => {
    (prisma.studentEnrollment.findUnique as jest.Mock).mockResolvedValue({
      id: 9,
      feeTotal: "100.00",
      status: "COMPLETED",
    });
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        body: JSON.stringify({
          reference: "PAY-2",
          idempotencyKey: "idem-2",
          enrollmentId: 9,
          amount: "10.00",
        }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("ENROLLMENT_NOT_PAYABLE");
  });

  it("rejects payment writes for staff without registrar permission", async () => {
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 1, role: 1 },
      error: Response.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 },
      ),
    });
    const response = await POST(
      new Request("http://localhost/api/payments", {
        method: "POST",
        body: JSON.stringify({
          reference: "PAY-2",
          idempotencyKey: "idem-2",
          enrollmentId: 9,
          amount: "10.00",
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  describe("GET /api/payments", () => {
    const mockPayments = [
      {
        id: 1,
        reference: "PAY-001",
        idempotencyKey: "idem-001",
        enrollmentId: 10,
        amount: "250.00",
        currency: "USD",
        paymentDate: new Date("2026-08-10"),
        createdAt: new Date("2026-08-10"),
        enrollment: { studentId: 5, programmeId: 2 },
      },
      {
        id: 2,
        reference: "PAY-002",
        idempotencyKey: "idem-002",
        enrollmentId: 11,
        amount: "150.00",
        currency: "USD",
        paymentDate: new Date("2026-08-11"),
        createdAt: new Date("2026-08-11"),
        enrollment: { studentId: 5, programmeId: 2 },
      },
    ];

    it("staff can view all payments", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: { id: 7, role: 1 },
      });
      (prisma.paymentTransaction.findMany as jest.Mock).mockResolvedValue(
        mockPayments,
      );

      const response = await GET(new Request("http://localhost/api/payments"));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(body.data[0].reference).toBe("PAY-001");
      expect(prisma.paymentTransaction.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { paymentDate: "desc" },
        select: expect.any(Object),
      });
    });

    it("staff can filter by enrollmentId", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: { id: 7, role: 1 },
      });
      (prisma.paymentTransaction.findMany as jest.Mock).mockResolvedValue([
        mockPayments[0],
      ]);

      const response = await GET(
        new Request("http://localhost/api/payments?enrollmentId=10"),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(prisma.paymentTransaction.findMany).toHaveBeenCalledWith({
        where: { enrollmentId: 10 },
        orderBy: { paymentDate: "desc" },
        select: expect.any(Object),
      });
    });

    it("student can view their own payment history", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: { id: 20, role: 0, studentId: "STU-2026-005" },
      });
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.paymentTransaction.findMany as jest.Mock).mockResolvedValue(
        mockPayments,
      );

      const response = await GET(new Request("http://localhost/api/payments"));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(prisma.student.findUnique).toHaveBeenCalledWith({
        where: { studentUid: "STU-2026-005" },
        select: { id: true },
      });
      expect(prisma.paymentTransaction.findMany).toHaveBeenCalledWith({
        where: { enrollment: { studentId: 5 } },
        orderBy: { paymentDate: "desc" },
        select: expect.any(Object),
      });
    });

    it("student can filter by enrollmentId for their own enrollments", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: { id: 20, role: 0, studentId: "STU-2026-005" },
      });
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.paymentTransaction.findMany as jest.Mock).mockResolvedValue([
        mockPayments[0],
      ]);

      const response = await GET(
        new Request("http://localhost/api/payments?enrollmentId=10"),
      );

      expect(response.status).toBe(200);
      expect(prisma.paymentTransaction.findMany).toHaveBeenCalledWith({
        where: {
          enrollment: { studentId: 5 },
          enrollmentId: 10,
        },
        orderBy: { paymentDate: "desc" },
        select: expect.any(Object),
      });
    });

    it("returns empty array when student has no payments", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: { id: 20, role: 0, studentId: "STU-2026-999" },
      });
      (prisma.student.findUnique as jest.Mock).mockResolvedValue({ id: 999 });
      (prisma.paymentTransaction.findMany as jest.Mock).mockResolvedValue([]);

      const response = await GET(new Request("http://localhost/api/payments"));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(0);
    });

    it("returns 403 when student profile not found", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: { id: 20, role: 0, studentId: "STU-INVALID" },
      });
      (prisma.student.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await GET(new Request("http://localhost/api/payments"));

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe("STUDENT_PROFILE_MISSING");
      expect(prisma.paymentTransaction.findMany).not.toHaveBeenCalled();
    });

    it("returns 403 when student user has no studentId", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: { id: 20, role: 0, studentId: null },
      });

      const response = await GET(new Request("http://localhost/api/payments"));

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe("STUDENT_PROFILE_MISSING");
      expect(prisma.student.findUnique).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: null,
        error: Response.json(
          { error: "Unauthorized", code: "UNAUTHORIZED" },
          { status: 401 },
        ),
      });

      const response = await GET(new Request("http://localhost/api/payments"));

      expect(response.status).toBe(401);
      expect(prisma.paymentTransaction.findMany).not.toHaveBeenCalled();
    });

    it("rejects invalid enrollmentId parameter", async () => {
      (requireRegistrarOrStudent as jest.Mock).mockResolvedValue({
        user: { id: 7, role: 1 },
      });

      const response = await GET(
        new Request("http://localhost/api/payments?enrollmentId=invalid"),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(prisma.paymentTransaction.findMany).not.toHaveBeenCalled();
    });
  });
});
