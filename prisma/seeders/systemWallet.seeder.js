import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedSystemWallet() {
  console.log("--- Seeding System Wallet ---");

  try {
    const existing = await prisma.wallet.findFirst({
      where: { type: "system" },
    });

    if (!existing) {
      const defaultCurrency = await prisma.currency.findFirst({
        where: { default: true },
      });

      await prisma.wallet.create({
        data: {
          type: "system",
          ownerId: null,
          balance: 0,
          currencyId: defaultCurrency ? defaultCurrency.id : (await prisma.currency.findFirst())?.id,
        },
      });
      console.log("System wallet created with ID:", defaultCurrency?.code || "Default");
    } else {
      console.log("System wallet already exists.");
    }
  } catch (error) {
    console.error("Error seeding system wallet:", error);
  }
}
