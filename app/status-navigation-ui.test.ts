import { getNavigationForRole } from "@/components/app-sidebar"

describe("role-aware navigation", () => {
  it("limits Staff to academic assessment work", () => {
    const labels = getNavigationForRole(1).navMain.flatMap((item) => [item.title, ...item.items.map((child) => child.title)])
    expect(labels).toContain("Assessments")
    expect(labels).not.toContain("Enrollment")
    expect(labels).not.toContain("Payments")
  })

  it("gives Registrars registration, enrollment, and payment work", () => {
    const labels = getNavigationForRole(2).navMain.flatMap((item) => [item.title, ...item.items.map((child) => child.title)])
    expect(labels).toEqual(expect.arrayContaining(["Students", "Programmes", "Enrollment", "Payments"]))
    expect(labels).not.toContain("Assessments")
  })

  it("keeps student navigation academic and financial read-only", () => {
    const labels = getNavigationForRole(0).navMain.flatMap((item) => [item.title, ...item.items.map((child) => child.title)])
    expect(labels).toEqual(expect.arrayContaining(["My Assessments", "My Results", "My Transcript", "My Payments"]))
    expect(labels).not.toContain("Enrollment")
  })
})
