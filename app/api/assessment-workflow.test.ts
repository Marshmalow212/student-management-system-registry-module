import { POST as createAssessment } from "@/app/api/assessments/route";
import { PATCH as updateAssessment } from "@/app/api/assessments/[id]/route";
import { POST as submit } from "@/app/api/submissions/route";
import { POST as grade } from "@/app/api/results/route";
import { GET as results } from "@/app/api/results/route";
import { PATCH as publishResult } from "@/app/api/results/[id]/route";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAssessmentStaff } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    assessment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    programme: { findFirst: jest.fn() },
    student: { findFirst: jest.fn() },
    assessmentSubmission: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    studentEnrollment: { findFirst: jest.fn() },
    paymentTransaction: { aggregate: jest.fn() },
    userLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(),
  requireAssessmentStaff: jest.fn(),
}));

const staff = {
  id: 7,
  email: "staff@example.com",
  name: "Staff",
  role: 1,
  studentId: null,
  isActive: true,
  createdAt: new Date(),
};
const studentUser = {
  id: 9,
  email: "student@example.com",
  name: "Student",
  role: 0,
  studentId: "S-9",
  isActive: true,
  createdAt: new Date(),
};

describe("assessment workflow API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    (requireAssessmentStaff as jest.Mock).mockResolvedValue({ user: staff });
    (requireAuth as jest.Mock).mockResolvedValue({ user: studentUser });
    (prisma.programme.findFirst as jest.Mock).mockResolvedValue({ id: 3 });
    (prisma.assessmentSubmission.count as jest.Mock).mockResolvedValue(0);
    (prisma.assessment.create as jest.Mock).mockResolvedValue({
      id: 11,
      title: "Exam",
      subjectName: "Math",
      programmeId: 3,
      createdById: 7,
      dueDate: new Date("2030-01-01"),
      maxMarks: "100.00",
      status: "DRAFT",
      programme: { id: 3, name: "Science" },
    });
  });

  it("rejects malformed assessment input", async () => {
    const response = await createAssessment(
      new Request("http://localhost/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          title: "",
          programmeId: 3,
          dueDate: "bad",
          maxMarks: "0",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });

  it("creates drafts and publishes only through the valid transition", async () => {
    const created = await createAssessment(
      new Request("http://localhost/api/assessments", {
        method: "POST",
        body: JSON.stringify({
          title: "Exam",
          programmeId: 3,
          dueDate: "2030-01-01T00:00:00Z",
          maxMarks: "100",
        }),
      }),
    );
    expect(created.status).toBe(201);
    (prisma.assessment.findUnique as jest.Mock).mockResolvedValue({
      id: 11,
      createdById: 7,
      status: "DRAFT",
    });
    (prisma.assessment.update as jest.Mock).mockResolvedValue({
      id: 11,
      title: "Exam",
        maxMarks: "100.00",
        status: "OPEN",
    });
    const published = await updateAssessment(
      new Request("http://localhost/api/assessments/11", {
        method: "PATCH",
        body: JSON.stringify({ status: "OPEN" }),
      }),
      { params: Promise.resolve({ id: "11" }) },
    );
    expect(published.status).toBe(200);
    expect(prisma.assessment.update).toHaveBeenCalled();
  });

  it("closes published assessments and rejects reopening", async () => {
    (prisma.assessment.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 11, createdById: 7, status: "OPEN" })
      .mockResolvedValueOnce({ id: 11, createdById: 7, status: "CLOSED" });
    (prisma.assessment.update as jest.Mock).mockResolvedValue({
      id: 11,
      status: "CLOSED",
      maxMarks: "100.00",
    });

    const closed = await updateAssessment(
      new Request("http://localhost/api/assessments/11", {
        method: "PATCH",
        body: JSON.stringify({ status: "CLOSED" }),
      }),
      { params: Promise.resolve({ id: "11" }) },
    );
    const reopened = await updateAssessment(
      new Request("http://localhost/api/assessments/11", {
        method: "PATCH",
        body: JSON.stringify({ status: "OPEN" }),
      }),
      { params: Promise.resolve({ id: "11" }) },
    );

    expect(closed.status).toBe(200);
    expect(reopened.status).toBe(409);
    expect((await reopened.json()).code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("limits draft management to the author or elevated staff", async () => {
    (requireAssessmentStaff as jest.Mock).mockResolvedValue({
      user: { ...staff, id: 8, role: 1 },
    });
    (prisma.assessment.findUnique as jest.Mock).mockResolvedValue({
      id: 11,
      createdById: 7,
      status: "DRAFT",
    });

    const response = await updateAssessment(
      new Request("http://localhost/api/assessments/11", {
        method: "PATCH",
        body: JSON.stringify({ title: "Changed" }),
      }),
      { params: Promise.resolve({ id: "11" }) },
    );

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("FORBIDDEN");
    expect(prisma.assessment.update).not.toHaveBeenCalled();
  });

  it("blocks a student outside the programme and after the deadline", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 4,
      programmeId: 99,
      status: 1,
      enrollments: [{ programmeId: 99 }],
    });
    (prisma.assessmentSubmission.count as jest.Mock).mockResolvedValue(0);
    (prisma.assessment.findUnique as jest.Mock).mockResolvedValue({
      id: 11,
      programmeId: 3,
      status: "OPEN",
      dueDate: new Date("2030-01-01"),
    });
    const response = await submit(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({ student_id: 4, programme_id: 3, assessment_id: 11, file_path: "/uploads/work.pdf" }),
      }),
    );
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("FORBIDDEN");
  });

  it("maps duplicate submissions to a conflict", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 4,
      programmeId: 3,
      status: 1,
      enrollments: [{ programmeId: 3 }],
    });
    (prisma.assessment.findUnique as jest.Mock).mockResolvedValue({
      id: 11,
      programmeId: 3,
      status: "OPEN",
      dueDate: new Date("2030-01-01"),
    });
    (prisma.assessmentSubmission.create as jest.Mock).mockRejectedValue({
      code: "P2002",
    });
    const response = await submit(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({ student_id: 4, programme_id: 3, assessment_id: 11, file_path: "/uploads/work.pdf" }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("SUBMISSION_EXISTS");
  });

  it("rejects submissions after the deadline", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 4,
      programmeId: 3,
      status: 1,
      enrollments: [{ programmeId: 3 }],
    });
    (prisma.assessment.findUnique as jest.Mock).mockResolvedValue({
      id: 11,
      programmeId: 3,
      status: "OPEN",
      dueDate: new Date("2020-01-01"),
    });

    const response = await submit(
      new Request("http://localhost/api/submissions", {
        method: "POST",
        body: JSON.stringify({ student_id: 4, programme_id: 3, assessment_id: 11, file_path: "/uploads/work.pdf" }),
      }),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("DEADLINE_PASSED");
    expect(prisma.assessmentSubmission.create).not.toHaveBeenCalled();
  });

  it("shows students only published results", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 4,
      programmeId: 3,
      status: 1,
      enrollments: [{ programmeId: 3 }],
    });
    (prisma.assessmentSubmission.findMany as jest.Mock).mockResolvedValue([]);
    const response = await results(new Request("http://localhost/api/results"));
    expect(response.status).toBe(200);
    expect(prisma.assessmentSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: 4, isPublished: true, resultStatus: 3 } }),
    );
  });

  it("rejects grades above the assessment maximum", async () => {
    (prisma.assessmentSubmission.findUnique as jest.Mock).mockResolvedValue({
      id: 25,
      studentId: 4,
      assessmentId: 11,
      assessment: { maxMarks: "100.00" },
    });
    const response = await grade(
      new Request("http://localhost/api/results", {
        method: "POST",
        body: JSON.stringify({ submissionId: 25, marks: "100.01" }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("MARKS_EXCEED_MAX");
    expect(prisma.assessmentSubmission.update).not.toHaveBeenCalled();
  });

  it("rejects malformed and negative marks before persistence", async () => {
    const malformed = await grade(
      new Request("http://localhost/api/results", {
        method: "POST",
        body: JSON.stringify({ submissionId: 25, marks: "1.234" }),
      }),
    );
    const negative = await grade(
      new Request("http://localhost/api/results", {
        method: "POST",
        body: JSON.stringify({ submissionId: 25, marks: "-1" }),
      }),
    );

    expect(malformed.status).toBe(400);
    expect(negative.status).toBe(400);
    expect(prisma.assessmentSubmission.findUnique).not.toHaveBeenCalled();
  });

  it("returns a flattened, derived grade projection after grading", async () => {
    (prisma.assessmentSubmission.findUnique as jest.Mock).mockResolvedValue({
      id: 25,
      studentId: 4,
      assessmentId: 11,
      assessment: { maxMarks: "100.00" },
    });
    (prisma.assessmentSubmission.update as jest.Mock).mockResolvedValue({
      id: 31,
      assessmentId: 11,
      studentId: 4,
      marks: "82.50",
      isPublished: false,
      gradedAt: new Date("2030-01-01"),
      publishedAt: null,
      assessment: {
        title: "Exam",
        subjectName: "Math",
        maxMarks: "100.00",
        programmeId: 3,
        programme: { name: "Science" },
      },
      student: { studentUid: "S-4", fullName: "Student" },
    });

    const response = await grade(
      new Request("http://localhost/api/results", {
        method: "POST",
        body: JSON.stringify({ submissionId: 25, marks: "82.50" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual(
      expect.objectContaining({
        marks: "82.50",
        maxMarks: "100.00",
        percentage: "82.50",
        classification: "A",
        isPublished: false,
      }),
    );
    expect(body.data.assessment).toBeUndefined();
    expect(body.data.student).toBeUndefined();
  });

  it("publishes a graded result once and records decimal marks as strings", async () => {
    (prisma.assessmentSubmission.findUnique as jest.Mock).mockResolvedValue({
      id: 31,
      studentId: 4,
      assessment: { programmeId: 3 },
      student: { hasOverdueBalance: false },
      isPublished: false,
      resultStatus: 1,
    });
    (prisma.studentEnrollment.findFirst as jest.Mock).mockResolvedValue({
      id: 50,
      feeTotal: "100.00",
      dueDate: null,
    });
    (prisma.paymentTransaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: "100.00" },
    });
    (prisma.assessmentSubmission.update as jest.Mock).mockResolvedValue({
      id: 31,
      assessmentId: 11,
      studentId: 4,
      marks: "82.50",
      classification: "A",
      isPublished: true,
      publishedAt: new Date("2030-01-02"),
    });

    const published = await publishResult(
      new Request("http://localhost/api/results/31", {
        method: "PATCH",
        body: "{}",
      }),
      { params: Promise.resolve({ id: "31" }) },
    );
    expect(published.status).toBe(200);
    expect((await published.json()).data.marks).toBe("82.50");

    (prisma.assessmentSubmission.findUnique as jest.Mock).mockResolvedValue({
      id: 31,
      studentId: 4,
      assessment: { programmeId: 3 },
      student: { hasOverdueBalance: true },
      isPublished: true,
      resultStatus: 3,
    });
    const duplicate = await publishResult(
      new Request("http://localhost/api/results/31", {
        method: "PATCH",
        body: "{}",
      }),
      { params: Promise.resolve({ id: "31" }) },
    );
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).code).toBe("RESULT_ALREADY_PUBLISHED");
  });

  it("places graded results on hold when the student has fee dues", async () => {
    (prisma.assessmentSubmission.findUnique as jest.Mock).mockResolvedValue({
      id: 31,
      studentId: 4,
      assessment: { programmeId: 3 },
      student: { hasOverdueBalance: true },
      isPublished: false,
      resultStatus: 1,
    });
    (prisma.studentEnrollment.findFirst as jest.Mock).mockResolvedValue({
      id: 50,
      feeTotal: "100.00",
      dueDate: new Date("2020-01-01"),
    });
    (prisma.paymentTransaction.aggregate as jest.Mock).mockResolvedValue({
      _sum: { amount: "25.00" },
    });

    const response = await publishResult(
      new Request("http://localhost/api/results/31", {
        method: "PATCH",
        body: "{}",
      }),
      { params: Promise.resolve({ id: "31" }) },
    );

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("RESULT_ON_HOLD");
    expect(prisma.assessmentSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ resultStatus: 2, isPublished: false }),
      }),
    );
  });
});
