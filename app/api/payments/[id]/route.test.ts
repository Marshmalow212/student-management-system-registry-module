import { GET } from "@/app/api/payments/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    paymentTransaction: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireRegistrar: jest.fn() }));

describe("GET /api/payments/[id]", () => {
  const mockPayment = {
    id: 1,
    reference: "PAY-001",
    idempotencyKey: "idem-001",
    enrollmentId: 10,
    amount: "250.00",
    currency: "USD",
    paymentDate: new Date("2026-08-10T14:30:00Z"),
    receivedById: 5,
    createdAt: new Date("2026-08-10T14:30:00Z"),
    enrollment: {
      id: 10,
      reference: "ENR-010",
      feeTotal: "1000.00",
      studentId: 3,
      programmeId: 2,
      student: {
        id: 3,
        studentUid: "STU-2026-003",
        fullName: "Jane Doe",
        email: "jane.doe@example.com",
      },
      programme: {
        id: 2,
        name: "Computer Science",
      },
    },
    receivedBy: {
      id: 5,
      name: "Registrar User",
      email: "registrar@example.com",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 1, role: 1 },
    });
  });

  it("returns payment details with enrollment and student information", async () => {
    (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValue(
      mockPayment,
    );

    const response = await GET(new Request("http://localhost/api/payments/1"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      id: 1,
      reference: "PAY-001",
      amount: "250.00",
      currency: "USD",
      enrollmentId: 10,
    });
    expect(body.data.enrollment.student.fullName).toBe("Jane Doe");
    expect(body.data.enrollment.programme.name).toBe("Computer Science");
    expect(prisma.paymentTransaction.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: expect.any(Object),
    });
  });

  it("returns 404 when payment does not exist", async () => {
    (prisma.paymentTransaction.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/payments/999"),
      { params: Promise.resolve({ id: "999" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Payment not found");
    expect(body.code).toBe("PAYMENT_NOT_FOUND");
  });

  it("rejects invalid payment ID format", async () => {
    const response = await GET(
      new Request("http://localhost/api/payments/invalid"),
      { params: Promise.resolve({ id: "invalid" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(prisma.paymentTransaction.findUnique).not.toHaveBeenCalled();
  });

  it("rejects negative payment ID", async () => {
    const response = await GET(
      new Request("http://localhost/api/payments/-1"),
      { params: Promise.resolve({ id: "-1" }) },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(prisma.paymentTransaction.findUnique).not.toHaveBeenCalled();
  });

  it("rejects zero payment ID", async () => {
    const response = await GET(new Request("http://localhost/api/payments/0"), {
      params: Promise.resolve({ id: "0" }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(prisma.paymentTransaction.findUnique).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    });

    const response = await GET(new Request("http://localhost/api/payments/1"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(401);
    expect(prisma.paymentTransaction.findUnique).not.toHaveBeenCalled();
  });

  it("requires staff role", async () => {
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json(
        { error: "Forbidden: insufficient permissions", code: "FORBIDDEN" },
        { status: 403 },
      ),
    });

    const response = await GET(new Request("http://localhost/api/payments/1"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(403);
    expect(prisma.paymentTransaction.findUnique).not.toHaveBeenCalled();
  });

  it("handles database errors gracefully", async () => {
    (prisma.paymentTransaction.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const response = await GET(new Request("http://localhost/api/payments/1"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
