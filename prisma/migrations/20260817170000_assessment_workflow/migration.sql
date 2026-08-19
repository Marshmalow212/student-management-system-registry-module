
CREATE TABLE "Assessment" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "subjectName" TEXT,
  "programmeId" INTEGER NOT NULL,
  "createdById" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "maxMarks" DECIMAL(10,2) NOT NULL,
  "status" INTEGER NOT NULL DEFAULT 0,
  "moduleName" TEXT,
  "extendedDeadline" TIMESTAMP(3),
  "totalMarks" DECIMAL(10,2),
  "highestGrade" TEXT,
  "resubmissionLimit" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentSubmission" (
  "id" SERIAL NOT NULL,
  "assessmentId" INTEGER NOT NULL,
  "studentId" INTEGER NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isLate" BOOLEAN NOT NULL DEFAULT false,
  "status" INTEGER NOT NULL DEFAULT 0,
  "attachmentMetadata" JSONB,
  "resubmissions" INTEGER NOT NULL DEFAULT 0,
  "file_path" TEXT,
  "marks" DECIMAL(10,2),
  "classification" TEXT,
  "resultStatus" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "gradedById" INTEGER,
  "gradedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Assessment_programmeId_status_dueDate_idx" ON "Assessment"("programmeId", "status", "dueDate");
CREATE INDEX "Assessment_createdById_status_idx" ON "Assessment"("createdById", "status");
CREATE UNIQUE INDEX "AssessmentSubmission_assessmentId_studentId_key" ON "AssessmentSubmission"("assessmentId", "studentId");
CREATE INDEX "AssessmentSubmission_studentId_submittedAt_idx" ON "AssessmentSubmission"("studentId", "submittedAt");
CREATE INDEX "AssessmentSubmission_assessmentId_status_idx" ON "AssessmentSubmission"("assessmentId", "status");
CREATE INDEX "AssessmentSubmission_studentId_resultStatus_idx" ON "AssessmentSubmission"("studentId", "resultStatus");
CREATE INDEX "AssessmentSubmission_assessmentId_isPublished_idx" ON "AssessmentSubmission"("assessmentId", "isPublished");

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentSubmission" ADD CONSTRAINT "AssessmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;