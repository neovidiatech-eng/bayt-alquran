import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedTransactions() {
  console.log("--- Seeding Transactions for Current Month ---");

  try {
    let systemWallet = await prisma.wallet.findFirst({
      where: { type: "system" },
    });

    if (!systemWallet) {
      const defaultCurrency =
        (await prisma.currency.findFirst({ where: { default: true } })) ||
        (await prisma.currency.findFirst());

      systemWallet = await prisma.wallet.create({
        data: {
          type: "system",
          balance: 10000,
          currencyId: defaultCurrency?.id,
        },
      });
      console.log("Created system wallet:", systemWallet.id);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const transactionsData = [
      {
        type: "subscription",
        amount: 150.0,
        status: "completed",
        reason: { en: "Student Plan Subscription - Basic", ar: "اشتراك طالب - الباقة الأساسية" },
        createdAt: new Date(currentYear, currentMonth, 1, 10, 30),
      },
      {
        type: "expense",
        amount: 45.0,
        status: "completed",
        reason: { en: "Internet & Cloud Service Services", ar: "مصروفات خدمات الإنترنت والسحابة" },
        createdAt: new Date(currentYear, currentMonth, 2, 14, 15),
      },
      {
        type: "credit",
        amount: 300.0,
        status: "completed",
        reason: { en: "Wallet Top-up by Admin", ar: "شحن المحفظة بواسطة المسؤول" },
        createdAt: new Date(currentYear, currentMonth, 3, 9, 0),
      },
      {
        type: "debit",
        amount: 60.0,
        status: "completed",
        reason: { en: "Platform Processing Fee", ar: "رسوم معالجة المنصة" },
        createdAt: new Date(currentYear, currentMonth, 4, 16, 45),
      },
      {
        type: "subscription",
        amount: 250.0,
        status: "completed",
        reason: { en: "Student Plan Subscription - Premium", ar: "اشتراك طالب - الباقة المميزة" },
        createdAt: new Date(currentYear, currentMonth, 5, 11, 20),
      },
      {
        type: "withdrawal",
        amount: 500.0,
        status: "pending",
        reason: { en: "Teacher Withdrawal Payout Request", ar: "طلب سحب أرباح معلم" },
        createdAt: new Date(currentYear, currentMonth, 6, 15, 10),
      },
      {
        type: "expense",
        amount: 120.0,
        status: "completed",
        reason: { en: "Educational Content Software License", ar: "ترخيص برامج المحتوى التعليمي" },
        createdAt: new Date(currentYear, currentMonth, 7, 13, 0),
      },
      {
        type: "subscription",
        amount: 95.0,
        status: "completed",
        reason: { en: "Student Monthly Renewal", ar: "تجديد اشتراك طالب شهري" },
        createdAt: new Date(currentYear, currentMonth, 8, 10, 0),
      },
      {
        type: "credit",
        amount: 400.0,
        status: "pending",
        reason: { en: "Pending Bank Transfer Deposit", ar: "إيداع تحويل بنكي معلق" },
        createdAt: new Date(currentYear, currentMonth, 8, 14, 30),
      },
      {
        type: "subscription",
        amount: 200.0,
        status: "completed",
        reason: { en: "Student Plan Subscription - Pro", ar: "اشتراك طالب - باقة برو" },
        createdAt: new Date(currentYear, currentMonth, 10, 9, 45),
      },
      {
        type: "expense",
        amount: 85.0,
        status: "completed",
        reason: { en: "Marketing & Ads Expense", ar: "مصروفات التسويق والإعلانات" },
        createdAt: new Date(currentYear, currentMonth, 12, 16, 20),
      },
      {
        type: "withdrawal",
        amount: 650.0,
        status: "completed",
        reason: { en: "Teacher Earnings Payout", ar: "صرف أرباح المعلم" },
        createdAt: new Date(currentYear, currentMonth, 15, 12, 0),
      },
      {
        type: "credit",
        amount: 180.0,
        status: "completed",
        reason: { en: "Course Special Offer Payment", ar: "دفع عرض خاص للكورس" },
        createdAt: new Date(currentYear, currentMonth, 18, 17, 15),
      },
      {
        type: "subscription",
        amount: 320.0,
        status: "completed",
        reason: { en: "Student Annual VIP Plan", ar: "اشتراك VIP السنوي لطالب" },
        createdAt: new Date(currentYear, currentMonth, 20, 11, 10),
      },
      {
        type: "debit",
        amount: 50.0,
        status: "completed",
        reason: { en: "Service Refund Adjustment", ar: "تعديل استرداد خدمة" },
        createdAt: new Date(currentYear, currentMonth, 22, 14, 0),
      },
      {
        type: "expense",
        amount: 210.0,
        status: "completed",
        reason: { en: "Server Maintenance & Infrastructure", ar: "صيانة وتجهيزات السيرفر" },
        createdAt: new Date(currentYear, currentMonth, 25, 18, 30),
      },
    ];

    for (const item of transactionsData) {
      await prisma.transaction.create({
        data: {
          walletId: systemWallet.id,
          type: item.type,
          amount: item.amount,
          status: item.status,
          reason: item.reason,
          createdAt: item.createdAt,
        },
      });
    }

    console.log(`Successfully seeded ${transactionsData.length} transactions for current month (${currentYear}-${currentMonth + 1})!`);
  } catch (error) {
    console.error("Error seeding transactions:", error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedTransactions()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
