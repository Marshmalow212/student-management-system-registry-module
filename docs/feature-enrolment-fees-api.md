# Enrolment and Fee Management API

## Scope

This slice adds staff-facing enrolment lifecycle and internal fee-ledger APIs. It does not connect to a payment provider, process cards or bank transfers, send notifications, or implement attendance, scheduling, or staff administration UI.

Refunds and voids are intentionally excluded. `PaymentTransaction` is append-only from the API: there is no update or delete endpoint. A future refund model must be additive and must not mutate historical payments.

## Data model

`StudentEnrollment` links one non-withdrawn `Student` to one active `Programme` for one `enrolledYear`. `reference` is unique, and `(studentId, programmeId, enrolledYear)` is unique. `feeTotal` is a `Decimal(12,2)` snapshot calculated at creation, so later programme catalogue changes do not alter an existing charge. Optional `dueDate` drives overdue reporting. `createdById` links the enrolment to the staff `User` who created it.

`PaymentTransaction` links to an enrolment and the receiving staff `User`. `amount` is `Decimal(12,2)` and `currency` is an explicit three-character code, defaulting to `USD`. `reference` and `idempotencyKey` are unique. Payment rows are immutable and have indexes for enrolment/date and receiving user/audit lookup.

Foreign keys use `RESTRICT` for financial records. Deleting a student, programme, user, enrolment, or payment cannot silently remove ledger history.

## Financial rules

- Programme `fee`, `discount`, and `discountLimit` are treated as non-negative currency amounts, not percentages.
- Enrolment total is `max(0, fee - min(discount, discountLimit))`; when `discountLimit` is null, the full discount is used.
- The calculated total is stored as a decimal snapshot.
- Payments must be positive, have at most two decimal places, and cannot exceed the outstanding balance.
- Balance is derived as `feeTotal - sum(payments)` using integer cents in application logic and is returned as a string.
- `overdue` is true only when the outstanding balance is positive and `dueDate` is before the current time.
- Only `ACTIVE` enrolments accept payments. Cancelled enrolments cannot be reactivated; an enrolment with payments cannot be cancelled.
- Payment creation and balance checking occur in one Prisma interactive transaction. Database uniqueness handles concurrent duplicate references and idempotency keys.

## Authorization

All routes use the existing session guard. Staff can read; Registrar and Admin roles can create payments and enrolments or change enrolment status. Student users receive the existing `403 FORBIDDEN` response. Authentication failures remain `401 UNAUTHORIZED`.

Financial writes create `UserLog` records using `ENROLLMENT_CREATED`, `ENROLLMENT_STATUS_CHANGED`, and `PAYMENT_RECORDED`. Creation audit rows are in the same transaction as their financial mutation.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/enrollments` | List enrolments with safe student/programme summaries and derived balances |
| POST | `/api/enrollments` | Create an enrolment and snapshot its calculated fee |
| GET | `/api/enrollments/:id` | Read one enrolment and its derived balance |
| PATCH | `/api/enrollments/:id` | Change status to `ACTIVE`, `COMPLETED`, or `CANCELLED` under lifecycle rules |
| GET | `/api/fees/:enrollmentId` | Read fee total, paid amount, balance, and overdue state |
| GET | `/api/payments` | List immutable payment entries, optionally filtered by `enrollmentId` |
| POST | `/api/payments` | Record an internal payment ledger entry idempotently |

### Enrolment create request

```json
{
  "reference": "ENR-2026-0001",
  "studentId": 12,
  "programmeId": 4,
  "enrolledYear": 2026,
  "dueDate": "2026-09-30"
}
```

### Payment create request

```json
{
  "reference": "PAY-2026-0001",
  "idempotencyKey": "cashier-session-12-payment-1",
  "enrollmentId": 33,
  "amount": "250.00",
  "currency": "USD",
  "paymentDate": "2026-08-17T10:30:00Z"
}
```

A replay with the same idempotency key and identical reference, enrolment, and amount returns `200` with `replay: true` and the original payment. Reusing the key for different data returns `409 IDEMPOTENCY_CONFLICT`.

### Response projection

Success responses use `{ "data": ... }`. Money values (`feeTotal`, `amount`, `paid`, and `balance`) are strings. Enrolment projections contain only student identity summaries, programme identity summaries, lifecycle fields, dates, and derived balance data. No password, OTP, session, or other credential field is selected.

## Status codes

- `200`: successful read, status update, or idempotent replay
- `201`: enrolment or payment created
- `400 VALIDATION_ERROR`: malformed IDs, dates, status, currency, or amount
- `401 UNAUTHORIZED`: missing or invalid session
- `403 FORBIDDEN`: insufficient staff role
- `404 STUDENT_NOT_FOUND`, `PROGRAMME_NOT_FOUND`, or `ENROLLMENT_NOT_FOUND`
- `409 ENROLLMENT_EXISTS`: duplicate enrolment reference or student/programme/year
- `409 PAYMENT_EXISTS`: duplicate payment reference
- `409 IDEMPOTENCY_CONFLICT`: key reused for different payment data
- `409 OVERPAYMENT`: amount exceeds current outstanding balance
- `409 ENROLLMENT_NOT_PAYABLE`: enrolment is completed or cancelled
- `409 ENROLLMENT_HAS_PAYMENTS`: paid enrolment cannot be cancelled
- `409 INVALID_STATUS_TRANSITION`: terminal lifecycle transition is invalid
- `500 INTERNAL_ERROR`: unexpected persistence or runtime failure

## Migration and verification

Migration: `prisma/migrations/20260817150000_enrolment_fee_ledger/migration.sql`. It is additive and preserves existing authentication and registry tables. `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, and the focused financial API tests pass.

Applying or checking migration state requires the configured PostgreSQL server. The project environment previously could not reach PostgreSQL at the host-side connection used for development, so migration application remains an operational blocker, not a code-validation blocker. Run the normal `npx prisma migrate deploy` workflow after the database is reachable.

## UI handoff

Use the existing Axios client with the paths above. Read `response.data.data`. Treat money as strings and do not convert through binary floating point for display or submission. Handle the listed `409` codes distinctly, especially `OVERPAYMENT`, `IDEMPOTENCY_CONFLICT`, and `ENROLLMENT_EXISTS`. Payment confirmation should retain the idempotency key until the API response is known; retrying the same request is safe.

No external provider token, provider transaction ID, refund action, or void action exists in this contract yet. Those belong behind a future provider boundary and should not be added to UI assumptions now.
