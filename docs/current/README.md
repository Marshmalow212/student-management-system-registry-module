# Current Application Documentation

This directory is the concise documentation set for the implemented application flows.

## Modules

- [Authentication](01-authentication.md)
- [Student authentication](02-student-authentication.md)
- [Dashboard](03-dashboard.md)
- [Registry and registration](04-registry-registration.md)
- [Enrollment and fees](05-enrollment-fees.md)
- [Payments](06-payments.md)
- [Assessments and submissions](07-assessments-submissions.md)
- [Grades and transcripts](08-grades-transcripts.md)
- [Account management](09-account-management.md)
- [Development seed data](10-seed-data.md)

## Shared conventions

Roles are integer values: Student `0`, Staff `1`, Registrar `2`, Admin `3`. Sessions use the signed HTTP-only `sms_session` cookie. API calls use `AxiosInstance`; Redux Toolkit thunks own client-side request state where a feature has Redux integration. Forms use React Hook Form, Zod, and shadcn `Field` primitives. Decimal money and marks are returned as strings. API errors use `{ error, code, details? }`.
