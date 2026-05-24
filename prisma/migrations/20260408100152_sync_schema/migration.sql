/*
  Warnings:

  - You are about to drop the column `sessionsCount` on the `Plans` table. All the data in the column will be lost.
  - You are about to drop the column `sessions_attended` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `sessions_count` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `sessions_remaining` on the `student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "subscription_requests_planId_key";

-- DropIndex
DROP INDEX "subscription_requests_user_id_key";

-- DropIndex
DROP INDEX "user_roleId_key";

-- AlterTable
ALTER TABLE "Plans" DROP COLUMN "sessionsCount",
ADD COLUMN     "hours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "schedule" ADD COLUMN     "day_of_week" TEXT,
ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_recurring_id" TEXT;

-- AlterTable
ALTER TABLE "student" DROP COLUMN "sessions_attended",
DROP COLUMN "sessions_count",
DROP COLUMN "sessions_remaining",
ADD COLUMN     "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "hours_attended" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "hours_remaining" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'local',
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "code_country" DROP NOT NULL;

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_type" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_googleId_key" ON "user"("googleId");

-- CreateIndex
CREATE INDEX "user_googleId_idx" ON "user"("googleId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
