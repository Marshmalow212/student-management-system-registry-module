import { GET, PATCH } from "@/app/api/enrollments/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    studentEnrollment: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    student: { update: jest.fn() },
    assessment: { findMany: jest.fn() },
    paymentTransaction: { aggregate: jest.fn() },
    userLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireRegistrar: jest.fn() }));

const enrollment = {
  id: 9,
  reference: "ENR-9",
  studentId: 4,
  programmeId: 2,
  enrolledYear: 2026,
  status: 1,
  feeTotal: "100.00",
  dueDate: null,
  student: {
    id: 4,
    studentUid: "STU-4",
    fullName: "Test Student",
    email: "student@example.com",
  },
  programme: { id: 2, name: "Computing" },
};

describe("enrolment detail and lifecycle API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 7, role: 2 },
    });
    (prisma.paymentTransaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: "25.00" },
    });
    (prisma.studentEnrollment.findUnique as jest.Mock).mockResolvedValue(
      enrollment,
    );
    (prisma.studentEnrollment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.assessment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    (prisma.studentEnrollment.update as jest.Mock).mockResolvedValue({
      ...enrollment,
      status: 2,
    });
  });

  it("returns the authoritative detail with a derived balance", async () => {
    const response = await GET(
      new Request("http://localhost/api/enrollments/9"),
      { params: Promise.resolve({ id: "9" }) },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      id: 9,
      feeTotal: "100.00",
      balance: { paid: "25.00", balance: "75.00" },
    });
  });

  it("updates an active enrolment lifecycle and records an audit event", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/enrollments/9", {
        method: "PATCH",
        body: JSON.stringify({ status: 2 }),
      }),
      { params: Promise.resolve({ id: "9" }) },
    );
    expect(response.status).toBe(200);
    expect(prisma.studentEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 2 } }),
    );
    expect(prisma.userLog.create).toHaveBeenCalled();
  });

  it("blocks cancellation after a payment is recorded", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/enrollments/9", {
        method: "PATCH",
        body: JSON.stringify({ status: 0 }),
      }),
      { params: Promise.resolve({ id: "9" }) },
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("ENROLLMENT_HAS_PAYMENTS");
    expect(prisma.studentEnrollment.update).not.toHaveBeenCalled();
  });
});
