/*
  Warnings:

  - You are about to drop the column `studentId` on the `subscription_requests` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `subscription_requests` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `subscription_requests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "subscription_requests" DROP CONSTRAINT "subscription_requests_studentId_fkey";

-- DropIndex
DROP INDEX "subscription_requests_studentId_idx";

-- DropIndex
DROP INDEX "subscription_requests_studentId_key";

-- AlterTable
ALTER TABLE "subscription_requests" DROP COLUMN "studentId",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subscription_requests_user_id_key" ON "subscription_requests"("user_id");

-- CreateIndex
CREATE INDEX "subscription_requests_user_id_idx" ON "subscription_requests"("user_id");

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
