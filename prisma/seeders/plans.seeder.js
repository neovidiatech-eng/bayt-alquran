import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const plans = [
  {
    name_en: "Free Plan",
    name_ar: "خطة مجانية",
    description: "Start for free",
    price: "0",
    duration: 30,
    sessionsCount: 1,
    sessionTime: 30,
    features: ["Access to free courses", "Basic support"],
    currencyCode: "USD",
  },
  {
    name_en: "Monthly Pro",
    name_ar: "برو شهري",
    description: "Unlock more features",
    price: "15",
    duration: 30,
    sessionsCount: 10,
    sessionTime: 60,
    features: [
      "Access to all courses",
      "Priority support",
      "Certificate of completion",
    ],
    currencyCode: "EUR",
  },
  {
    name_en: "Standard Plan",
    name_ar: "الخطة القياسية",
    description: "Best for regular students",
    price: "500",
    duration: 30,
    sessionsCount: 8,
    sessionTime: 45,
    features: ["Full course access", "Weekly quizzes"],
    currencyCode: "EGP",
  },
];

export async function seedPlans() {
  console.log("Start seeding plans...");

  // Ensure currencies are there to get their IDs
  const dbCurrencies = await prisma.currency.findMany();

  for (const plan of plans) {
    const currency = dbCurrencies.find((c) => c.code === plan.currencyCode);
    if (!currency) {
      console.warn(
        `Currency with code ${plan.currencyCode} not found for plan ${plan.name_en}. Skipping.`,
      );
      continue;
    }

    const { currencyCode, ...planData } = plan;

    await prisma.plans.upsert({
      where: { name_en: planData.name_en }, // Fixed: unique on name_en instead of currencyId
      update: {
        ...planData,
        currency: { connect: { id: currency.id } },
      },
      create: {
        ...planData,
        currency: { connect: { id: currency.id } },
      },
    });
  }
  console.log("Seeded plans.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPlans()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
