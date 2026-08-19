-- Collapse result data into AssessmentSubmission.
-- IF NOT EXISTS keeps this safe for the destructive reset plan and for
-- environments that already applied the earlier assessment migrations.
ALTER TABLE "AssessmentSubmission"
  ADD COLUMN IF NOT EXISTS "resubmissions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "file_path" TEXT,
  ADD COLUMN IF NOT EXISTS "marks" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "classification" TEXT,
  ADD COLUMN IF NOT EXISTS "resultStatus" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "gradedById" INTEGER,
  ADD COLUMN IF NOT EXISTS "gradedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE "AssessmentSubmission"
  ADD CONSTRAINT "AssessmentSubmission_gradedById_fkey"
  FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE IF EXISTS "AssessmentResult";

CREATE INDEX IF NOT EXISTS "AssessmentSubmission_studentId_resultStatus_idx"
  ON "AssessmentSubmission"("studentId", "resultStatus");
CREATE INDEX IF NOT EXISTS "AssessmentSubmission_assessmentId_isPublished_idx"
  ON "AssessmentSubmission"("assessmentId", "isPublished");
