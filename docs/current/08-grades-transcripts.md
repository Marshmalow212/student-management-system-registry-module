# Grades and Transcripts

## UI routes

- `/student/results`: the student's published result table.
- `/student/transcript`: the student's published transcript dialog and summary.
- `/dashboard/reports/results`: staff published-result reporting, filters, pagination, transcript lookup, and CSV export.

The shared `GradesPage` and `GradesDataTable` render these modes. If a student has an overdue balance, the result/transcript table shows that published results are unavailable until the outstanding balance is cleared, including when the result list is empty.

## API

- `GET /api/results`: published results; students are self-scoped.
- `GET /api/transcripts`: published transcript; staff must provide `studentId`.
- `GET /api/reports/results`: staff report wrapper.

Result rows calculate percentage and classification from marks and maximum marks. Transcript status is `NO_RESULTS`, `INCOMPLETE`, or `COMPLETE`. Decimal marks, totals, and percentages are returned as strings. CSV export is a client-side adapter over authorized rows.
