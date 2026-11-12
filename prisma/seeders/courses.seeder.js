import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedCourses() {
  console.log("Start seeding courses...");

  const subjects = await prisma.subjects.findMany();
  
  if (subjects.length === 0) {
    console.log("No subjects found. Please seed subjects first.");
    return;
  }

  const courses = [
    {
      title: "Algebra Basics",
      description: "Introduction to basic algebra concepts.",
      image: "uploads/courses/Algebra_Basics/algebra.jpg",
      duration: 10.5,
      videoUrl: "https://example.com/videos/algebra.mp4",
      pdfurl: "https://example.com/pdfs/algebra.pdf",
      attatchments: ["https://example.com/attachments/algebra1.pdf"],
      subjectName: "Mathematics"
    },
    {
      title: "Quantum Mechanics 101",
      description: "A comprehensive guide to quantum mechanics.",
      image: "uploads/courses/Quantum_Mechanics_101/quantum.jpg",
      duration: 15.0,
      subjectName: "Physics"
    },
    {
      title: "Organic Chemistry",
      description: "Learn the fundamentals of organic chemistry.",
      image: "uploads/courses/Organic_Chemistry/organic.jpg",
      duration: 12.0,
      subjectName: "Chemistry"
    }
  ];

  for (const courseData of courses) {
    const subject = subjects.find(s => s.name_en === courseData.subjectName);
    if (!subject) continue;

    const { subjectName, ...data } = courseData;

    const existing = await prisma.course.findFirst({
        where: { title: data.title }
    });

    if (!existing) {
        await prisma.course.create({
          data: {
            ...data,
            subjectId: subject.id,
          }
        });
    }
  }

  console.log("Seeded courses.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedCourses()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
