# Development Seed Data

The configured seed entry point is `prisma/seeders/seeder.ts`. It runs the existing admin seeder, then programme, student, payment, and grade seeders in sequence. Each new seeder uses an interactive Prisma transaction and deterministic upserts.

## Seeded data

- Three active programmes with fees `120000`, `150000`, and `130000`.
- Ten verified students with password `1234@sms`: four in programme `2`, four in programme `3`, and two in programme `1`.
- Student UIDs use `SMS-<academic year>-<programme id><4-digit programme sequence>`; emails derive from the UID as lowercase underscore text at `example.edu`.
- Ten payment transactions cover fully paid, current partial, and overdue partial balances.
- One result assessment per seeded programme and one graded submission per seeded student. Non-overdue results are published; overdue results are on hold.

Run through the project Prisma seed command after the database is available. These credentials and values are development-only and must be changed or removed before production use.
