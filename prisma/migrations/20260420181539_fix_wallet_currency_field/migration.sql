/*
  Warnings:

  - You are about to drop the column `currency` on the `Wallet` table. All the data in the column will be lost.
  - Added the required column `currencyId` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "currency",
ADD COLUMN     "currencyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
