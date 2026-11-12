import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedTeacherSubjects() {
  console.log("Start seeding teacher-subject relationships...");

  const teachers = await prisma.teacher.findMany();
  const subjects = await prisma.subjects.findMany();

  if (teachers.length === 0 || subjects.length === 0) {
    console.warn("No teachers or subjects found to link.");
    return;
  }

  // Link first teacher to the first two subjects
  const teacher1 = teachers[0];
  const teacher2 = teachers[1] || teachers[0];

  const relations = [
    { teacherId: teacher1.id, subjectId: subjects[0].id },
    { teacherId: teacher1.id, subjectId: subjects[1].id || subjects[0].id },
    { teacherId: teacher2.id, subjectId: subjects[2].id || subjects[0].id },
  ];

  for (const relation of relations) {
    await prisma.teacher_subject.upsert({
      where: {
        teacherId_subjectId: {
          teacherId: relation.teacherId,
          subjectId: relation.subjectId,
        },
      },
      update: {},
      create: {
        teacherId: relation.teacherId,
        subjectId: relation.subjectId,
      },
    });
  }

  console.log("Seeded teacher-subject relationships.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedTeacherSubjects()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
