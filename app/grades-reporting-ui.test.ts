import { resultsToCsv } from "@/components/feature/grades/export-results"

describe("grades reporting UI contracts", () => {
  it("exports only safe structured result fields with decimal strings intact", () => {
    const csv = resultsToCsv([{
      id: 1, assessmentId: 2, assessmentTitle: "Final, Exam", subjectName: "Math", studentId: 3,
      studentUid: "S-3", studentName: "Student", programmeId: 4, programmeName: "Science", marks: "79.995",
      maxMarks: "100.00", percentage: "80.00", classification: "A", isPublished: true,
      gradedAt: "2030-01-01T00:00:00.000Z", publishedAt: "2030-01-02T00:00:00.000Z",
    }])
    expect(csv).toContain('"Final, Exam"')
    expect(csv).toContain("79.995")
    expect(csv).not.toContain("passwordHash")
  })

  it("neutralizes spreadsheet formulas in exported identity fields", () => {
    const csv = resultsToCsv([{
      id: 1, assessmentId: 2, assessmentTitle: "Exam", subjectName: "Math", studentId: 3,
      studentUid: "=HYPERLINK(\"https://example.test\")", studentName: "@import", programmeId: 4,
      programmeName: "Science", marks: "80.00", maxMarks: "100.00", percentage: "80.00",
      classification: "A", isPublished: true, gradedAt: "2030-01-01T00:00:00.000Z", publishedAt: null,
    }])

    expect(csv).toContain("'=HYPERLINK")
    expect(csv).toContain("'@import")
  })
})