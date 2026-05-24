/*
  Warnings:

  - You are about to drop the column `transactionId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `referenceId` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_transactionId_fkey";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "transactionId";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "referenceId",
ADD COLUMN     "expenseId" TEXT,
ADD COLUMN     "subscriptionId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
