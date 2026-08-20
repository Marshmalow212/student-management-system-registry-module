# Payments

## Flow

Staff use `/dashboard/payments` to select an active enrollment, load its balance, record a payment, and inspect payment history/details. Students use `/student/payments` for read-only payments belonging to their own enrollments.

## API

- `GET /api/payments`
- `POST /api/payments`
- `GET /api/payments/:id`
- `GET /api/fees/:enrollmentId`

Payments are immutable ledger rows. New payments require a unique reference, idempotency key, positive amount, currency, and active enrollment. The API prevents overpayment and performs idempotency checks, balance validation, creation, and audit logging in one transaction. Reusing identical idempotency data replays the original payment.

## Code flow

`PaymentPage` -> `paymentThunk.ts` / `paymentSlice.ts` -> Axios -> payment and fee routes -> Prisma `PaymentTransaction`, `StudentEnrollment`, and `UserLog`. `BalanceWidget` displays paid, outstanding, and overdue state.
