# Student and Programme Registry API

## Scope

This feature adds staff-facing Student and Programme registry CRUD, search, filtering, detail views, lifecycle status changes, and soft deletion. Enrolment, capacity, attendance, scheduling, payments, notifications, and staff administration are out of scope.

## Data model

`Programme` is the catalogue record. Its fields are:

- `name`: unique, normalized by trimming; maps to `p_name` in `plain_schema.txt`.
- `fee`, `discount`, and `discountLimit`: non-negative decimal amounts with two-digit database precision. API responses serialize them as strings to preserve monetary precision.
- `coupon`: optional text value.
- `status`: `ACTIVE`, `INACTIVE`, or terminal `ARCHIVED`.
- `deletedAt`: nullable soft-delete timestamp.

`Student` is the registry record. Its fields are:

- `studentUid`: unique registry identifier; maps to `student_uid`.
- `fullName`, normalized email, optional date of birth, and optional academic year.
- `status`: `ACTIVE`, `INACTIVE`, `GRADUATED`, `SUSPENDED`, or terminal `WITHDRAWN`.
- `programmeId`: optional relation to one Programme. No enrolment or payment relation is created here.
- `userId`: optional unique relation to `User`. This preserves existing student OTP accounts while allowing registry-only students and later account linking. The existing `User.studentId`, password, OTP, and session behavior is unchanged.
- `hasOverdueBalance`: persisted for compatibility with the source requirements but is not writable by this feature; payment workflows own its future updates.
- `deletedAt`: nullable soft-delete timestamp.

Both models have `createdAt` and `updatedAt`. Registry list/detail queries exclude records where `deletedAt` is non-null. Programme names, student UIDs, and student emails remain database-unique even after soft deletion, preventing identity reuse.

## Authorization

All endpoints use `requireStaff()`:

- Staff and above can list and read students/programmes.
- Registrar and above can create and update students/programmes.
- Admin only can soft-delete records.
- Student role (`0`) cannot access these routes.

Responses use the existing envelope conventions: success payloads are under `data`; errors contain `error`, stable `code`, and optional `details`.

## Endpoints

| Method | Path | Authorization | Purpose |
| --- | --- | --- | --- |
| GET | `/api/programmes` | Staff | List/search programmes |
| POST | `/api/programmes` | Registrar | Create programme |
| GET | `/api/programmes/:id` | Staff | Read active programme |
| PATCH | `/api/programmes/:id` | Registrar | Update programme |
| DELETE | `/api/programmes/:id` | Admin | Soft-delete and archive programme |
| GET | `/api/students` | Staff | List/search students |
| POST | `/api/students` | Registrar | Create student |
| GET | `/api/students/:id` | Staff | Read active student |
| PATCH | `/api/students/:id` | Registrar | Update student |
| DELETE | `/api/students/:id` | Admin | Soft-delete and withdraw student |

### List query behavior

Both list endpoints accept `page` (default `1`), `pageSize` (default `20`, maximum `100`), `search`, `sort`, and `order=asc|desc`. Responses have this shape:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
}
```

Programme search matches `name` case-insensitively. Programme sort fields are `name`, `fee`, `createdAt`, and `updatedAt`; default is `name` ascending. Programme filtering accepts `status`.

Student search matches `studentUid`, `fullName`, or `email` case-insensitively. Student filtering accepts `status` and numeric `programmeId`. Student sort fields are `studentUid`, `fullName`, `email`, `academicYear`, `createdAt`, and `updatedAt`; default is `fullName` ascending.

Invalid filters return `400 VALIDATION_ERROR`. Only safe registry fields and programme summary fields are selected. No password hash, OTP field, or session value is selected or returned.

### Create/update payloads

Student create/update accepts `studentUid`, `fullName`, `email`, optional `dateOfBirth` (`YYYY-MM-DD`), optional `academicYear`, `status`, `programmeId`, and `userId`. Email is trimmed and lowercased. A linked programme must be active and not deleted. A linked user must have the existing student role.

Programme create/update accepts `name`, `fee`, `discount`, `coupon`, `discountLimit`, and `status`. Fee/discount values must be finite and non-negative.

## Status and conflict behavior

- Student `WITHDRAWN` is terminal and cannot be changed to another status.
- Programme `ARCHIVED` is terminal and cannot be reactivated.
- DELETE sets `deletedAt` and the terminal status; it does not delete the database row or the linked User.
- Duplicate student UID/email/user link and duplicate programme name map Prisma uniqueness errors to `409 STUDENT_EXISTS` or `409 PROGRAMME_EXISTS`.
- Missing records return `404 STUDENT_NOT_FOUND` or `404 PROGRAMME_NOT_FOUND`.
- Invalid status transitions return `409 INVALID_STATUS_TRANSITION`.
- Invalid request data returns `400 VALIDATION_ERROR`.
- Missing/insufficient authentication returns the existing `401 UNAUTHORIZED` or `403 FORBIDDEN` response.
- Unexpected persistence failures return `500 INTERNAL_ERROR`.

## Migration and dependencies

Migration `20260817120000_student_programme_registry` adds the two enums, the `Programme` and `Student` tables, indexes, unique constraints, and nullable foreign keys. It is additive and does not alter the authentication migration or existing `User`/`UserLog` records.

Required runtime dependencies are the existing Prisma client, PostgreSQL adapter, Zod, and `requireStaff` guard. The migration must be applied through the normal project database workflow before using these routes. No database reachability is assumed during code validation.

## Focused verification

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npm run typecheck`: passed.
- `npm test -- --runInBand app/api/students app/api/programmes`: 4 suites, 14 tests passed.
- Database migration application was not treated as a prerequisite for code tests; the environment previously could not complete `prisma migrate dev` against the Docker-internal host without the project database being available.

## UI handoff contract

The UI can use the existing Axios client against the paths above. Read results are in `response.data.data`; list responses additionally expose `pagination`. Programme money values are strings. Registry forms should handle `409 STUDENT_EXISTS`, `409 PROGRAMME_EXISTS`, `409 INVALID_STATUS_TRANSITION`, `404 PROGRAMME_NOT_FOUND`, and the standard `401`/`403` errors. UI state should never expect or store password, OTP, or session fields.
