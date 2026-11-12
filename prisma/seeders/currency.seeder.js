import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const currencies = [
  {
    name_en: "US Dollar",
    name_ar: "دولار أمريكي",
    symbol: "$",
    code: "USD",
    exchangeRate: 1,
    default: true,
  },
  {
    name_en: "Euro",
    name_ar: "يورو",
    symbol: "€",
    code: "EUR",
    exchangeRate: 0.92,
    default: false,
  },
  {
    name_en: "Egyptian Pound",
    name_ar: "جنيه مصري",
    symbol: "EGP",
    code: "EGP",
    exchangeRate: 48.5,
    default: false,
  },
  {
    name_en: "Saudi Riyal",
    name_ar: "ريال سعودي",
    symbol: "SAR",
    code: "SAR",
    exchangeRate: 3.75,
    default: false,
  },
  {
    name_en: "UAE Dirham",
    name_ar: "درهم إماراتي",
    symbol: "AED",
    code: "AED",
    exchangeRate: 3.67,
    default: false,
  },
];

export async function seedCurrencies() {
  console.log("Start seeding currencies...");
  const seeded = await Promise.all(
    currencies.map((currency) =>
      prisma.currency.upsert({
        where: { code: currency.code },
        update: currency,
        create: currency,
      }),
    ),
  );
  console.log("Seeded currencies.");
  return seeded;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedCurrencies()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
