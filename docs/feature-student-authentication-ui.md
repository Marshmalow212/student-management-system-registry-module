# Student Authentication UI

## Functional flows

- `/student/register` collects name, email, student ID, and an 8-128 character password. A successful `201` response keeps only the public user in Redux and routes to `/student/verify?email=...`.
- `/student/verify` accepts a six-digit OTP and calls verification. Success means the server has created the HTTP-only session cookie and the UI routes to `/dashboard`.
- Resend uses the same email and surfaces the server response. The UI explains `OTP_EXPIRED`, `INVALID_OTP`, `OTP_ATTEMPTS_EXCEEDED`, `OTP_RATE_LIMITED`, `STUDENT_NOT_FOUND`, and `ALREADY_VERIFIED` without exposing an OTP.
- `/student/login` calls the student login endpoint and routes verified users to `/dashboard`.

## Form states and validation

Forms use React Hook Form with Zod validation, accessible labels, inline `role="alert"` validation errors, and disabled submit controls while requests are pending. Password and OTP values exist only in the submitted form data and are never copied into Redux.

## Errors and redirects

Stable API codes are mapped to actionable messages. `IDENTITY_EXISTS` is shown on registration; `ACCOUNT_UNVERIFIED` directs the user to verification conceptually through its error message; `INVALID_CREDENTIALS` remains intentionally generic. Successful verification and login redirect to `/dashboard`; registration redirects to the OTP route.

## Accessibility

Inputs have explicit labels, email/password autocomplete hints, OTP numeric input mode and one-time-code autocomplete, invalid state attributes, and live alert text. Loading states are visible in button labels and controls are disabled during requests.

## API boundary

The feature calls the four API endpoints through `AxiosInstance` with credentials enabled. Redux stores only public identity metadata, authentication/verification flags, loading state, and display-safe error text/code. Session cookies remain HTTP-only and passwords, OTPs, hashes, and tokens are never returned to or stored by the client.