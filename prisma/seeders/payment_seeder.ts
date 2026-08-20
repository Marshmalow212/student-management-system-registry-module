import { PrismaOrm } from "./seeder";
import { UserRole } from "@/lib/auth/roles";

const FULLY_PAID = new Set([1, 2, 3, 4]);
const PARTIALLY_PAID_CURRENT = new Set([5, 6, 7]);
const PARTIALLY_PAID_OVERDUE = new Set([8, 9, 10]);

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function paymentSeeder(prismaOrm: PrismaOrm): Promise<void> {
  await prismaOrm.$transaction(async (tx) => {
    const receivedBy = await tx.user.findFirst({
      where: {
        role: { gte: UserRole.REGISTRAR },
        isActive: true,
      },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (!receivedBy) {
      throw new Error("No active registrar or admin user exists for payments");
    }

    const enrollments = await tx.studentEnrollment.findMany({
      where: { reference: { startsWith: "ENR-SEED-" } },
      orderBy: { reference: "asc" },
      select: {
        id: true,
        reference: true,
        feeTotal: true,
        studentId: true,
      },
    });

    if (enrollments.length !== 10) {
      throw new Error("Expected 10 seeded enrollments before creating payments");
    }

    for (const enrollment of enrollments) {
      const studentNumber = Number(enrollment.reference.slice(-3));
      const fee = Number(enrollment.feeTotal);
      const isFullyPaid = FULLY_PAID.has(studentNumber);
      const isCurrentPartial = PARTIALLY_PAID_CURRENT.has(studentNumber);
      const isOverduePartial = PARTIALLY_PAID_OVERDUE.has(studentNumber);

      if (!isFullyPaid && !isCurrentPartial && !isOverduePartial) {
        throw new Error(`Unknown payment case for seeded student ${studentNumber}`);
      }

      const dueDate = isOverduePartial ? daysFromNow(-30) : daysFromNow(30);
      const amount = isFullyPaid ? fee : fee * (isOverduePartial ? 0.4 : 0.5);
      const paymentDate = isOverduePartial ? daysFromNow(-45) : new Date();

      await tx.studentEnrollment.update({
        where: { id: enrollment.id },
        data: { dueDate },
      });

      await tx.paymentTransaction.upsert({
        where: { idempotencyKey: `SEED-PAYMENT-${String(studentNumber).padStart(3, "0")}` },
        create: {
          reference: `PAY-SEED-${String(studentNumber).padStart(3, "0")}`,
          idempotencyKey: `SEED-PAYMENT-${String(studentNumber).padStart(3, "0")}`,
          enrollmentId: enrollment.id,
          amount: amount.toFixed(2),
          currency: "USD",
          paymentDate,
          receivedById: receivedBy.id,
          note: isFullyPaid
            ? "Seeded fully paid transaction"
            : isOverduePartial
              ? "Seeded partially paid overdue transaction"
              : "Seeded partially paid current transaction",
        },
        update: {},
      });

      await tx.student.update({
        where: { id: enrollment.studentId },
        data: { hasOverdueBalance: isOverduePartial },
      });
    }
  });

  console.log("Payment Seeder Completed");
}

export { paymentSeeder };
