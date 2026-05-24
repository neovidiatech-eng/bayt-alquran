/*
  Warnings:

  - You are about to drop the column `type` on the `schedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "schedule" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "teacher" ADD COLUMN     "meeting_link" TEXT;
