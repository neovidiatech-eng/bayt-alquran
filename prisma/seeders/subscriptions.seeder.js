import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedSubscriptions() {
  console.log("Start seeding subscriptions...");

  const student = await prisma.student.findFirst({
    where: { user: { email: "john.doe@lms.com" } },
    include: { user: true }
  });

  const plan = await prisma.plans.findFirst({
    where: { name_en: "Monthly Pro" }
  });

  const currency = await prisma.currency.findFirst({
    where: { code: "USD" }
  });

  if (!student || !student.user_id) {
    console.warn("Student or associated user not found. Skipping subscriptions.");
    return;
  }

  if (!plan) {
    console.warn("Plan 'Monthly Pro' not found. Skipping subscriptions.");
    return;
  }

  if (!currency) {
    console.warn("Currency 'USD' not found. Skipping subscriptions.");
    return;
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId: student.user_id }
  });

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planId: plan.id,
        status: "active",
        amount: parseFloat(plan.price) || 50,
        currencyId: currency.id,
        paidAt: new Date()
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId: student.user_id,
        planId: plan.id,
        status: "active",
        amount: parseFloat(plan.price) || 50,
        currencyId: currency.id,
        paidAt: new Date()
      },
    });
  }

  console.log("Seeded subscriptions.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubscriptions()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
