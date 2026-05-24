import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/* 🔥 Helper لعمل DateTime صح */
const createDateTime = (baseDate, time) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export async function seedSchedules() {
  console.log("Start seeding schedules...");

  const teacher = await prisma.teacher.findFirst({
    where: { user: { email: "ahmed.teacher@lms.com" } },
  });

  const student = await prisma.student.findFirst({
    where: { user: { email: "john.doe@lms.com" } },
  });
  const subject = await prisma.subjects.findFirst({
    where: { name_en: "Mathematics" },
  });

  if (!teacher || !student || !subject) {
    console.warn(
      "Teacher, student, or subject not found. Skipping schedule seeding.",
    );
    return;
  }

  /* 🗓️ يوم ثابت للاختبار */
  const baseDate = new Date("2026-03-27");

  const schedules = [
    // 🟢 Session أساسية
    {
      title: "Base Session",
      start: "14:00",
      end: "15:00",
      status: "scheduled",
    },

    // 🟢 مفيش تعارض
    {
      title: "No Conflict",
      start: "15:00",
      end: "16:00",
      status: "scheduled",
    },

    // 🔴 Overlap من البداية
    {
      title: "Overlap Start",
      start: "13:30",
      end: "14:30",
      status: "scheduled",
    },

    // 🔴 Overlap من النص
    {
      title: "Overlap Middle",
      start: "14:30",
      end: "15:30",
      status: "scheduled",
    },

    // 🔴 جوه Session
    {
      title: "Inside Session",
      start: "14:15",
      end: "14:45",
      status: "scheduled",
    },

    // 🔴 بيغطي الكل
    {
      title: "Full Cover",
      start: "13:00",
      end: "16:00",
      status: "scheduled",
    },

    // 🟡 cancelled (لازم مايتحسبش)
    {
      title: "Cancelled Session",
      start: "14:00",
      end: "15:00",
      status: "cancelled",
    },
  ];

  /* 🧹 نحذف القديم علشان نضمن consistency */
  await prisma.schedule.deleteMany({
    where: { studentId: student.id },
  });

  for (const item of schedules) {
    await prisma.schedule.create({
      data: {
        teacherId: teacher.id,
        studentId: student.id,
        title: item.title,
        description: item.title,
        status: item.status,
        subjectId: subject.id,

        // 🔥 الأهم
        start_time: createDateTime(baseDate, item.start),
        end_time: createDateTime(baseDate, item.end),

        link: "https://zoom.us/j/test",
      },
    });
  }

  console.log("🔥 Seeder inserted with conflict cases");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSchedules()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
