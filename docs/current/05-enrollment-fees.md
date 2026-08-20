# Enrollment and Fees

## Flow

`/dashboard/enrollments` lists enrollments, filters them, opens an enrollment detail dialog, shows the balance and payment history, and allows authorized staff to change enrollment status or start a payment flow. Enrollment creation uses the standalone enrollment form.

## API

- `GET/POST /api/enrollments`
- `GET/PATCH /api/enrollments/:id`
- `GET /api/fees/:enrollmentId`
- `GET /api/enrollments/add-remaining/:id`

An enrollment stores a programme fee snapshot, due date, lifecycle status, and creator. Balance is `feeTotal - sum(payments)`. An enrollment is overdue only when it has a positive balance and its due date is in the past. Status changes also update the linked Student status where required by the API workflow.

## Code flow

`EnrollmentPage` -> enrollment Redux thunks/slice and standalone forms -> API routes -> Prisma transaction. Money and balances cross the API as decimal strings. Payment history uses the shared paginated table components.
