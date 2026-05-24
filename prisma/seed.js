import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { seedCurrencies } from "./seeders/currency.seeder.js";
import { seedPlans } from "./seeders/plans.seeder.js";
import { seedSubjects } from "./seeders/subjects.seeder.js";
import { seedCourses } from "./seeders/courses.seeder.js";
import { seedPermissions } from "./seeders/permissionsSeeder.js";
import { seedStuff } from "./seeders/stuff.seeder.js";
import { seedTeachers } from "./seeders/teachers.seeder.js";
import { seedStudents } from "./seeders/student.seeder.js";
import { seedSchedules } from "./seeders/schedules.seeder.js";
import { seedTeacherSubjects } from "./seeders/teacherSubject.seeder.js";
import { seedSubscriptionRequests } from "./seeders/subscriptionRequests.seeder.js";
import { seedExpenses } from "./seeders/expenses.seeder.js";
import { seedSubscriptions } from "./seeders/subscriptions.seeder.js";
import { seedSystemWallet } from "./seeders/systemWallet.seeder.js";
import { seedSettings } from "./seeders/settings.seeder.js";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- Starting Global Seeding ---");
// seeders 
  await seedCurrencies();
  await seedPlans();
  await seedSubjects();
  await seedCourses();
  await seedPermissions();
  await seedStuff();
  await seedTeachers();
  await seedTeacherSubjects();
  await seedStudents();
  await seedSubscriptionRequests();
  await seedSchedules();
  await seedExpenses();
  await seedSystemWallet();
  await seedSettings();

  console.log("--- Seeding Finished Successfully ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
