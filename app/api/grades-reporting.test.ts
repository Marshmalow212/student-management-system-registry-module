import { GET as results } from "@/app/api/results/route";
import { GET as transcript } from "@/app/api/transcripts/route";
import { GET as report } from "@/app/api/reports/results/route";
import { calculateGrade } from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { requireAssessmentStaff, requireAuth } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    assessmentSubmission: { findMany: jest.fn(), count: jest.fn() },
    assessment: { count: jest.fn() },
    student: { findFirst: jest.fn(), findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/auth-guards", () => ({
  requireAuth: jest.fn(),
  requireAssessmentStaff: jest.fn(),
}));

const student = {
  id: 9,
  email: "student@example.com",
  name: "Student",
  role: 0,
  studentId: "S-9",
  isActive: true,
  createdAt: new Date(),
};
const staff = {
  id: 7,
  email: "staff@example.com",
  name: "Staff",
  role: 1,
  studentId: null,
  isActive: true,
  createdAt: new Date(),
};
const result = {
  id: 31,
  assessmentId: 11,
  studentId: 9,
  marks: "82.50",
  isPublished: true,
  gradedAt: new Date("2030-01-01"),
  publishedAt: new Date("2030-01-02"),
  assessment: {
    title: "Exam",
    subjectName: "Math",
    maxMarks: "100.00",
    programmeId: 3,
    programme: { name: "Science" },
  },
  student: { studentUid: "S-9", fullName: "Student" },
};

describe("grades, transcripts, and reporting API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockResolvedValue({ user: student });
    (requireAssessmentStaff as jest.Mock).mockResolvedValue({ user: staff });
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 9,
      programmeId: 3,
    });
    (prisma.assessmentSubmission.findMany as jest.Mock).mockResolvedValue([result]);
    (prisma.assessmentSubmission.count as jest.Mock).mockResolvedValue(1);
  });

  it("calculates rounded percentages and fixed classification bands", () => {
    expect(calculateGrade("79.995", "100")).toEqual({
      percentage: "80.00",
      classification: "A",
    });
    expect(calculateGrade("49.99", "100").classification).toBe("F");
  });

  it("forces student result reads to their own published rows and returns export-safe fields", async () => {
    const response = await results(
      new Request(
        "http://localhost/api/results?page=2&pageSize=5&studentId=99",
      ),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(prisma.assessmentSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 9, isPublished: true, resultStatus: 3 },
        skip: 5,
        take: 5,
      }),
    );
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        marks: "82.50",
        maxMarks: "100.00",
        percentage: "82.50",
        classification: "A",
      }),
    );
    expect(body.data[0].passwordHash).toBeUndefined();
  });

  it("returns an incomplete transcript when published assessments have no published result", async () => {
    (prisma.assessmentSubmission.findMany as jest.Mock).mockResolvedValue([result]);
    (prisma.assessment.count as jest.Mock).mockResolvedValue(2);
    (prisma.student.findUnique as jest.Mock).mockResolvedValue({
      id: 9,
      studentUid: "S-9",
      fullName: "Student",
      programme: { id: 3, name: "Science" },
    });
    const response = await transcript(
      new Request("http://localhost/api/transcripts"),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.status).toBe("INCOMPLETE");
    expect(body.data.results[0].classification).toBe("A");
  });

  it("rejects a student transcript request for another student", async () => {
    (prisma.student.findFirst as jest.Mock).mockResolvedValue({
      id: 9,
      programmeId: 3,
    });
    const response = await transcript(
      new Request("http://localhost/api/transcripts?studentId=10"),
    );

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("FORBIDDEN");
    expect(prisma.assessmentSubmission.findMany).not.toHaveBeenCalled();
  });

  it("requires a student selector for staff transcript requests", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ user: staff });
    const response = await transcript(
      new Request("http://localhost/api/transcripts"),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
  });

  it("rejects malformed report filters before querying", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ user: staff });
    const response = await results(
      new Request("http://localhost/api/results?page=0&pageSize=101"),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(prisma.assessmentSubmission.findMany).not.toHaveBeenCalled();
  });

  it("does not expose the report endpoint to students", async () => {
    (requireAssessmentStaff as jest.Mock).mockResolvedValue({
      user: null,
      error: Response.json({ code: "FORBIDDEN" }, { status: 403 }),
    });
    const response = await report(
      new Request("http://localhost/api/reports/results"),
    );
    expect(response.status).toBe(403);
    expect(prisma.assessmentSubmission.findMany).not.toHaveBeenCalled();
  });

  it("lets staff request a stable filtered report projection", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ user: staff });
    const response = await report(
      new Request(
        "http://localhost/api/reports/results?programmeId=3&studentId=9&pageSize=10",
      ),
    );
    expect(response.status).toBe(200);
    expect(prisma.assessmentSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isPublished: true,
          resultStatus: 3,
          assessment: { programmeId: 3 },
          studentId: 9,
        },
        take: 10,
      }),
    );
  });
});
