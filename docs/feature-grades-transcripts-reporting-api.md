# Grades, Transcripts, and Reporting API

## Scope

This feature adds read APIs over the existing `AssessmentSubmission`, `Assessment`, `Student`, `Programme`, and `StudentEnrollment` models. `AssessmentSubmission` remains the authoritative per-assessment result and submission record; no separate result table exists. Attendance, scheduling, notifications, staff administration, audit UI, and PDF generation are outside the scope.

## Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/results` | Authenticated | Published result rows. Students receive only their own rows; staff may filter by `programmeId` or `studentId`. |
| GET | `/api/transcripts` | Authenticated | One student's published transcript and aggregate summary. Students are forced to their own profile; staff must provide `studentId`. |
| GET | `/api/reports/results` | Staff | Export-friendly published result rows with the same pagination and filters as `/api/results`. |

Successful list responses use `{ data, pagination }`; transcript responses use `{ data: { student, status, summary, results } }`. Decimal values are strings. Result rows include assessment and programme names, marks, maximum marks, percentage, letter classification, publication timestamps, and safe student identity fields. Password hashes, sessions, OTP data, attachment metadata, and grader credentials are never projected.

Query parameters for result/report lists are `page` (default 1), `pageSize` (default 20, maximum 100), `programmeId`, and `studentId`. Transcript accepts `studentId` for staff only. There is no academic-period field in the current model, so no unsupported academic-year filter is advertised.

## Calculation rules

- Percentage is `marks / maxMarks * 100`, rounded to two decimal places using decimal-safe numeric conversion at the API boundary and returned as a two-decimal string.
- `A` is 80-100, `B` is 70-79.99, `C` is 60-69.99, `D` is 50-59.99, and `F` is below 50.
- The API derives `percentage` and `classification` from marks and `maxMarks`; the legacy nullable stored `classification` is not treated as authoritative.
- Marks remain strings in requests and responses and are constrained by the existing grade route to non-negative values with at most two decimals and no value above `maxMarks`.
- Unpublished or missing results are omitted from every student and reporting response. A transcript is `NO_RESULTS` when it has no published rows, `INCOMPLETE` when fewer published programme assessments have results than expected, and `COMPLETE` otherwise. Ungraded assessments therefore never appear as fabricated zeroes.

## Authorization and errors

Students must have a linked active profile and can only read their own published rows. A student attempting another transcript returns `403 FORBIDDEN`; a missing profile returns `404 STUDENT_NOT_FOUND`. `/api/reports/results` requires staff authorization. Malformed filters return `400 VALIDATION_ERROR`; missing staff transcript students return `400`; missing staff transcript profiles return `404 STUDENT_NOT_FOUND`; unexpected database failures return `500 INTERNAL_ERROR`.

Staff filtering is programme/student scoped through the existing staff guard and Prisma relations. Stable ordering is newest grading time then result ID for result/report lists, and grading time then result ID ascending for transcripts.

## Export boundary and dependencies

The reporting endpoint returns structured JSON suitable for CSV, spreadsheet, or a future document adapter. It deliberately does not select a PDF provider, create files, expose signed URLs, or add an export job model. A future adapter can consume the documented response without changing result authority or privacy rules.

The existing assessment publication route remains the visibility gate. Focused tests cover grade bands and rounding, published-only student access, transcript incomplete state, staff report authorization, safe projections, and regression publication behavior. Prisma schema changes are not required for this feature.