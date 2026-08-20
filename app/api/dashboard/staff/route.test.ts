import { GET } from "@/app/api/dashboard/staff/route";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-guards";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    assessment: { count: jest.fn() },
    assessmentSubmission: { count: jest.fn() },
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireStaff: jest.fn() }));

describe("staff dashboard API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireStaff as jest.Mock).mockResolvedValue({ user: { id: 7, role: 1 } });
    (prisma.assessment.count as jest.Mock).mockResolvedValueOnce(4).mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    (prisma.assessmentSubmission.count as jest.Mock).mockResolvedValue(9);
  });

  it("returns counts scoped to the authenticated staff member", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      assessmentCount: 4,
      submissionCount: 9,
      publishedAssessmentCount: 2,
      pendingResultAssessmentCount: 1,
    });
    expect(prisma.assessment.count).toHaveBeenNthCalledWith(1, { where: { createdById: 7 } });
    expect(prisma.assessmentSubmission.count).toHaveBeenCalledWith({
      where: { assessment: { createdById: 7 } },
    });
  });

  it("rejects unauthenticated users", async () => {
    (requireStaff as jest.Mock).mockResolvedValue({ user: null, error: Response.json({ code: "UNAUTHORIZED" }, { status: 401 }) });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(prisma.assessment.count).not.toHaveBeenCalled();
  });
});
