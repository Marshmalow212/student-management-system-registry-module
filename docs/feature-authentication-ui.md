# Authentication UI

## Scope

The login screen is a client-side shell around the canonical `/api/auth/login` endpoint. The public signup page does not create privileged accounts; it directs visitors to an administrator.

## User Flows

### Login

1. The user enters an email and password and submits the form.
2. The form trims both values and rejects missing values locally.
3. The login action dispatches the login thunk and waits for its result.
4. On a `200` response, the public user is stored in Redux, a success toast is shown, and the user is redirected to `/dashboard`.
5. On failure, the action shows a stable error toast without redirecting.

### Account creation

Only an authenticated administrator can call `POST /api/auth/register` to create a Staff, Registrar, or Admin account. Public visitors cannot select a privileged role.

## States and Errors

Redux exposes loading, authentication, registration, public user identity, and a string error suitable for display. Passwords, password hashes, session tokens, and raw API responses are not stored in Redux.

API error envelopes are normalized from `error`, `code`, and `details`. When field details are present, the first documented validation message is displayed; otherwise the API error message is displayed. Unknown failures use a retryable fallback message. The UI handles validation (`400`), invalid credentials (`401`), authorization failures (`403`), duplicate email (`409`), and server failures (`500`) through the same stable error path.

## Accessibility Expectations

- Every input has a visible, associated label and an appropriate `type`.
- Native required validation remains enabled for required fields.
- Password fields use `type="password"` and are never rendered back into status messages or Redux state.
- Submit controls use semantic buttons and remain keyboard reachable.
- Toasts provide concise success or error status messages without exposing credentials.
- The public signup page provides a keyboard-accessible sign-in link.

## Integration Notes

The API integration phase should exercise successful login and registration, all documented error statuses, cookie-backed session behavior, redirect guards, and toast behavior in a browser environment. The UI Redux tests cover response envelopes and local state privacy; they do not replace end-to-end API and session tests.