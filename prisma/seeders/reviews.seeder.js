import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedReviews() {
  console.log("Start seeding reviews...");

  const student = await prisma.student.findFirst({ include: { user: true } });
  const teacher = await prisma.teacher.findFirst({ include: { user: true } });

  if (!student || !teacher) {
    console.warn("Student or teacher not found. Skipping review seeding.");
    return;
  }

  const schedules = await prisma.schedule.findMany({
    take: 5,
  });

  if (!schedules.length) {
    console.warn("No schedules found. Skipping review seeding.");
    return;
  }

  const sampleComments = [
    "حصة ممتازة وشرح رائع ممتن جداً للمعلم.",
    "ممتاز جداً والتزام تام بالوقت وأسلوب مبسط في الشرح.",
    "شرح رائع ومفيد جداً، جزاك الله خيراً.",
    "Great session, very interactive and clear explanations!",
    "معلم متميز وطريقة التوصيل سهلة وسريعة الفهم.",
  ];

  let seededCount = 0;

  for (let i = 0; i < schedules.length; i++) {
    const s = schedules[i];

    if (!s.studentId) {
      await prisma.schedule.update({
        where: { id: s.id },
        data: { studentId: student.id },
      });
    }

    const reviewerId = student.user.id;
    const revieweeId = teacher.user.id;
    const rating = 4 + (i % 2);
    const comment = sampleComments[i % sampleComments.length];

    await prisma.review.upsert({
      where: {
        scheduleId_reviewerId: {
          scheduleId: s.id,
          reviewerId,
        },
      },
      update: {
        revieweeId,
        rating,
        comment,
        role: "student",
      },
      create: {
        scheduleId: s.id,
        reviewerId,
        revieweeId,
        rating,
        comment,
        role: "student",
      },
    });

    seededCount++;
  }

  console.log(`Seeded ${seededCount} reviews successfully.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedReviews()
    .catch((e) => {
      console.error("Error seeding reviews:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
