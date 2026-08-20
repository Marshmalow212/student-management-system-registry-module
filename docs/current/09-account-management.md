# Account Management

## Flow

Admins use `/dashboard/accounts` to filter existing staff accounts and open the create-account dialog. The form accepts name, email, temporary password, and role. After `POST /api/auth/register` succeeds, the page refreshes the account list and shows a confirmation toast.

## Roles

The selectable roles are Staff `1`, Registrar `2`, and Admin `3`. Student accounts are created through the separate student authentication/registry lifecycle and are not created from this page.

## Code flow

`AccountManagementPage` -> `createStaffAccountThunk` and `fetchUsers` -> auth/users API routes -> Redux auth/admin-users state. Passwords are sent only to the API for hashing and are never displayed in account tables or public projections.
