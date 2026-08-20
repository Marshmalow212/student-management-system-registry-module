/*
  Warnings:

  - You are about to drop the column `attachmentMetadata` on the `AssessmentSubmission` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AssessmentSubmission_assessmentId_isPublished_idx";

-- DropIndex
DROP INDEX "AssessmentSubmission_studentId_resultStatus_idx";

-- AlterTable
ALTER TABLE "AssessmentSubmission" DROP COLUMN "attachmentMetadata";

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "StudentEnrollment" ALTER COLUMN "dueDate" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Student_status_deletedAt_idx" ON "Student"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Student_programmeId_status_idx" ON "Student"("programmeId", "status");

-- CreateIndex
CREATE INDEX "StudentEnrollment_studentId_status_idx" ON "StudentEnrollment"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentEnrollment_status_dueDate_idx" ON "StudentEnrollment"("status", "dueDate");
