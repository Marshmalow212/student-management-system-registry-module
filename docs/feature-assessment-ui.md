# Assessment Workflow UI

## Workflows

Staff use `/dashboard/assessments` to search and filter assessments, inspect safe details, create and edit drafts, open or close assessments, review submissions, grade them, and publish results. Students use `/student/assessments` to view assessments for their programme, submit or resubmit work within the configured deadlines and staff limit, inspect submission/result status, and view results only when published.

The lifecycle is `DRAFT -> OPEN -> CLOSED -> RESULT`. Draft fields are editable only while draft. Opening and closing are explicit actions and are disabled locally when the lifecycle does not permit them; the API remains authoritative. Result states include pending, in progress, on hold, and published. On-hold results explain that fee dues must be cleared or an authorized staff override applied.

## Validation and state

Forms mirror the redesigned assessment fields: programme, module, deadline, extended deadline, total marks, highest grade, and resubmission limit. Marks remain strings. Submission uses separate upload and finalize states: selecting a file validates PDF type, filename, and size; upload progress and retry are visible; the uploader returns a public `file_path`; finalization sends `student_id`, `programme_id`, and `assessment_id` with that path; resubmission count and remaining attempts are visible.

Loading uses skeleton rows. Empty catalogues, closed deadlines, exhausted resubmission limits, upload progress, upload failure, existing submissions, ungraded results, and on-hold results have explicit states. Saving/uploading disables conflicting actions. API codes map to accessible alerts for unauthorized, forbidden, validation, missing assessment/file, invalid lifecycle, closed assessment, deadline passed, resubmission limit, file-path mismatch, invalid PDF, oversized file, fee hold, duplicate result, marks over maximum, already-published result, and server failure.

## Permissions and accessibility

Route shells require the existing session helper and staff/student role. The API enforces programme ownership, permitted staff management, student ownership, deadlines, resubmission limits, upload ownership, and result visibility. No credentials, tokens, OTPs, signed URLs, or attachment contents are held in Redux or component state. Temporary upload progress and the returned public `file_path` may be held until finalization, then the upload state must be cleared.

Search and filters have labels, form errors use `aria-invalid` and alert text, mutations expose `role="alert"`, status updates use `role="status"`, and assessment rows are keyboard reachable with Enter. Badges supplement text rather than conveying state alone.

## API boundary and handoff

The target UI uses `AxiosInstance` through Redux async thunks for catalogue/detail loading, upload, submission/resubmission, grading, and publication. Successful payloads are read from `response.data.data`. The submission thunk sends `student_id`, `programme_id`, `assessment_id`, and the uploader-returned public `file_path`. It calls `/api/assessments`, `/api/assessments/:id`, `/api/submissions/file-upload`, `/api/submissions`, `/api/results`, and `/api/results/:id`. The current page still uses local Axios/state and the upload control currently shows a placeholder attachment state, so upload progress, replacement safety, server validation, and Redux wiring remain implementation work. Browser tests should cover the upload-to-submission and resubmission-replacement flows once component test setup is available.