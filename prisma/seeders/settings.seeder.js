import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const defaultDiscounts = {
  lateDiscountRules: [
    {
      lateMinutes: 10,
      discountPercentage: 5,
    },
  ],
};

export async function seedSettings() {
  console.log("Start seeding settings...");
  const existing = await prisma.setting.findFirst();

  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { discounts: defaultDiscounts },
    });
  } else {
    await prisma.setting.create({
      data: { discounts: defaultDiscounts },
    });
  }

  console.log("Seeded settings.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSettings()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
