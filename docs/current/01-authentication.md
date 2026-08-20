# Authentication

## Flow

Staff, Registrar, and Admin users sign in at `/login`. The form dispatches the auth login thunk, which calls `POST /api/auth/login`. On success the API sets the signed HTTP-only `sms_session` cookie, Redux stores safe public identity fields, and the UI navigates to `/dashboard`. `/api/auth/me` restores the active session; `/api/auth/logout` clears it.

Admin users can create Staff, Registrar, or Admin accounts through `POST /api/auth/register`. The public signup page does not create arbitrary roles.

## Endpoints

- `POST /api/auth/login`
- `POST /api/auth/register` (admin authorization)
- `GET /api/auth/me`
- `POST /api/auth/logout`

Passwords are scrypt-hashed. Password hashes, OTP fields, and session values never enter public responses or Redux state. Server guards remain the authorization boundary; navigation is only a UI convenience.

## Code flow

`app/login` and `components/feature/auth` -> `redux/features/auth/authThunk.ts` -> `AxiosInstance` -> `app/api/auth/*` -> Prisma `User` and `UserLog`.
