import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const expenses = [
  {
    title: "Office Rent",
    amount: 1000,
    payment_type: "Bank Transfer",
    type: "Monthly",
    status: "paid",
    date: new Date("2026-03-01"),
    currencyCode: "USD",
  },
  {
    title: "Internet Subscription",
    amount: 50,
    payment_type: "Credit Card",
    type: "Monthly",
    status: "paid",
    date: new Date("2026-03-05"),
    currencyCode: "USD",
  },
  {
    title: "Staff Salaries",
    amount: 50000,
    payment_type: "Bank Transfer",
    type: "Monthly",
    status: "pending",
    date: new Date("2026-03-30"),
    currencyCode: "EGP",
  },
];

export async function seedExpenses() {
  console.log("Start seeding expenses...");

  const dbCurrencies = await prisma.currency.findMany();

  for (const expense of expenses) {
    const currency = dbCurrencies.find((c) => c.code === expense.currencyCode);
    if (!currency) {
      console.warn(
        `Currency with code ${expense.currencyCode} not found for expense ${expense.title}. Skipping.`,
      );
      continue;
    }

    const { currencyCode, ...expenseData } = expense;

    await prisma.expenses.create({
      data: {
        ...expenseData,
        currencyId: currency.id,
      },
    });
  }
  console.log("Seeded expenses.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedExpenses()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
