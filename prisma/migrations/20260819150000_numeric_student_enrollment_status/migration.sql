-- The database is intentionally rebuilt from empty migrations. Drop the
-- legacy enum-backed columns and create the new integer contract directly.
ALTER TABLE "Student" DROP COLUMN "status";
ALTER TABLE "Student" ADD COLUMN "status" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StudentEnrollment" DROP COLUMN "status";
ALTER TABLE "StudentEnrollment" ADD COLUMN "status" INTEGER NOT NULL DEFAULT 0;

DROP TYPE "EnrollmentStatus";
DROP TYPE "StudentStatus";
