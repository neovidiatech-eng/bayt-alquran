-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_currencyId_fkey";

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "currencyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "currencyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
