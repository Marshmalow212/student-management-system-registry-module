# Registry and Registration

## UI

Staff registry pages are `/dashboard/students` and `/dashboard/programmes`. `RegistryPage` provides search, status filtering, sorting, loading/empty states, detail dialogs, forms, and archive actions. Student registration is a separate dialog flow from the student registry page.

## API

- `GET/POST /api/students`
- `GET/PATCH/DELETE /api/students/:id`
- `GET/POST /api/programmes`
- `GET/PATCH/DELETE /api/programmes/:id`
- `POST /api/student-registrations`

The registration endpoint atomically creates a Student and active enrollment from an active programme. It generates the Student UID, academic year, and enrollment reference and snapshots programme pricing. Programme discounts/coupons are validated and claimed inside the transaction.

## Status and permissions

Student and enrollment statuses are integers: `0 Withdrawn`, `1 Enrolled`, `2 Completed`, `3 Deferred`. Archived programmes and deleted students are soft-deleted. Current authorization is enforced by the route guards; Admin has the broadest management access.

## Code flow

`components/feature/registry/registry-page.tsx` -> registry/registration Redux thunks -> registry API routes -> Prisma `Student`, `Programme`, `StudentEnrollment`, and audit records. Forms are standalone files under `components/ui/forms`; registry tables use the shared shadcn data table.
