import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { encryptPassword } from "../../src/Utils/Security/index.js";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const stuffData = [
    {
      name: "Super Admin",
      email: "superadmin@lms.com",
      password: "Password@123",
      phone: "1234567890",
      code_country: "+20",
      roleName: "super_admin",
    },
  {
    name: "Admin User",
    email: "admin@lms.com",
    password: "Password@123",
    phone: "1234567891",
    code_country: "+20",
    roleName: "admin",
  },
  {
    name: "Teacher User",
    email: "teacher@lms.com",
    password: "Password@123",
    phone: "1234567892",
    code_country: "+20",
    roleName: "teacher",
  },
];

export async function seedStuff() {
  console.log("Start seeding stuff...");

  for (const item of stuffData) {
    const role = await prisma.role.findUnique({
      where: { name: item.roleName },
    });

    if (!role) {
      console.warn(
        `Role ${item.roleName} not found, skipping user ${item.email}`,
      );
      continue;
    }

    const encryptedPassword = encryptPassword({ password: item.password });

    // Find or create user first
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        name: item.name,
        phone: item.phone,
        code_country: item.code_country,
        roleId: role.id,
      },
      create: {
        email: item.email,
        password: encryptedPassword,
        name: item.name,
        phone: item.phone,
        code_country: item.code_country,
        status: "active",
        confirmAt: new Date(),
        roleId: role.id,
      },
    });

    // Then upsert stuff linked to the user
    await prisma.stuff.upsert({
      where: { user_id: user.id },
      update: {
        roleId: role.id,
      },
      create: {
        user_id: user.id,
        roleId: role.id,
      },
    });
  }

  console.log("Seeded stuff successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedStuff()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
