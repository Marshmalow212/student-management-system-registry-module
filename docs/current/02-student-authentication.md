# Student Authentication

## Flow

A registry student visits `/student/register` and submits email, name, Student ID, and password. `POST /api/auth/student/register` creates an unverified role-0 user and sends a six-digit OTP. The user verifies at `/student/verify`; `POST /api/auth/student/verify` consumes the OTP and creates the session. `/student/login` uses `POST /api/auth/student/login` and rejects unverified accounts. OTP resend is available through `/api/auth/student/resend`.

## Rules

Emails are normalized. OTPs are hashed, expire after 10 minutes, are single-use, and have attempt and resend limits. A student must match an existing registry Student ID before registration. Student sessions redirect to `/student/dashboard`; staff sessions use `/dashboard`.

## Code flow

Student forms in `components/ui/forms` -> student auth action components -> auth Redux thunks/slice -> `app/api/auth/student/*` -> Prisma `User`, `Student`, and `UserLog`.
