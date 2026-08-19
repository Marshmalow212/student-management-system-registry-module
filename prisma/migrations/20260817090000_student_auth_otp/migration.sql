-- Add student identity and verification state without changing existing staff rows.
ALTER TABLE "User"
    ADD COLUMN "studentId" TEXT,
    ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "otpHash" TEXT,
    ADD COLUMN "otpExpiresAt" TIMESTAMP(3),
    ADD COLUMN "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "otpSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");