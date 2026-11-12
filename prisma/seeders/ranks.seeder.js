import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const defaultRanks = [
  {
    name_ar: "مبتدئ (برونزي)",
    name_en: "Bronze Rank",
    description_ar: "مستوى الطلاب المبتدئين في البداية",
    description_en: "Initial level for beginner students",
    color: "#CD7F32",
    minSessions: 0,
    minPoints: 0,
    active: true,
  },
  {
    name_ar: "متقدم (فضي)",
    name_en: "Silver Rank",
    description_ar: "مستوى الطالب بعد إكمال 10 حصص",
    description_en: "Level for students completing 10 sessions",
    color: "#C0C0C0",
    minSessions: 10,
    minPoints: 100,
    active: true,
  },
  {
    name_ar: "خبير (ذهبي)",
    name_en: "Gold Rank",
    description_ar: "مستوى الطالب بعد إكمال 25 حصة",
    description_en: "Level for students completing 25 sessions",
    color: "#FFD700",
    minSessions: 25,
    minPoints: 250,
    active: true,
  },
  {
    name_ar: "ممتاز (ماسي)",
    name_en: "Diamond Rank",
    description_ar: "أعلى مستوى للطلاب المتميزين بعد إكمال 50 حصة",
    description_en: "Top level for elite students completing 50 sessions",
    color: "#00BFFF",
    minSessions: 50,
    minPoints: 500,
    active: true,
  },
];

export async function seedRanks() {
  console.log("Start seeding ranks...");

  for (const rank of defaultRanks) {
    const existing = await prisma.rank.findFirst({
      where: {
        OR: [{ name_en: rank.name_en }, { name_ar: rank.name_ar }],
      },
    });

    if (!existing) {
      await prisma.rank.create({ data: rank });
    }
  }

  console.log("Seeded ranks successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedRanks()
    .then(async () => {
      await prisma.$disconnect();
      await pool.end();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      await pool.end();
      process.exit(1);
    });
}
