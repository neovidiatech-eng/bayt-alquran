import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const teachersData = [
  {
    name: "Ahmed Teacher",
    email: "ahmed.teacher@lms.com",
    password: "Password@123",
    phone: "1112223334",
    code_country: "+20",
    gender: "Male",
    hour_price: 25.0,
    active: true,
    roleName: "teacher",
    currencyCode: "EGP",
  },
  {
    name: "Fatima Teacher",
    email: "fatima.teacher@lms.com",
    password: "Password@123",
    phone: "5556667778",
    code_country: "+20",
    gender: "Female",
    hour_price: 30.0,
    active: true,
    roleName: "teacher",
    currencyCode: "USD",
  },
];

export async function seedTeachers() {
  console.log("Start seeding teachers...");

  const salt = await bcrypt.genSalt(10);

  for (const item of teachersData) {
    const role = await prisma.role.findUnique({
      where: { name: item.roleName },
    });

    if (!role) {
      console.warn(
        `Role ${item.roleName} not found, skipping teacher ${item.email}`,
      );
      continue;
    }

    let currency = null;
    if (item.currencyCode) {
      currency = await prisma.currency.findUnique({
        where: { code: item.currencyCode },
      });
    }

    if (!currency) {
      currency = await prisma.currency.findFirst();
    }

    if (!currency) {
      console.warn(
        "No currency found. Please seed currencies first. Skipping teacher.",
      );
      continue;
    }

    const hashedPassword = await bcrypt.hash(item.password, salt);

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
        password: hashedPassword,
        name: item.name,
        phone: item.phone,
        code_country: item.code_country,
        status: "active",
        confirmAt: new Date(),
        roleId: role.id,
      },
    });

    // Then upsert teacher linked to the user
    await prisma.teacher.upsert({
      where: { user_id: user.id },
      update: {
        gender: item.gender,
        hour_price: item.hour_price,
        active: item.active,
        currencyId: currency.id,
      },
      create: {
        user_id: user.id,
        gender: item.gender,
        hour_price: item.hour_price,
        active: item.active,
        currencyId: currency.id,
      },
    });
  }

  console.log("Seeded teachers successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedTeachers()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
