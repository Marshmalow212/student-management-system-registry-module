import type { GradeResult } from "./grades-page"

const columns: Array<keyof GradeResult> = [
  "studentUid",
  "studentName",
  "programmeName",
  "assessmentTitle",
  "subjectName",
  "marks",
  "maxMarks",
  "percentage",
  "classification",
  "gradedAt",
  "publishedAt",
]

function csvValue(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value)
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function resultsToCsv(results: GradeResult[]) {
  return [
    columns.join(","),
    ...results.map((result) => columns.map((column) => csvValue(result[column])).join(",")),
  ].join("\n")
}

export function downloadResultsCsv(results: GradeResult[]) {
  const blob = new Blob([resultsToCsv(results)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "published-results.csv"
  anchor.click()
  URL.revokeObjectURL(url)
}