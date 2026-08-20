import { PrismaOrm } from "./seeder";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@/lib/auth/roles";
import { StudentEnrollmentStatus } from "@/lib/student-status";

const STUDENT_PASSWORD = "1234@sms";
const ACADEMIC_YEAR = new Date().getFullYear();

const STUDENTS = [
  { number: 1, programmeId: 2 },
  { number: 2, programmeId: 2 },
  { number: 3, programmeId: 2 },
  { number: 4, programmeId: 2 },
  { number: 5, programmeId: 3 },
  { number: 6, programmeId: 3 },
  { number: 7, programmeId: 3 },
  { number: 8, programmeId: 3 },
  { number: 9, programmeId: 1 },
  { number: 10, programmeId: 1 },
] as const;

async function studentSeeder(prismaOrm: PrismaOrm): Promise<void> {
  const passwordHash = await hashPassword(STUDENT_PASSWORD);

  await prismaOrm.$transaction(async (tx) => {
    const programmeSequence = new Map<number, number>();
    const createdBy = await tx.user.findFirst({
      where: {
        role: { gte: UserRole.REGISTRAR },
        isActive: true,
      },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (!createdBy) {
      throw new Error("No active registrar or admin user exists for enrollments");
    }

    const programmes = await tx.programme.findMany({
      where: { id: { in: [1, 2, 3] }, status: "ACTIVE", deletedAt: null },
      select: { id: true, fee: true, discount: true },
    });
    const programmeById = new Map(programmes.map((programme) => [programme.id, programme]));

    for (const definition of STUDENTS) {
      const sequence = (programmeSequence.get(definition.programmeId) ?? 0) + 1;
      programmeSequence.set(definition.programmeId, sequence);
      const studentUid = `SMS-${ACADEMIC_YEAR}-${definition.programmeId}${String(sequence).padStart(4, "0")}`;
      const email = `${studentUid.toLowerCase().replaceAll("-", "_")}@example.edu`;
      const fullName = `Student ${definition.number}`;

      const user = await tx.user.upsert({
        where: { email },
        create: {
          email,
          name: fullName,
          passwordHash,
          role: UserRole.STUDENT,
          studentId: studentUid,
          isActive: true,
          isVerified: true,
        },
        update: {
          name: fullName,
          passwordHash,
          role: UserRole.STUDENT,
          studentId: studentUid,
          isActive: true,
          isVerified: true,
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
          otpSentAt: null,
        },
        select: { id: true },
      });

      const student = await tx.student.upsert({
        where: { studentUid },
        create: {
          studentUid,
          fullName,
          email,
          academicYear: ACADEMIC_YEAR,
          status: StudentEnrollmentStatus.ENROLLED,
          programmeId: definition.programmeId,
          userId: user.id,
        },
        update: {
          fullName,
          email,
          academicYear: ACADEMIC_YEAR,
          status: StudentEnrollmentStatus.ENROLLED,
          programmeId: definition.programmeId,
          userId: user.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      const programme = programmeById.get(definition.programmeId);
      if (!programme) {
        throw new Error(`Programme ${definition.programmeId} is missing or inactive`);
      }

      await tx.studentEnrollment.upsert({
        where: {
          studentId_programmeId_enrolledYear: {
            studentId: student.id,
            programmeId: definition.programmeId,
            enrolledYear: ACADEMIC_YEAR,
          },
        },
        create: {
          reference: `ENR-SEED-${String(definition.number).padStart(3, "0")}`,
          studentId: student.id,
          programmeId: definition.programmeId,
          enrolledYear: ACADEMIC_YEAR,
          status: StudentEnrollmentStatus.ENROLLED,
          createdById: createdBy.id,
          feeSnapshot: programme.fee,
          discountSnapshot: programme.discount,
          feeTotal: programme.fee,
        },
        update: {
          status: StudentEnrollmentStatus.ENROLLED,
          createdById: createdBy.id,
        },
      });
    }
  });

  console.log("Student Seeder Completed");
}

export { studentSeeder };
