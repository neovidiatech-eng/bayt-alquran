import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedSubscriptionRequests() {
  console.log("Start seeding subscription requests...");

  const students = await prisma.student.findMany({
    take: 5,
    include: { user: true },
  });

  const plans = await prisma.plans.findMany({ take: 3 });

  if (students.length === 0 || plans.length === 0) {
    console.warn("Students or Plans not found. Skipping subscription requests seeding.");
    return;
  }

  const sampleRequests = [
    { studentIndex: 0, planIndex: 0, status: "pending" },
    { studentIndex: 1, planIndex: 1 % plans.length, status: "approved" },
    { studentIndex: Math.min(2, students.length - 1), planIndex: 0, status: "rejected" },
  ];

  for (const reqItem of sampleRequests) {
    const student = students[reqItem.studentIndex];
    const plan = plans[reqItem.planIndex];

    if (!student || !student.user_id || !plan) continue;

    const existingRequest = await prisma.subscription_requests.findFirst({
      where: { user_id: student.user_id, planId: plan.id },
    });

    if (existingRequest) {
      await prisma.subscription_requests.update({
        where: { id: existingRequest.id },
        data: {
          status: reqItem.status,
        },
      });
    } else {
      await prisma.subscription_requests.create({
        data: {
          user_id: student.user_id,
          planId: plan.id,
          status: reqItem.status,
        },
      });
    }
  }

  console.log("Seeded subscription requests successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubscriptionRequests()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
