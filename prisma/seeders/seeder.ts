import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/db/prisma/client";
import { adminUserSeeder } from "@/prisma/seeders/admin_seeder";
import { programmeSeeder } from "@/prisma/seeders/programme_seeder";
import { studentSeeder } from "@/prisma/seeders/student_seeder";
import { paymentSeeder } from "@/prisma/seeders/payment_seeder";
import { gradeSeeder } from "@/prisma/seeders/grade_seeder";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export type PrismaOrm = typeof prisma;

async function main() {
  const seeder = process.argv[2];

  switch (seeder) {
    case "admin":
      await adminUserSeeder(prisma);
      break;

    case "programme":
      await programmeSeeder(prisma);
      break;

    case "student":
      await studentSeeder(prisma);
      break;

    case "payment":
      await paymentSeeder(prisma);
      break;

    case "grade":
      await gradeSeeder(prisma);
      break;

    default:
      await adminUserSeeder(prisma);
      await programmeSeeder(prisma);
      await studentSeeder(prisma);
      await paymentSeeder(prisma);
      await gradeSeeder(prisma);
}

}



main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });