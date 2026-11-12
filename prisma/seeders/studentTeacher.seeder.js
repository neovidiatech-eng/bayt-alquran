import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Seeds student_teacher junction rows.
 * hour_price was removed from the teacher model and lives here instead.
 */
export async function seedStudentTeachers() {
  console.log("Start seeding student-teacher relationships...");

  // Pairs: [teacherEmail, studentEmail, hour_price]
  const links = [
    { teacherEmail: "ahmed.teacher@lms.com", studentEmail: "john.doe@lms.com", hour_price: 25.0 },
    { teacherEmail: "fatima.teacher@lms.com", studentEmail: "jane.smith@lms.com", hour_price: 30.0 },
  ];

  for (const link of links) {
    const teacher = await prisma.teacher.findFirst({
      where: { user: { email: link.teacherEmail } },
    });
    const student = await prisma.student.findFirst({
      where: { user: { email: link.studentEmail } },
    });

    if (!teacher || !student) {
      console.warn(
        `Teacher (${link.teacherEmail}) or Student (${link.studentEmail}) not found, skipping.`,
      );
      continue;
    }

    await prisma.student_teacher.upsert({
      where: {
        studentId_teacherId: {
          studentId: student.id,
          teacherId: teacher.id,
        },
      },
      update: { hour_price: link.hour_price },
      create: {
        studentId: student.id,
        teacherId: teacher.id,
        hour_price: link.hour_price,
      },
    });
  }

  console.log("Seeded student-teacher relationships.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedStudentTeachers()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
