# Enrolment and Fee Management UI

## Functional flows

Staff can open `/dashboard/enrollments` to load enrolments from `GET /api/enrollments`, search the loaded safe projection by reference, student identity, or programme, and filter the server query by `ACTIVE`, `COMPLETED`, or `CANCELLED`. Selecting a row loads the authoritative enrolment detail and immutable payment history.

Registrar and Admin users can create an enrolment, change an active enrolment to completed or cancelled, and record an internal ledger payment. A cancelled or completed enrolment cannot be paid. Cancellation remains subject to the API rule that paid enrolments cannot be cancelled. The payment form preserves its idempotency key through an unsuccessful request so the same request can be retried safely.

## Field rules

- Enrolment reference is required and limited to 64 characters.
- Student ID, programme ID, and enrolled year are required positive identifiers/year values. The API verifies that the student is not withdrawn and the programme is active.
- Due date is optional and sent as an ISO date when present.
- Payment reference is required and limited to 64 characters.
- Payment amount is a positive decimal string with at most two decimal places. It is never parsed into a JavaScript number.
- Currency is an uppercase three-letter code, defaulting to `USD`.
- Payment date is optional and converted from the browser input to an ISO timestamp.
- Idempotency keys are generated in the browser and remain visible in the staff form. They are metadata only and are not stored in Redux.

## Permissions and state

All signed-in staff can read. Registrar and Admin roles can create enrolments, update lifecycle status, and record payments. No password, session, OTP, provider token, or other secret is placed in client state. Payment rows are displayed only as staff-safe ledger metadata returned by the API.

The API remains authoritative for fee totals, paid values, balances, overdue status, lifecycle rules, overpayment, uniqueness, and idempotency. The UI displays returned money strings unchanged and performs no financial arithmetic.

## Error handling

The page has loading skeletons, empty results, inline validation errors, and a general server error alert. API codes are mapped to distinct messages for `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404` reference/enrolment errors, `409 ENROLLMENT_EXISTS`, `PAYMENT_EXISTS`, `IDEMPOTENCY_CONFLICT`, `OVERPAYMENT`, `ENROLLMENT_NOT_PAYABLE`, `ENROLLMENT_HAS_PAYMENTS`, and `INVALID_STATUS_TRANSITION`. `400 VALIDATION_ERROR` and `500 INTERNAL_ERROR` are also surfaced. The API response envelope is read from `response.data.data`; no fallback response shape is assumed.

## Accessibility

Forms use visible labels, native input semantics, `aria-invalid`, and alert roles for validation and server errors. Table rows are keyboard focusable and can be opened with Enter. Status and overdue badges supplement, rather than replace, the associated text values. Loading and empty states are explicit.

## API boundaries

The feature uses only `AxiosInstance` from `lib/axios-client.ts`:

- `GET /api/enrollments?status=...`
- `POST /api/enrollments`
- `GET /api/enrollments/:id`
- `PATCH /api/enrollments/:id`
- `GET /api/payments?enrollmentId=...`
- `POST /api/payments`

There is no provider checkout, refund, void, payment update, or delete UI in this slice. Database migration deployment still requires the configured PostgreSQL service to be reachable; the UI does not conceal that operational dependency.
