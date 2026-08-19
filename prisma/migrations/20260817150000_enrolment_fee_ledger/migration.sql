CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "StudentEnrollment" (
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "programmeId" INTEGER NOT NULL,
    "enrolledYear" INTEGER NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "feeTotal" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentTransaction" (
    "idempotencyKey" TEXT NOT NULL,
    "id" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentEnrollment_reference_key" ON "StudentEnrollment"("reference");
CREATE UNIQUE INDEX "StudentEnrollment_studentId_programmeId_enrolledYear_key" ON "StudentEnrollment"("studentId", "programmeId", "enrolledYear");
CREATE INDEX "StudentEnrollment_studentId_status_idx" ON "StudentEnrollment"("studentId", "status");
CREATE INDEX "StudentEnrollment_programmeId_enrolledYear_idx" ON "StudentEnrollment"("programmeId", "enrolledYear");
CREATE INDEX "StudentEnrollment_status_dueDate_idx" ON "StudentEnrollment"("status", "dueDate");
CREATE UNIQUE INDEX "PaymentTransaction_idempotencyKey_key" ON "PaymentTransaction"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentTransaction_reference_key" ON "PaymentTransaction"("reference");
CREATE INDEX "PaymentTransaction_enrollmentId_paymentDate_idx" ON "PaymentTransaction"("enrollmentId", "paymentDate");
CREATE INDEX "PaymentTransaction_receivedById_createdAt_idx" ON "PaymentTransaction"("receivedById", "createdAt");

ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_programmeId_fkey"
  FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_receivedById_fkey"
  FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
