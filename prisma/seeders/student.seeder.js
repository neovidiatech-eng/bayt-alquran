import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const studentData = [
  {
    name: "John Doe",
    email: "john.doe@lms.com",
    password: "Password@123",
    phone: "9998887776",
    code_country: "+20",
    birth_date: new Date("2000-01-01T00:00:00Z"),
    gender: "male",
    country: "Egypt",
    active: true,
    sessions: 10,
    roleName: "student",
  },
  {
    name: "Jane Smith",
    email: "jane.smith@lms.com",
    password: "Password@123",
    phone: "4443332221",
    code_country: "+20",
    birth_date: new Date("2002-05-15T00:00:00Z"),
    gender: "female",
    country: "Egypt",
    active: true,
    sessions: 8,
    roleName: "student",
  },
];

export async function seedStudents() {
  console.log("Start seeding students...");

  const salt = await bcrypt.genSalt(10);

  for (const item of studentData) {
    const role = await prisma.role.findUnique({
      where: { name: item.roleName },
    });

    if (!role) {
      console.warn(
        `Role ${item.roleName} not found, skipping student ${item.email}`,
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

    // Then upsert student linked to the user
    await prisma.student.upsert({
      where: { user_id: user.id },
      update: {
        birth_date: item.birth_date,
        gender: item.gender,
        country: item.country,
        active: item.active,
        sessions: item.sessions,
        sessions_remaining: item.sessions,
      },
      create: {
        user_id: user.id,
        birth_date: item.birth_date,
        gender: item.gender,
        country: item.country,
        active: item.active,
        sessions: item.sessions,
        sessions_remaining: item.sessions,
      },
    });
  }

  console.log("Seeded students successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedStudents()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
