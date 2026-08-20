# Assessments and Submissions

## Staff flow

Staff use `/dashboard/assessments` to create draft programme assessments, open or close them, review submissions, grade submissions, and publish individual or bulk results. Assessments are programme-scoped and use status values `0 Draft`, `1 Open`, `2 Closed`, `3 Result`.

## Student flow

Students use `/student/assessments` to view assessments for their enrolled programme. They upload a PDF through `/api/submissions/file-upload`, then finalize with `POST /api/submissions`. Resubmission is allowed only within the deadline rules and configured limit. Students can view published results only.

## API

- `GET/POST /api/assessments`
- `GET/PATCH /api/assessments/:id`
- `GET/POST /api/submissions`
- `POST /api/submissions/file-upload`
- `GET/POST /api/results`
- `PATCH /api/results/:id`
- `POST /api/results/publish`

Grading calculates classification from the percentage: `70+ Distinction`, `60+ Merit`, `40+ Pass`, otherwise `Fail`. Overdue fee balances can place results on hold (`resultStatus = 2`).

## Code flow

`AssessmentPage` and assessment upload UI -> Axios/API or assessment Redux thunks -> Prisma `AssessmentSubmission` and `Assessment` transactions. Assessment, submission, and grade forms/tables are standalone/shared components.
