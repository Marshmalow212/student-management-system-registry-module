import {
  canCreateEnrollment,
  isAssessmentEligible,
  StudentEnrollmentStatus,
  studentEnrollmentStatusLabel,
} from "@/lib/student-status";

describe("student enrollment status contract", () => {
  it("uses the shared numeric values and labels", () => {
    expect(StudentEnrollmentStatus).toEqual({
      WITHDRAWN: 0,
      ENROLLED: 1,
      COMPLETED: 2,
      DEFERRED: 3,
    });
    expect(studentEnrollmentStatusLabel(3)).toBe("Deferred");
  });

  it("allows a new enrollment only after completed or withdrawn history", () => {
    expect(canCreateEnrollment([])).toBe(true);
    expect(canCreateEnrollment([2, 0])).toBe(true);
    expect(canCreateEnrollment([1])).toBe(false);
    expect(canCreateEnrollment([3])).toBe(false);
  });

  it("only treats enrolled students as assessment eligible", () => {
    expect(isAssessmentEligible(1)).toBe(true);
    expect(isAssessmentEligible(0)).toBe(false);
    expect(isAssessmentEligible(2)).toBe(false);
    expect(isAssessmentEligible(3)).toBe(false);
  });
});
