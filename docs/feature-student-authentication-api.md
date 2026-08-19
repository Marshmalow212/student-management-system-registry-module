# Student Authentication and OTP Registration API

## BRS/SRS scope

This slice provides student account creation, OTP verification, OTP resend, and password login under `/api/auth/student/*`. It uses the existing `User`, `UserLog`, password, session, response-envelope, and role conventions. Attendance, scheduling, notifications, staff administration, password reset, and external identity providers are out of scope.

Student accounts always persist with role `0` (`UserRole.STUDENT`). Staff routes do not accept or create student accounts. A session is issued only after successful OTP verification or login of an already verified student.

## Endpoint summary

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| POST | `/api/auth/student/register` | Create an unverified student and deliver an OTP | 201 |
| POST | `/api/auth/student/verify` | Consume the current OTP and activate the account | 200 |
| POST | `/api/auth/student/resend` | Replace and deliver the current OTP | 200 |
| POST | `/api/auth/student/login` | Authenticate an active, verified student | 200 |

All requests are JSON. Email is trimmed and lowercased. Successful responses contain public identity fields only. Passwords, password hashes, OTPs, and session tokens are never returned.

## Contracts

### `POST /api/auth/student/register`

Request:

```json
{
  "email": "student@example.com",
  "name": "A Student",
  "studentId": "S-1007",
  "password": "password123"
}
```

Validation requires an email, a 1-255 character name, a 1-64 character student ID, and an 8-128 character password. The normalized email and student ID must both be unused.

`201 Created`:

```json
{
  "user": {
    "id": 7,
    "email": "student@example.com",
    "name": "A Student",
    "studentId": "S-1007",
    "role": 0,
    "isVerified": false
  },
  "message": "Registration created. Verify the OTP to activate the account."
}
```

### `POST /api/auth/student/verify`

Request: `{ "email": "student@example.com", "otp": "123456" }`

The OTP is six digits, single-use, valid for 10 minutes, and limited to five failed attempts. On success, the endpoint clears the OTP fields and sets the existing seven-day HTTP-only `sms_session` cookie.

`200 OK` returns `{ "user": { "id", "email", "name", "studentId", "role": 0, "isVerified": true }, "message": "Account verified successfully" }`.

### `POST /api/auth/student/resend`

Request: `{ "email": "student@example.com" }`

Only an existing unverified student can request a resend. The prior OTP is replaced, attempts reset, expiry becomes 10 minutes from the resend, and a 60-second cooldown applies.

`200 OK`: `{ "message": "A new OTP was sent" }`.

### `POST /api/auth/student/login`

Request: `{ "email": "student@example.com", "password": "password123" }`

The endpoint requires an active, verified role-0 account. A successful response sets `sms_session` with the existing HTTP-only, `SameSite=Lax`, seven-day cookie policy and returns:

```json
{
  "user": {
    "id": 7,
    "email": "student@example.com",
    "name": "A Student",
    "studentId": "S-1007",
    "role": 0
  },
  "message": "Login successful"
}
```

## Statuses and stable codes

- `400 VALIDATION_ERROR`: malformed fields.
- `400 INVALID_OTP`: malformed or incorrect OTP request.
- `400 OTP_EXPIRED`: the current OTP is absent or expired.
- `401 INVALID_CREDENTIALS`: unknown, inactive, or incorrect-password student login.
- `403 ACCOUNT_UNVERIFIED`: password is correct but OTP verification has not completed.
- `404 STUDENT_NOT_FOUND`: resend target is not an unverified student.
- `409 IDENTITY_EXISTS`: normalized email or student ID is already registered.
- `409 ALREADY_VERIFIED`: verification or resend was requested for an active account.
- `429 OTP_ATTEMPTS_EXCEEDED`: five invalid OTP attempts have been used.
- `429 OTP_RATE_LIMITED`: resend requested inside the 60-second cooldown.
- `500 INTERNAL_ERROR`: unexpected persistence, hashing, or delivery failure.

Errors use the shared envelope `{ "error", "code", "details?" }`.

## Data model dependencies

The migration `20260817090000_student_auth_otp` extends `User` with nullable `studentId` (unique), `isVerified`, `otpHash`, `otpExpiresAt`, `otpAttempts`, and `otpSentAt`. `isVerified` defaults to `true` so existing staff rows retain behavior. Student registration explicitly sets role `0` and `isVerified=false`. `UserLog` remains unchanged and receives student registration, OTP, and student-login event types as free-form strings.

No password-reset fields are added: reset is not needed for this first coherent slice and remains a separate feature.

## Security and delivery assumptions

- OTPs are generated with Node crypto, HMAC-hashed before persistence, time-bound, single-use, and never included in API responses or client state.
- The development delivery adapter logs the OTP to the server console only outside production. Production throws until an explicit provider adapter is configured; no speculative email/SMS integration is included.
- Sessions use the existing signed HTTP-only cookie helpers. Raw session values are not returned to Redux or API consumers.
- Duplicate checks are performed against normalized email and unique student ID; the database unique constraints remain the final race-safety boundary.
- OTP verification is the only student-registration path to an authenticated session. Student role `0` cannot satisfy `requireStaff`.

## Focused verification

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npm run typecheck`: passed.
- `npm test -- --runInBand app/api/auth/student/student-auth.test.ts`: 1 suite, 6 tests passed.
- `npx prisma migrate dev --create-only` could not finish with the default `DATABASE_URL` because host `db` is Docker-internal; the localhost override reached Postgres but paused for baseline confirmation. The additive migration is checked in and should be applied from the Docker network or with the project’s normal database migration workflow.

## UI handoff contract

UI may call the four endpoints above through the existing Axios client with credentials enabled. Registration should transition to an OTP screen using the returned public user, verification and login may read `response.data.user`, and UI state must retain only `id`, `email`, `name`, `studentId`, `role`, and verification/status flags. UI must treat `201` registration, `403 ACCOUNT_UNVERIFIED`, `409 IDENTITY_EXISTS`, `429 OTP_RATE_LIMITED`, and `429 OTP_ATTEMPTS_EXCEEDED` as stable integration cases.