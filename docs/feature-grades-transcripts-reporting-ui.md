# Grades, Transcripts, and Reporting UI

## Functional flows

- Students open `/student/results`, review their published result rows, and load their own transcript summary.
- Staff open `/dashboard/reports/results`, filter the published report by `programmeId` and `studentId`, page through results, load an authorized transcript, and export the visible structured report rows as CSV.
- Result rows show assessment, subject, marks/max marks, two-decimal percentage, derived letter classification, and publication time.

## Calculations and permissions

The UI displays `marks`, `maxMarks`, `percentage`, and transcript totals as strings from the API. It does not recalculate grades or treat stored classifications as authoritative. Classification and aggregate calculations remain API responsibilities. Student routes call `/api/results` and `/api/transcripts` without accepting a student selector, and filter any unexpected unpublished row before rendering. Staff routes use `/api/reports/results` and `/api/transcripts?studentId=...`; route shells require an authenticated staff role.

The API's fixed newest-grading-first ordering is displayed as-is. No academic-year or unsupported sort filter is advertised.

## Filters and export

Result/report requests send `page`, `pageSize` (20, 50, or 100), and optional numeric `programmeId` and staff-only `studentId`. The CSV action consumes the authorized report response already in memory and includes only safe projected fields. It is an adapter boundary for future spreadsheet/document providers; it does not create PDFs, signed URLs, jobs, or expose unpublished data.

## Accessibility and states

Loading uses skeleton rows, errors use `role="alert"`, and transcript status uses `role="status"`. Empty published results, `NO_RESULTS`, and `INCOMPLETE` transcripts are explicit. API `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `STUDENT_NOT_FOUND`, and `INTERNAL_ERROR` codes receive user-facing messages. Inputs and actions have accessible labels; tables retain header cells and pagination actions are disabled at their boundaries.

## API boundary

All requests use `AxiosInstance` from `lib/axios-client.ts`. The UI expects `{ data, pagination }` for results/reports and `{ data: { student, status, summary, results } }` for transcripts. No Prisma or schema changes are required. Component-level browser tests are not added because the project currently has no React Testing Library dependency or jsdom test environment; the focused CSV contract test runs under the existing Jest setup.