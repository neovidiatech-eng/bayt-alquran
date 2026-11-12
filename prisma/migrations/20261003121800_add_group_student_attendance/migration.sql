/*
  Warnings:

  - Added the required column `updatedAt` to the `GroupScheduleStudent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GroupScheduleStudent" ADD COLUMN     "duration" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isAttended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "joinTime" TIMESTAMP(3),
ADD COLUMN     "leaveTime" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "moderator" ALTER COLUMN "salary" DROP NOT NULL;
