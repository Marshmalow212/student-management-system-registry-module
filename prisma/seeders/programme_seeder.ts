import { PrismaOrm } from "./seeder";

const PROGRAMMES = [
  { name: "Bachelors of Business Technology", fee: 120000 },
  { name: "Bachelors of Business Information Technology", fee: 150000 },
  { name: "Bachelors of Information Security", fee: 130000 },
] as const;

async function programmeSeeder(prismaOrm: PrismaOrm): Promise<void> {
  await prismaOrm.$transaction(async (tx) => {
    for (const programme of PROGRAMMES) {
      await tx.programme.upsert({
        where: { name: programme.name },
        create: {
          name: programme.name,
          fee: programme.fee,
          discount: 0,
          status: "ACTIVE",
        },
        update: {
          fee: programme.fee,
          discount: 0,
          status: "ACTIVE",
          deletedAt: null,
        },
      });
    }
  });

  console.log("Programme Seeder Completed");
}

export { programmeSeeder };
