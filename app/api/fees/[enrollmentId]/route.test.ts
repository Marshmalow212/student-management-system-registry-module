import { GET } from "@/app/api/fees/[enrollmentId]/route";
import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    studentEnrollment: { findUnique: jest.fn() },
    paymentTransaction: { aggregate: jest.fn() },
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireRegistrar: jest.fn() }));

describe("fee balance API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 1, role: 1 },
    });
  });

  it("reports a decimal-safe balance and overdue state", async () => {
    (prisma.studentEnrollment.findUnique as jest.Mock).mockResolvedValue({
      id: 9,
      feeTotal: "100.00",
      dueDate: new Date("2020-01-01"),
    });
    (prisma.paymentTransaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: "40.10" },
    });
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ enrollmentId: "9" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      feeTotal: "100.00",
      paid: "40.10",
      balance: "59.90",
      overdue: true,
    });
  });

  it("does not expose a balance for a missing enrolment", async () => {
    (prisma.studentEnrollment.findUnique as jest.Mock).mockResolvedValue(null);
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ enrollmentId: "9" }),
    });
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("ENROLLMENT_NOT_FOUND");
  });
});
