/*
  Warnings:

  - You are about to drop the column `date` on the `schedule` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "schedule_date_idx";

-- AlterTable
ALTER TABLE "schedule" DROP COLUMN "date";

-- CreateIndex
CREATE INDEX "schedule_start_time_idx" ON "schedule"("start_time");

-- CreateIndex
CREATE INDEX "schedule_end_time_idx" ON "schedule"("end_time");
