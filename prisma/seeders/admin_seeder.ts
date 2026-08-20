import { PrismaOrm } from "./seeder";
import { LogEvent } from "@/lib/auth/log-events";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@/lib/auth/roles";

async function adminUserSeeder(prismaOrm: PrismaOrm): Promise<void> {
  try {

  
  const commonPass = "1234@sms";
  let newAdmin = {
    email: "alice@example.com",
    name: "Alice",
    role: 3,
  };

  let newStaffs = [
    {
      email: "bob@example.com",
      name: "Bob",
      role: 2,
    },
    {
      email: "john@example.com",
      name: "John",
      role: 1,
    },
  ];
  // Hash password
  const passwordHash = await hashPassword(commonPass);
  const ipAddress = "server terminal";
  const userAgent = "seeder script";

  await prismaOrm.$transaction(async (tx) => {

    const newUser = await prismaOrm.user.create({
      data: {
        email: newAdmin.email,
        name: newAdmin.name,
        passwordHash,
        role: newAdmin.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    // Log registration
    await prismaOrm.userLog.create({
      data: {
        userId: newUser.id,
        eventType: LogEvent.REGISTER,
        ipAddress,
        userAgent,
        metadata: {
          email: newAdmin.email,
          role: newAdmin.role,
        },
      },
    });
  
    newStaffs.forEach(async (staff) => {
      const newStaffUser = await prismaOrm.user.create({
        data: {
          email: staff.email,
          name: staff.name,
          passwordHash,
          role: staff.role,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
      // Log registration
      await prismaOrm.userLog.create({
        data: {
          userId: newStaffUser.id,
          eventType: LogEvent.REGISTER,
          ipAddress,
          userAgent,
          metadata: {
            email: newStaffUser.email,
            role: newStaffUser.role,
          },
        },
      });
    });
  })
  // Created user
  const newUser = [
    ...newStaffs,
    newAdmin
  ]

  console.log("Admin Seeder Completed", newUser);
  }catch (error) {
    console.error("Error seeding admin user:", error);
  }
}

export { adminUserSeeder };
