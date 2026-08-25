import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const sampleReviewsData = [
  {
    rating: 5,
    comment: "Excellent session! The explanation was very clear and helpful.",
    role: "student",
  },
  {
    rating: 4,
    comment: "Good lesson, covered all key concepts well.",
    role: "student",
  },
  {
    rating: 5,
    comment: "Great teacher, very patient and knowledgeable.",
    role: "student",
  },
  {
    rating: 5,
    comment: "Great student, very active and completed all tasks on time.",
    role: "teacher",
  },
  {
    rating: 4,
    comment: "Good participation and interest during the session.",
    role: "teacher",
  },
];

export async function updateAverageRatings() {
  // Update teachers avgRating & totalReviews
  const teachers = await prisma.teacher.findMany();
  for (const t of teachers) {
    const reviews = await prisma.review.findMany({
      where: { revieweeId: t.user_id, isHidden: false },
    });
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avg = total / reviews.length;
      await prisma.teacher.update({
        where: { id: t.id },
        data: { avgRating: avg, totalReviews: reviews.length },
      });
    }
  }

  // Update students avgRating & totalReviews
  const students = await prisma.student.findMany();
  for (const s of students) {
    const reviews = await prisma.review.findMany({
      where: { revieweeId: s.user_id, isHidden: false },
    });
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avg = total / reviews.length;
      await prisma.student.update({
        where: { id: s.id },
        data: { avgRating: avg, totalReviews: reviews.length },
      });
    }
  }
}

export async function seedReviews() {
  console.log("Start seeding reviews...");

  const schedules = await prisma.schedule.findMany({
    include: {
      teacher: { include: { user: true } },
      student: { include: { user: true } },
    },
  });

  if (schedules.length === 0) {
    console.warn(
      "No schedules found. Please seed schedules first. Skipping reviews seeding.",
    );
    return;
  }

  let count = 0;

  for (let i = 0; i < schedules.length; i++) {
    const sched = schedules[i];
    if (!sched.teacher || !sched.student) continue;

    const teacherUserId = sched.teacher.user_id;
    const studentUserId = sched.student.user_id;

    // Student reviews Teacher
    const studentReview = sampleReviewsData[i % 3];
    await prisma.review.upsert({
      where: {
        scheduleId_reviewerId: {
          scheduleId: sched.id,
          reviewerId: studentUserId,
        },
      },
      update: {
        revieweeId: teacherUserId,
        rating: studentReview.rating,
        comment: studentReview.comment,
        role: "student",
        isHidden: false,
      },
      create: {
        scheduleId: sched.id,
        reviewerId: studentUserId,
        revieweeId: teacherUserId,
        rating: studentReview.rating,
        comment: studentReview.comment,
        role: "student",
        isHidden: false,
      },
    });
    count++;

    // Teacher reviews Student (on alternate sessions)
    if (i % 2 === 0) {
      const teacherReview = sampleReviewsData[3 + (i % 2)];
      await prisma.review.upsert({
        where: {
          scheduleId_reviewerId: {
            scheduleId: sched.id,
            reviewerId: teacherUserId,
          },
        },
        update: {
          revieweeId: studentUserId,
          rating: teacherReview.rating,
          comment: teacherReview.comment,
          role: "teacher",
          isHidden: false,
        },
        create: {
          scheduleId: sched.id,
          reviewerId: teacherUserId,
          revieweeId: studentUserId,
          rating: teacherReview.rating,
          comment: teacherReview.comment,
          role: "teacher",
          isHidden: false,
        },
      });
      count++;
    }
  }

  await updateAverageRatings();

  console.log(`Seeded ${count} reviews successfully.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedReviews()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
