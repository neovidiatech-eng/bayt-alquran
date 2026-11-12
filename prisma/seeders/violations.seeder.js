import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const defaultInfractionItems = [
  {
    title_ar: "عدم فتح الكاميرا أثناء الحصة",
    title_en: "Camera Off During Lecture",
    description: "المعلم لم يقم بفتح الكاميرا طوال فترة الحصة",
    defaultType: "warning",
    defaultDeductionAmount: 0,
    active: true,
  },
  {
    title_ar: "التأخر عن موعد الحصة بدون عذر",
    title_en: "Unexcused Late Arrival",
    description: "تأخر المعلم عن الدخول لبداية الحصة بدون إذن مسبق",
    defaultType: "penalty",
    defaultDeductionAmount: 50,
    active: true,
  },
  {
    title_ar: "مغادرة الحصة قبل انتهائها",
    title_en: "Leaving Lecture Early",
    description: "انهاء المعلم للحصة قبل وقت انتهاء الوقت المحدد",
    defaultType: "penalty",
    defaultDeductionAmount: 30,
    active: true,
  },
  {
    title_ar: "عدم الالتزام بالمظهر المناسب",
    title_en: "Inappropriate Appearance",
    description: "مخالفة معايير الزي والظهور الاحترافي",
    defaultType: "warning",
    defaultDeductionAmount: 0,
    active: true,
  },
  {
    title_ar: "سلوك غير لائق أو التعامل غير احترافي",
    title_en: "Inappropriate Conduct",
    description: "التعامل غير الاحترافي مع الطلاب أو المشرفين",
    defaultType: "penalty",
    defaultDeductionAmount: 100,
    active: true,
  },
];

export async function seedInfractionItems() {
  console.log("Start seeding infraction items...");

  for (const item of defaultInfractionItems) {
    const existing = await prisma.infractionItem.findFirst({
      where: { title_en: item.title_en },
    });

    if (!existing) {
      await prisma.infractionItem.create({ data: item });
    }
  }

  console.log("Seeded infraction items successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedInfractionItems()
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
