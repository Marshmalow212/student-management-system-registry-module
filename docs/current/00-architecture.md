# Current Architecture

The application is a Next.js App Router application with route handlers under `app/api`, Prisma 7/PostgreSQL persistence, Redux Toolkit feature state, Axios transport, and shadcn/ui components.

Server components authenticate page access with `getCurrentUser`. API routes enforce authorization with `lib/auth-guards.ts`; client navigation and role-specific sidebars are not security boundaries. Mutations that combine related writes use Prisma transactions and create `UserLog` audit records where applicable.

Feature pages live under `components/feature`. Forms live one-per-file under `components/ui/forms`, using shared form primitives. Tables live under `components/feature/tables` and compose the shared TanStack/shadcn data table. Public monetary and mark values are serialized as strings to preserve decimal precision.
