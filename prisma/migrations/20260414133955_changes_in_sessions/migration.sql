/*
  Warnings:

  - You are about to drop the column `hours` on the `Plans` table. All the data in the column will be lost.
  - You are about to drop the column `hours` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `hours_attended` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `hours_remaining` on the `student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plans" DROP COLUMN "hours",
ADD COLUMN     "sessionsCount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "student" DROP COLUMN "hours",
DROP COLUMN "hours_attended",
DROP COLUMN "hours_remaining",
ADD COLUMN     "sessions" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sessions_attended" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sessions_remaining" DOUBLE PRECISION NOT NULL DEFAULT 0;
