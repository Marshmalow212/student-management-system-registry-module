# Dashboard

## Routes and roles

- `/dashboard`: Staff, Registrar, and Admin shell. Students are redirected to `/student/dashboard`.
- `/student/dashboard`: student summary dashboard.

The dashboard page is dynamic and the client summary fetches on mount, so entering or refreshing the route reloads data.

## Staff cards

`GET /api/dashboard/staff` returns assessments authored by the current staff user, submissions for those assessments, assessments with status `3` (results), and assessments with status `2` (closed/awaiting results).

## Registrar/Admin cards

`GET /api/dashboard/registrar` returns total, enrolled (`1`), completed (`2`), deferred (`3`), withdrawn (`0`), and overdue-payment student counts. Soft-deleted students are excluded.

## Implementation

`components/feature/dashboard/dashboard-summary.tsx` selects the role-specific Redux slice and renders the shared `DashboardSectionCard`. Thunks live in `redux/features/dashboard`; slices are registered in `redux/store.ts`. Student dashboard data remains in the student dashboard thunk/slice.
