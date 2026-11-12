/*
  Warnings:

  - You are about to drop the column `scheduleId` on the `moderatorViolation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "moderatorViolation" DROP CONSTRAINT "moderatorViolation_scheduleId_fkey";

-- AlterTable
ALTER TABLE "moderatorViolation" DROP COLUMN "scheduleId";
