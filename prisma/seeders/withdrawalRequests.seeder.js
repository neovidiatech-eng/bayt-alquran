import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedWithdrawalRequests() {
  console.log("Start seeding withdrawal requests...");

  const [teachers, currency] = await Promise.all([
    prisma.teacher.findMany({
      include: { user: true },
      take: 3,
    }),
    prisma.currency.findFirst(),
  ]);

  if (teachers.length === 0) {
    console.warn("No teachers found. Skipping withdrawal requests seeding.");
    return;
  }

  const sampleWithdrawalData = [
    {
      teacherIndex: 0,
      amount: 150.0,
      status: "pending",
      adminNotes: null,
    },
    {
      teacherIndex: Math.min(1, teachers.length - 1),
      amount: 300.0,
      status: "approved",
      adminNotes: "Payout processed via bank transfer.",
    },
    {
      teacherIndex: Math.min(2, teachers.length - 1),
      amount: 500.0,
      status: "rejected",
      adminNotes: "Insufficient earnings balance.",
    },
  ];

  for (const item of sampleWithdrawalData) {
    const teacher = teachers[item.teacherIndex];
    if (!teacher || !teacher.user_id) continue;

    const existingRequest = await prisma.withdrawalRequest.findFirst({
      where: {
        teacherId: teacher.user_id,
        amount: item.amount,
      },
    });

    if (existingRequest) {
      await prisma.withdrawalRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: item.status,
          adminNotes: item.adminNotes,
          currencyId: currency?.id || null,
        },
      });
    } else {
      await prisma.withdrawalRequest.create({
        data: {
          teacherId: teacher.user_id,
          amount: item.amount,
          status: item.status,
          adminNotes: item.adminNotes,
          currencyId: currency?.id || null,
        },
      });
    }
  }

  console.log("Seeded withdrawal requests successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedWithdrawalRequests()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
