/*
  Warnings:

  - You are about to drop the column `currency` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `currencyId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "currency",
DROP COLUMN "endDate",
ADD COLUMN     "currencyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
