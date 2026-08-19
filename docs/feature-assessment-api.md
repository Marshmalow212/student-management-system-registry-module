# Assessment Workflow API

## Scope and BRS

This API supports the redesigned programme-owned assessment workflow: staff create drafts, open and close assessments, review and grade submissions, and publish results; students submit or resubmit work under deadline, extended-deadline, and staff-configured resubmission rules. Fee status is part of result publication: dues place results on hold until cleared or overridden by authorized staff.

There is no module/course entity in the current registry. `subjectName` is therefore an optional scalar on `Assessment`. Introducing a `Module` model now would add speculative ownership and enrolment rules; it can be added later with a migration and a compatibility rule for existing subject names.

## Data model

- `Assessment`: title, programme, module name, deadline, optional extended deadline, total marks, highest grade, author, resubmission limit, and `DRAFT | OPEN | CLOSED | RESULT` status.
- `StudentAssessment`: one student/assessment record containing marks, grade, result status, submission status, submitted time, and resubmission count.
- `AssessmentSubmission.file_path`: public path returned by the uploader and persisted as a string. A resubmission replaces this path and the existing stored file.
- Result status: `PENDING`, `IN_PROGRESS`, `ON_HOLD`, or `PUBLISHED`.
- All assessment foreign keys use `RESTRICT`. Indexes cover programme/status/deadline, author/status, student history, assessment status, and publication visibility.

Attachments use a two-step contract. The client uploads a PDF to `/api/submissions/file-upload`, receives a public `file_path`, then submits `student_id`, `programme_id`, `assessment_id`, and `file_path` to `/api/submissions`. The server cross-checks all identity and ownership values before finalization. Replacement must not delete the previous valid file until the new upload succeeds.

## Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/assessments` | Authenticated | Staff list; students see non-draft assessments for their programme |
| POST | `/api/assessments` | Staff | Create a draft for an active programme |
| GET | `/api/assessments/:id` | Authenticated | Safe detail; students only see non-draft assessments for their programme |
| PATCH | `/api/assessments/:id` | Author, Registrar, Admin | Edit draft; open or close a valid lifecycle state |
| POST | `/api/submissions/file-upload` | Student | Validate and store one PDF upload; return a public `file_path` |
| POST | `/api/submissions` | Student | Finalize a submission or permitted resubmission after integrity checks |
| GET | `/api/submissions` | Authenticated | Students see their own submissions; staff see submissions, optionally by assessment |
| POST | `/api/results` | Staff | Grade a submission |
| GET | `/api/results` | Authenticated | Staff see results; students see only their published results |
| PATCH | `/api/results/:id` | Staff | Publish a graded result |

Create assessment request:

```json
{"title":"Midterm","subjectName":"Algebra","programmeId":3,"dueDate":"2030-01-01T00:00:00Z","maxMarks":"100.00"}
```

Upload request:

`multipart/form-data` with field `assessmentFile`.

Upload response:

```json
{"data":{"file_path":"/uploads/opaque-file.pdf","fileName":"work.pdf","contentType":"application/pdf","sizeBytes":12000}}
```

Submission request:

```json
{"student_id":4,"programme_id":3,"assessment_id":11,"file_path":"/uploads/opaque-file.pdf"}
```

Grade request:

```json
{"submissionId":25,"marks":"82.50","classification":"A"}
```

Successful responses use `{ "data": ... }`; list responses additionally include `{ "pagination": ... }`. Decimal marks are strings. Projections exclude credentials, OTP fields, passwords, and storage secrets.

## Workflow and authorization

`DRAFT -> OPEN -> CLOSED -> RESULT` is the application lifecycle. Non-draft content cannot be edited, and closed/result assessments cannot be reopened. Students require an authenticated student profile linked by `User.studentId`/`Student.studentUid` or `Student.userId`; the profile programme must match the assessment. The API enforces open/extended deadlines and the staff-configured resubmission limit. A resubmission requires `resubmission_limit > 0`, available attempts, and a request before the extended deadline; it updates the existing submission and replaces `file_path` and the stored file.

Grades are rejected when negative, malformed, or greater than `maxMarks`. A submission is marked `GRADED` in the same transaction as result creation. Results start pending or in progress. Publishing checks fee dues: no dues sets result status to `PUBLISHED`; dues set it to `ON_HOLD`. Authorized staff may publish an on-hold result once dues are cleared. Student queries expose only published results. Publishing is idempotency-protected by rejecting an already-published result.

## Status codes and audit

`400 VALIDATION_ERROR` covers malformed IDs, dates, marks, filters, filenames, MIME types, file sizes, or attachment metadata. `401 UNAUTHORIZED` covers missing sessions. `403 FORBIDDEN` covers student/programme mismatch, file-path ownership mismatch, or insufficient staff access. `404` codes identify missing programmes, assessments, students, submissions, results, or files. `409` codes include `INVALID_STATUS_TRANSITION`, `ASSESSMENT_NOT_EDITABLE`, `ASSESSMENT_NOT_OPEN`, `DEADLINE_PASSED`, `RESUBMISSION_LIMIT_REACHED`, `FILE_PATH_MISMATCH`, `RESULT_EXISTS`, `MARKS_EXCEED_MAX`, `RESULT_ON_HOLD`, and `RESULT_ALREADY_PUBLISHED`. Unexpected persistence failures return `500 INTERNAL_ERROR`.

Writes create `ASSESSMENT_CREATED`, `ASSESSMENT_UPDATED`, `ASSESSMENT_PUBLISHED`, `SUBMISSION_CREATED`, `RESULT_GRADED`, or `RESULT_PUBLISHED` `UserLog` rows. Audit metadata contains internal IDs only.

## Migration, dependencies, and handoff

Migration: `prisma/migrations/20260817170000_assessment_workflow/migration.sql`. The schema must be redesigned to add module/deadline/resubmission/result-status fields, persist `file_path`, and replace legacy lifecycle values before deployment. Regenerate Prisma types after migration and apply with `npx prisma migrate deploy` when PostgreSQL is reachable.

UI consumers should use the existing Axios client and Redux thunks, read `response.data.data`, treat marks as strings, send `student_id`, `programme_id`, and `assessment_id` with the uploader-returned `file_path`, distinguish the listed conflict codes, and model upload and submission as separate states. Reporting, aggregate analytics, transcript calculations, and notifications remain outside this feature.