# Student Management Registry and Simple Assessment Grading Module

A full-stack academic operations platform built on **Next.js 16 (App Router)** and **Prisma 7 + PostgreSQL**. It brings together a staff-managed student and programme registry, enrolments with fee management, an immutable internal payment ledger, a programme-scoped assessment workflow with submission and grading, role-scoped grade reports and transcripts, and a separate student authentication flow (email/password + 6-digit OTP). The codebase favours explicit API boundaries, server-side authorization, transactional consistency, and decimal-safe money and grade handling throughout.

## Summary

- Single deployment unit: one Next.js app serving both UI and API routes under `app/api`.
- Role model: Student (`0`), Staff (`1`), Registrar (`2`), Admin (`3`). Roles are persisted as integers and mapped at the application layer (`lib/auth/roles.ts`).
- Session model: signed `sms_session` HTTP-only cookie (HMAC, 7-day TTL). The shared Axios client sends credentials on every request.
- Calculations and business logics handled in API side 
- All writes that must stay consistent (registration, enrolment creation, payment, grading, audit) run inside Prisma interactive transactions.
- UI: Tailwind v4 + shadcn/ui (`base-nova` style, `hugeicons` library), Redux Toolkit for public identity state, React Hook Form + Zod for forms

## Technologies

| Layer | Stack |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | Tailwind CSS v4, shadcn/ui (`base-nova`), `hugeicons` |
| State | Redux Toolkit + React-Redux thunks |
| Data | Prisma ORM 7 (`prisma-client` generator), PostgreSQL 18, `@prisma/adapter-pg`, `pg` |
| Forms / Validation | React Hook Form, Zod |
| HTTP | Axios Client |
| Tooling | ESLint, Prettier, tsx, Jest + ts-jest + Testing Library |
| Container | Docker, docker-compose (`node:24-alpine`, `postgres:18-alpine`) |

## Core Modules

The product is partitioned by feature, with each feature owning its `app/api/**` routes, its `components/feature/**` and `components/forms/**` surface, its `docs/feature-*.md` contract, and its migrations. The high-level modules:

### 1. Authentication and Authorization
Staff login, registration (admin-only), logout, and `me`. Issues the `sms_session` HTTP-only cookie. Public user state in Redux is limited to `id`, `email`, `name`, `role`. See [docs/feature-authentication.md](docs/feature-authentication.md) and [API_AUTH_DOCUMENTATION.md](API_AUTH_DOCUMENTATION.md).

### 2. Student Authentication and OTP
Separate lifecycle for students: `register` → `verify` (six-digit OTP, HMAC-hashed, 10-minute TTL, five-attempt limit, 60-second resend cooldown) → `login`. OTPs are persisted on `User`; `isVerified` gates the session. See [docs/feature-student-authentication.md](docs/feature-student-authentication.md).

### 3. Student and Programme Registry
Catalog of `Programme` records and a searchable directory of `Student` records. Staff and above can list and inspect; Registrar and Admin can create/update; Admin can soft-delete (`ARCHIVED` / `WITHDRAWN`). Pagination is `page` + `pageSize` (max 100); money is serialised as strings. See [docs/feature-student-programme-registry.md](docs/feature-student-programme-registry.md).

### 4. Student Registration (Atomic)
Registrar-only `POST /api/student-registrations` generates `studentUid` and enrolment reference, derives the academic year, and atomically creates the `Student` and its initial active enrolment with a fee/discount snapshot. Conditional coupon usage is claimed inside the same transaction. See [docs/feature-student-registration-api.md](docs/feature-student-registration-api.md).

### 5. Enrolment and Fee Management
`StudentEnrollment` (unique per student/programme/year) tracks lifecycle `ACTIVE → COMPLETED | CANCELLED`, fee snapshot, due date, and balance. `balance = feeTotal - sum(payments)`; overdue requires a positive balance with a past due date. Only `ACTIVE` enrolments accept payments. See [docs/feature-enrolment-fees.md](docs/feature-enrolment-fees.md) and [docs/feature-enrolment-fees-api.md](docs/feature-enrolment-fees-api.md).

### 6. Payment Ledger
Immutable `PaymentTransaction` entries with unique `reference` and unique `idempotencyKey`. Payment creation and the balance check run in a single Prisma interactive transaction; overpayment, idempotency conflicts, and non-payable enrolments return stable codes (`OVERPAYMENT`, `IDEMPOTENCY_CONFLICT`, `ENROLLMENT_NOT_PAYABLE`, `ENROLLMENT_HAS_PAYMENTS`). See [docs/feature-payment-api-plan.md](docs/feature-payment-api-plan.md) and [PAYMENT_API_DOCUMENTATION.md](PAYMENT_API_DOCUMENTATION.md).

### 7. Assessment Workflow
Programme-owned `Assessment` records with lifecycle `DRAFT → OPEN → CLOSED → RESULT`. Students submit or resubmit before the deadline / extended deadline and within the resubmission limit; staff grade and publish. Fee holds place results on `ON_HOLD` until the balance is clear. PDF upload is a two-step boundary (`POST /api/submissions/file-upload` returns a public path; finalisation cross-checks student/programme/assessment/path). See [docs/feature-assessment.md](docs/feature-assessment.md), [docs/feature-assessment-api.md](docs/feature-assessment-api.md), and [docs/feature-assessment-ui.md](docs/feature-assessment-ui.md).

### 8. Grades, Transcripts, and Reporting
`AssessmentSubmission` is the sole authority for per-assessment marks and publication. Percentage is computed at read time (`marks / maxMarks * 100`, two decimals); classification is derived (`A` 80–100, `B` 70–79.99, `C` 60–69.99, `D` 50–59.99, `F` < 50). `GET /api/transcripts` returns `NO_RESULTS` / `INCOMPLETE` / `COMPLETE`. CSV export is a client-side adapter with formula neutralisation. See [docs/feature-grades-transcripts-reporting.md](docs/feature-grades-transcripts-reporting.md), [docs/feature-grades-transcripts-reporting-api.md](docs/feature-grades-transcripts-reporting-api.md), and [docs/feature-grades-transcripts-reporting-ui.md](docs/feature-grades-transcripts-reporting-ui.md).

### 9. Improvement / Stabilisation Spec
The canonical cross-feature BRS, SRS, role matrix, and NFR list lives in [docs/feature-improvement-fix-v1.md](docs/feature-improvement-fix-v1.md). It is the source of truth for capabilities and non-functional rules (server-side authorisation, transactional mutations, bounded validation, pagination caps, decimal-string contracts).

## Environment Setup

### Prerequisites

- Node.js 24 (matches the Docker base image `node:24-alpine`)
- npm 10+
- Docker + Docker Compose v2 (for the bundled Postgres container)
- A `.env` file at the repo root (see below)

### `.env`

The shipped `.env` already wires the Docker network. The relevant keys:

```env
APP_ENV=development
APP_EXPOSE_PORT=6601
DB_EXPOSE_PORT=6602
DB_NAME=student_management_system
DB_USER=<db-user>
DB_PASSWORD=<db-password>

# When running via docker-compose the app reaches the db over the `sms-network`:
DATABASE_URL="postgresql://<db-user>:<db-password>@db:5432/student_management_system?schema=public"
```

If you run Next.js on the host while Postgres stays in Docker, swap the host segment to `localhost:${DB_EXPOSE_PORT}`.

`SESSION_SECRET` (HMAC key for the `sms_session` cookie) is read from the environment by `lib/auth/`. Set a strong random value in production; the default dev value must be overridden before deploying.

## Local Running (Docker)

Bring up the app and Postgres together:

```bash
docker compose up --build
```

- App: http://localhost:`${APP_EXPOSE_PORT}` (defaults to `6601`)
- Postgres: `localhost:${DB_EXPOSE_PORT}` (defaults to `6602`)

The compose service starts Postgres first, then runs `npm install && npm run dev` inside the app container. Live code changes are picked up through the bind mount.

## Local Running (Host)

```bash
npm install
npm run dev
```

The app expects `DATABASE_URL` to point at a reachable Postgres (either the Dockerised instance via `localhost:${DB_EXPOSE_PORT}` or any external DB). On startup, ensure migrations are applied (see below).

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and start |
| `npm run lint` | ESLint (Next config) |
| `npm run format` | Prettier write |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest test suite |
| `npm run test:watch` | Jest watch mode |
| `npm run test:coverage` | Jest with coverage |

## Migrations

Migrations live in [prisma/migrations](prisma/migrations) and are applied through `prisma.config.ts` (schema path `prisma/schema.prisma`, seed command `tsx prisma/seeders/seeder.ts`).

```bash
# Apply migrations to the database referenced by DATABASE_URL
npx prisma migrate deploy

# During development: create a new migration from schema changes
npx prisma migrate dev --name <short-description>

# Regenerate the Prisma Client (output: db/prisma/)
npx prisma generate
```

The Prisma generator emits a typed client into `db/prisma/` (consumed via `@/db/prisma/client`). Always regenerate after pulling schema changes.

## Seeding

The seed entry point is [prisma/seeders/seeder.ts](prisma/seeders/seeder.ts), wired through `prisma.config.ts` as the canonical `migrate dev` and `db seed` command. It currently invokes the admin/staff seeder:

```bash
# Apply migrations and run the configured seed in one step
npx prisma migrate dev

# Or run the seed explicitly
npx prisma db seed
```

The default seed ([prisma/seeders/admin_seeder.ts](prisma/seeders/admin_seeder.ts)) provisions an Admin and two staff accounts for local development with the shared password `1234@sms`:

| Email | Role | Name |
| --- | --- | --- |
| `alice@example.com` | `3` (Admin) | Alice |
| `bob@example.com` | `2` (Registrar) | Bob |
| `john@example.com` | `1` (Staff) | John |

Replace these credentials before any non-development deployment.

## Project Layout

```
app/
  (auth)/                 Auth-grouped routes
  api/                    Next.js Route Handlers (auth, students, programmes,
                          student-registrations, enrollments, fees, payments,
                          assessments, submissions, results, transcripts,
                          reports, users)
  dashboard/              Staff console (sidebar, tables, charts)
  student/                Student console
  login/  signup/         Public auth pages
components/
  feature/                Per-feature orchestrators (assessment, payment, ...)
  forms/                  Per-feature form components
  ui/                     shadcn/ui primitives
db/prisma/                Generated Prisma Client output
docs/                     Feature-level BRS/SRS/API/UI specifications
lib/                      Auth guards, axios client, registry/fees/assessments
                          helpers, prisma singleton, Zod schemas, validators
prisma/
  schema.prisma           Data model (User, Student, Programme,
                          StudentEnrollment, PaymentTransaction, Assessment,
                          AssessmentSubmission, UserLog)
  migrations/             Versioned SQL migrations
  seeders/                Seed entry point + admin seeder
storage/                  Local application storage for uploaded submissions
plans/                    Internal planning artefacts
```

## API Response Conventions

- Success (single resource): `{ "data": { ... } }` (or `{ "user": { ... }, "message": "..." }` for auth).
- Success (list): `{ "data": [...], "pagination": { "page", "pageSize", "total", "totalPages" } }`.
- Error: `{ "error": string, "code": string, "details"?: unknown }` with stable codes (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, conflict codes per feature, `INTERNAL_ERROR`).

## Testing

Tests live next to the routes they cover (`route.test.ts`) and exercise route handlers with Jest. See [TEST_SETUP_GUIDE.md](TEST_SETUP_GUIDE.md) for the full setup and execution guide.

```bash
npm test                       # run all
npm run test:coverage          # with coverage report under coverage/
npm test -- --testPathPatterns="api/auth"
```

## Security Notes

- Authorization is server-side only — every guarded failure is `401 UNAUTHORIZED` or `403 FORBIDDEN`. Role-aware navigation is a usability layer, not a security boundary.
- Passwords use scrypt; OTPs are HMAC-hashed before persistence.
- Public projections never include password hashes, OTP hashes, session tokens, or raw grader credentials.
- Decimal money and mark fields cross the API as strings to avoid JavaScript precision loss.
- Assessment result publication is gated by `isPublished = true`; fee holds are surfaced as `ON_HOLD` instead of being silently suppressed.

## Documentation Index

- [docs/feature-authentication.md](docs/feature-authentication.md), [docs/feature-authentication-api.md](docs/feature-authentication-api.md), [docs/feature-authentication-ui.md](docs/feature-authentication-ui.md)
- [docs/feature-student-authentication.md](docs/feature-student-authentication.md), [docs/feature-student-authentication-api.md](docs/feature-student-authentication-api.md), [docs/feature-student-authentication-ui.md](docs/feature-student-authentication-ui.md)
- [docs/feature-student-programme-registry.md](docs/feature-student-programme-registry.md), [docs/feature-student-programme-registry-api.md](docs/feature-student-programme-registry-api.md), [docs/feature-student-programme-registry-ui.md](docs/feature-student-programme-registry-ui.md)
- [docs/feature-student-registration-api.md](docs/feature-student-registration-api.md)
- [docs/feature-enrolment-fees.md](docs/feature-enrolment-fees.md), [docs/feature-enrolment-fees-api.md](docs/feature-enrolment-fees-api.md), [docs/feature-enrolment-fees-ui.md](docs/feature-enrolment-fees-ui.md)
- [docs/feature-payment-api-plan.md](docs/feature-payment-api-plan.md), [docs/feature-payment-ui.md](docs/feature-payment-ui.md), [docs/PAYMENT_API_DOCUMENTATION.md](docs/PAYMENT_API_DOCUMENTATION.md), [docs/PAYMENT_API_GREENLIGHT.md](docs/PAYMENT_API_GREENLIGHT.md), [docs/PAYMENT_API_IMPLEMENTATION_SUMMARY.md](docs/PAYMENT_API_IMPLEMENTATION_SUMMARY.md), [docs/PAYMENT_COMPONENT_ARCHITECTURE.md](docs/PAYMENT_COMPONENT_ARCHITECTURE.md), [docs/PAYMENT_INTEGRATION_QUICKSTART.md](docs/PAYMENT_INTEGRATION_QUICKSTART.md), [docs/PAYMENT_UI_INTEGRATION_SUMMARY.md](docs/PAYMENT_UI_INTEGRATION_SUMMARY.md)
- [docs/feature-assessment.md](docs/feature-assessment.md), [docs/feature-assessment-api.md](docs/feature-assessment-api.md), [docs/feature-assessment-ui.md](docs/feature-assessment-ui.md)
- [docs/feature-grades-transcripts-reporting.md](docs/feature-grades-transcripts-reporting.md), [docs/feature-grades-transcripts-reporting-api.md](docs/feature-grades-transcripts-reporting-api.md), [docs/feature-grades-transcripts-reporting-ui.md](docs/feature-grades-transcripts-reporting-ui.md)
- [docs/feature-improvement-fix-v1.md](docs/feature-improvement-fix-v1.md) — canonical cross-feature BRS/SRS/role matrix/NFR
- [API_AUTH_DOCUMENTATION.md](API_AUTH_DOCUMENTATION.md), [PAYMENT_UI_COMPLETE.md](PAYMENT_UI_COMPLETE.md), [TEST_SETUP_GUIDE.md](TEST_SETUP_GUIDE.md)
