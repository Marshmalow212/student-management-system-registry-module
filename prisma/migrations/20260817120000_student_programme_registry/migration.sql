CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN');
CREATE TYPE "ProgrammeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

CREATE TABLE "Programme" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "coupon" TEXT,
    "discountLimit" DECIMAL(12,2),
    "status" "ProgrammeStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "studentUid" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "academicYear" INTEGER,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hasOverdueBalance" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "programmeId" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Programme_name_key" ON "Programme"("name");
CREATE UNIQUE INDEX "Student_studentUid_key" ON "Student"("studentUid");
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE INDEX "Programme_status_deletedAt_idx" ON "Programme"("status", "deletedAt");
CREATE INDEX "Student_status_deletedAt_idx" ON "Student"("status", "deletedAt");
CREATE INDEX "Student_programmeId_status_idx" ON "Student"("programmeId", "status");
CREATE INDEX "Student_fullName_idx" ON "Student"("fullName");

ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_programmeId_fkey"
  FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;