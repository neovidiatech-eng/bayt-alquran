import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const subjects = [
  {
    name_en: "Mathematics",
    name_ar: "الرياضيات",
    active: true,
    color: "#3498db",
  },
  { name_en: "Physics", name_ar: "الفيزياء", active: true, color: "#e74c3c" },
  { name_en: "Chemistry", name_ar: "الكيمياء", active: true, color: "#2ecc71" },
  { name_en: "Biology", name_ar: "الأحياء", active: true, color: "#f1c40f" },
  {
    name_en: "English",
    name_ar: "اللغة الإنجليزية",
    active: true,
    color: "#9b59b6",
  },
  {
    name_en: "Arabic",
    name_ar: "اللغة العربية",
    active: true,
    color: "#34495e",
  },
  { name_en: "History", name_ar: "التاريخ", active: true, color: "#e67e22" },
  {
    name_en: "Geography",
    name_ar: "الجغرافيا",
    active: true,
    color: "#1abc9c",
  },
];

export async function seedSubjects() {
  console.log("Start seeding subjects...");
  for (const subject of subjects) {
    await prisma.subjects.upsert({
      where: { name_en: subject.name_en },
      update: subject,
      create: subject,
    });
  }
  console.log("Seeded subjects.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubjects()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
