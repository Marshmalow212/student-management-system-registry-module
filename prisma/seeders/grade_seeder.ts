import { PrismaOrm } from "./seeder";
import { UserRole } from "@/lib/auth/roles";

const ASSESSMENT_STATUS_RESULT = 3;
const SUBMISSION_STATUS_GRADED = 2;
const RESULT_STATUS_ON_HOLD = 2;
const RESULT_STATUS_PUBLISHED = 3;
const SEEDED_PROGRAMME_IDS = [1, 2, 3] as const;
const LOCAL_ASSET_PATH = "/asset/assessment-lorem-ipsum.pdf";

function resultClassification(score: number): string {
  switch (true) {
    case score >= 70:
      return "Distinction";
    case score >= 60:
      return "Merit";
    case score >= 40:
      return "Pass";
    default:
      return "Fail";
  }
}

async function gradeSeeder(prismaOrm: PrismaOrm): Promise<void> {
  await prismaOrm.$transaction(async (tx) => {
    const staff = await tx.user.findFirst({
      where: {
        role: UserRole.STAFF,
        isActive: true,
      },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (!staff) {
      throw new Error("No active staff user exists for assessments");
    }

    const programmes = await tx.programme.findMany({
      where: {
        id: { in: [...SEEDED_PROGRAMME_IDS] },
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true },
    });
    const programmeIds = new Set(programmes.map((programme) => programme.id));

    if (programmeIds.size !== SEEDED_PROGRAMME_IDS.length) {
      throw new Error("Expected all three seeded programmes before creating grades");
    }

    for (const programmeId of SEEDED_PROGRAMME_IDS) {
      const title = `Seeded Assessment Programme ${programmeId}`;
      const existingAssessment = await tx.assessment.findFirst({
        where: { title, programmeId },
        select: { id: true },
      });
      const assessment = existingAssessment
        ? await tx.assessment.update({
            where: { id: existingAssessment.id },
            data: {
              createdById: staff.id,
              dueDate: new Date(),
              extendedDeadline: null,
              maxMarks: 100,
              totalMarks: 100,
              highestGrade: null,
              resubmissionLimit: 1,
              status: ASSESSMENT_STATUS_RESULT,
            },
            select: { id: true },
          })
        : await tx.assessment.create({
            data: {
              title,
              subjectName: "Seeded Core Module",
              moduleName: "Seeded Core Module",
              programmeId,
              createdById: staff.id,
              dueDate: new Date(),
              maxMarks: 100,
              totalMarks: 100,
              highestGrade: null,
              resubmissionLimit: 1,
              status: ASSESSMENT_STATUS_RESULT,
            },
            select: { id: true },
          });

      const enrollments = await tx.studentEnrollment.findMany({
        where: {
          programmeId,
          status: 1,
          reference: { startsWith: "ENR-SEED-" },
        },
        select: {
          studentId: true,
          student: { select: { hasOverdueBalance: true } },
        },
      });

      for (const enrollment of enrollments) {
        const isOnHold = enrollment.student.hasOverdueBalance;
        const resultStatus = isOnHold
          ? RESULT_STATUS_ON_HOLD
          : RESULT_STATUS_PUBLISHED;
        const gradedAt = new Date();
        const marks = 80;
        const classification = resultClassification(marks);

        await tx.assessmentSubmission.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: assessment.id,
              studentId: enrollment.studentId,
            },
          },
          create: {
            assessmentId: assessment.id,
            studentId: enrollment.studentId,
            submittedAt: gradedAt,
            status: SUBMISSION_STATUS_GRADED,
            resubmissions: 0,
            file_path: LOCAL_ASSET_PATH,
            marks,
            classification,
            resultStatus,
            isPublished: !isOnHold,
            gradedById: staff.id,
            gradedAt,
            publishedAt: isOnHold ? null : gradedAt,
          },
          update: {
            status: SUBMISSION_STATUS_GRADED,
            marks,
            classification,
            resultStatus,
            isPublished: !isOnHold,
            gradedById: staff.id,
            gradedAt,
            publishedAt: isOnHold ? null : gradedAt,
          },
        });
      }
    }
  });

  console.log("Grade Seeder Completed");
}

export { gradeSeeder };
