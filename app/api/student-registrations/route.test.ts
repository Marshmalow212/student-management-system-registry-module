import { POST } from "@/app/api/student-registrations/route";
import { requireRegistrar } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    programme: { findFirst: jest.fn(), updateMany: jest.fn() },
    student: { create: jest.fn() },
    studentEnrollment: { findFirst: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireRegistrar: jest.fn() }));

const payload = {
  fullName: " Ada Lovelace ",
  dateOfBirth: "2000-12-10",
  programmeId: 4,
};

const programme = {
  id: 4,
  fee: "1250.00",
  discount: "100.00",
  coupon: "SAVE100",
  couponLimit: 2,
};

function request(body: unknown = payload) {
  return new Request("http://localhost/api/student-registrations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("student registration API", () => {
  let studentId = 10;

  beforeEach(() => {
    jest.clearAllMocks();
    studentId = 10;
    jest.useFakeTimers().setSystemTime(new Date("2026-08-18T12:00:00Z"));
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: { id: 7, role: 2 },
    });
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue(programme);
    (prisma.studentEnrollment.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.programme.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.student.create as jest.Mock).mockImplementation(async (args) => ({
      id: studentId++,
      ...args.data,
      createdAt: new Date(),
    }));
    (prisma.studentEnrollment.create as jest.Mock).mockImplementation(
      async (args) => ({ id: 20, ...args.data, status: "ACTIVE", createdAt: new Date() }),
    );
  });

  afterEach(() => jest.useRealTimers());

  it("creates a student and initial enrolment with generated identity, year, and fee snapshots", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.student).toMatchObject({
      fullName: "Ada Lovelace",
      email: "sms_2026_40001@example.edu",
      academicYear: 2026,
      programmeId: 4,
    });
    expect(body.data.student.studentUid).toMatch(/^SMS-2026-/);
    expect(body.data.enrollment).toMatchObject({
      enrolledYear: 2026,
      feeSnapshot: "1250.00",
      discountSnapshot: "100.00",
      feeTotal: "1150.00",
    });
    expect(body.data.enrollment.reference).toMatch(/^ENR-/);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.programme.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { couponUsed: { increment: 1 } } }),
    );
  });

  it("generates distinct student UIDs and enrolment references for separate registrations", async () => {
    (prisma.studentEnrollment.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ student: { studentUid: "SMS-2026-40001" } });
    const first = await POST(request());
    const second = await POST(
      request({ ...payload, fullName: "Grace Hopper" }),
    );

    const [firstBody, secondBody] = await Promise.all([
      first.json(),
      second.json(),
    ]);
    expect(firstBody.data.student.studentUid).not.toBe(
      secondBody.data.student.studentUid,
    );
    expect(firstBody.data.enrollment.reference).not.toBe(
      secondBody.data.enrollment.reference,
    );
  });

  it("looks up the selected active programme before creating the student", async () => {
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue(null);
    const response = await POST(request());

    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("PROGRAMME_NOT_FOUND");
    expect(prisma.student.create).not.toHaveBeenCalled();
    expect(prisma.studentEnrollment.create).not.toHaveBeenCalled();
  });

  it("rejects invalid programme discounts without making writes", async () => {
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({
      ...programme,
      fee: "50.00",
      discount: "100.00",
    });
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("INVALID_PROGRAMME_DISCOUNT");
    expect(prisma.student.create).not.toHaveBeenCalled();
    expect(prisma.programme.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an exhausted coupon and does not create an enrolment", async () => {
    (prisma.programme.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("COUPON_EXHAUSTED");
    expect(prisma.studentEnrollment.create).not.toHaveBeenCalled();
  });

  it("maps duplicate student identities to a conflict", async () => {
    (prisma.student.create as jest.Mock).mockRejectedValue({ code: "P2002" });
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("STUDENT_EXISTS");
    expect(prisma.programme.updateMany).not.toHaveBeenCalled();
  });

  it("rolls back coupon claims when initial enrolment creation conflicts", async () => {
    (prisma.studentEnrollment.create as jest.Mock).mockRejectedValue({
      code: "P2002",
    });
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("STUDENT_EXISTS");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.programme.updateMany).toHaveBeenCalledTimes(1);
  });

  it("rejects client-supplied user IDs and academic years before persistence", async () => {
    const response = await POST(
      request({ ...payload, userId: 99, academicYear: 2020 }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    { error: "Unauthorized", code: "UNAUTHORIZED", status: 401 },
    { error: "Forbidden", code: "FORBIDDEN", status: 403 },
  ])("enforces registrar/admin authorization for $status responses", async (body) => {
    (requireRegistrar as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json(body, { status: body.status }),
    });

    const response = await POST(request());
    expect(response.status).toBe(body.status);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
