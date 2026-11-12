/*
  Warnings:

  - You are about to drop the column `endTime` on the `schedule` table. All the data in the column will be lost.
  - The `startTime` column on the `schedule` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "schedule" DROP COLUMN "endTime",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'half',
DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3);
