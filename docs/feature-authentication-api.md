# Authentication and Authorization API

## Scope

The canonical authentication endpoints are under `/api/auth/*`. Sessions use the HTTP-only `sms_session` cookie. The legacy `app/(auth)/actions.ts` path is not part of this contract.

## Shared response conventions

Success responses are JSON objects with a `user` object where applicable and an optional `message`. User responses contain only public account fields:

```json
{
  "id": 1,
  "email": "staff@example.com",
  "name": "Staff User",
  "role": 1
}
```

The `role` values are `0=STUDENT`, `1=STAFF`, `2=REGISTRAR`, and `3=ADMIN`. Passwords and `passwordHash` are never returned.

Errors use this shape:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": ["Invalid email"]
  }
}
```

Validation errors are `400 Bad Request`. Error codes are stable integration values: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `INSUFFICIENT_ROLE`, `EMAIL_EXISTS`, `UNAUTHORIZED`, `FORBIDDEN`, and `INTERNAL_ERROR`.

## Endpoints

### `POST /api/auth/login`

Authenticates an active staff, registrar, or admin account and creates a session.

Request:

```json
{
  "email": "staff@example.com",
  "password": "password123"
}
```

Email is trimmed and lowercased before lookup. Passwords are verified against the stored hash.

Response: `200 OK`

```json
{
  "user": {
    "id": 1,
    "email": "staff@example.com",
    "name": "Staff User",
    "role": 1
  },
  "message": "Login successful"
}
```

The response sets `sms_session` with `httpOnly`, `sameSite=lax`, `path=/`, a seven-day lifetime, and `secure` in production.

Errors:

- `400`: malformed email or missing/empty password (`VALIDATION_ERROR`)
- `401`: unknown, inactive, or incorrectly authenticated account (`INVALID_CREDENTIALS`)
- `403`: student account (`INSUFFICIENT_ROLE`)
- `500`: unexpected server/database failure (`INTERNAL_ERROR`)

Successful and failed attempts are written to `UserLog` with client IP and User-Agent metadata.

### `POST /api/auth/register`

Creates a staff, registrar, or admin account. This is an admin-only operation; an existing authenticated admin session is required.

Request:

```json
{
  "email": "newstaff@example.com",
  "name": "New Staff Member",
  "password": "securepassword123",
  "role": 1
}
```

Email is trimmed and lowercased. Name must be 1-255 characters. Password must be 8-128 characters. Student role `0` is rejected.

Response: `201 Created`

```json
{
  "user": {
    "id": 2,
    "email": "newstaff@example.com",
    "name": "New Staff Member",
    "role": 1
  },
  "message": "User registered successfully"
}
```

Errors:

- `400`: invalid request fields or unsupported role (`VALIDATION_ERROR`)
- `401`: no valid active session (`UNAUTHORIZED`)
- `403`: authenticated user is below admin role (`FORBIDDEN`)
- `409`: normalized email already exists (`EMAIL_EXISTS`)
- `500`: unexpected server/database failure (`INTERNAL_ERROR`)

The password is hashed before persistence. The created account and duplicate-email attempts are audit logged as `REGISTER` events.

### `POST /api/auth/logout`

Clears `sms_session` and returns `200 OK`:

```json
{ "message": "Logged out successfully" }
```

A valid session logout is audit logged as `LOGOUT`. Logout remains idempotent for missing or invalid sessions. Database failures while writing a valid logout log return `500`.

### `GET /api/auth/me`

Requires a valid active session and returns `200 OK`:

```json
{
  "user": {
    "id": 1,
    "email": "staff@example.com",
    "name": "Staff User",
    "role": 1,
    "isActive": true,
    "createdAt": "2026-08-17T00:00:00.000Z"
  }
}
```

Invalid, expired, missing, or inactive sessions return `401 UNAUTHORIZED`. The selected fields exclude `passwordHash`.

## Server authorization

`lib/auth-guards.ts` provides `requireAuth()` and `requireStaff(minRole)`. The registration route calls `requireStaff(UserRole.ADMIN)`. The dashboard server component calls `getCurrentUser()` and redirects unauthenticated visitors to `/login` before rendering.

## Dependencies

- Prisma `User` and `UserLog` models
- `lib/auth/password.ts` for password hashing and verification
- `lib/auth/session.ts` for signed session cookies
- `lib/auth-guards.ts` for server authorization
- Zod for request validation
- Redux/Axios consumers should send credentials with the request and read `response.data.user`; registration must accept `201` as success. No password field is available in either success response.
