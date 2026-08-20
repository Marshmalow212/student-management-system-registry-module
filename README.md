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
- [Authentication](./docs/current/00-architecture.md)
- [Student authentication](./docs/current/02-student-authentication.md)
- [Dashboard](./docs/current/03-dashboard.md)
- [Registry and registration](./docs/current/04-registry-registration.md)
- [Enrollment and fees](./docs/current/05-enrollment-fees.md)
- [Payments](./docs/current/06-payments.md)
- [Assessments and submissions](./docs/current/07-assessments-submissions.md)
- [Grades and transcripts](./docs/current/08-grades-transcripts.md)
- [Account management](./docs/current/09-account-management.md)
- [Development seed data](./docs/current/10-seed-data.md)



## Environment Setup

### Prerequisites

- Node.js 24 (matches the Docker base image `node:24-alpine`)
- npm 10+
- Docker + Docker Compose v2 (for the bundled Postgres container)
- A `.env` file at the repo root (see below)

### `.env`

The shipped `.env.example` already wires the Docker network. The relevant keys:

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
run the command `cp .env.example .env` will prepare the .env file

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

- Seeders running 
```bash

docker exec -it sms-nextjs-app npx prisma migrate deploy


docker exec -it sms-nextjs-app npx prisma db seed

```

## Authentication Entities (Seeded)

The default seed ([prisma/seeders/admin_seeder.ts](prisma/seeders/admin_seeder.ts)) provisions an Admin and two staff accounts for local development with the shared password `1234@sms`:

| Email | Role | Name |
| --- | --- | --- |
| `alice@example.com` | `3` (Admin) | Alice |
| `bob@example.com` | `2` (Registrar) | Bob |
| `john@example.com` | `1` (Staff) | John |

**student email id can be found using `Registrar` dashboard and password similar as shared**

Replace these credentials before any non-development deployment.


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

Tests live next to the routes they cover (`route.test.ts`) and exercise route handlers with Jest. See [Test Setup Guide](./TEST_SETUP_GUIDE.md) for the full setup and execution guide.

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
- Assessment result publication is gated by `isPublished = true`; fee holds are surfaced as `ON_HOLD` in per student results instead of being silently suppressed.

## AI Usage Summary
- Initial Planning Blueprint and Tasks Planning 
- Project Scaffolding and Structure Design implementation
- Agent Based Workflow in Local: API-Development, UI-Development, API-Integration
- Agents pass using fleet, One Agent green lights to Another Agent
- Tools Used: Github Co-pilot Agents, Models: Mix of Paid Models of Claude, Co-pilot Free Models, Ollama- minimax-m3:cloud (amazing model as a free one but limited usage by Ollama Cloud Free models)
- Refactoring, Jest Test Suit implementation, Documentation

 **All AI Generated contents reviewed and validated before commiting.**

## Some Future Scope - Feature Level ( As My Idea Goes On)
- Full Admin Level User Management RBAC
- LLM powered Grading
- OCR/ One-time link based payment record

*There are still scopes to improve every module I developed, I couldn't help but pour it a little everyday*


