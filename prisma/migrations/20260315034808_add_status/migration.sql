/*
  Warnings:

  - Made the column `birth_date` on table `student` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gender` on table `student` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "student" ALTER COLUMN "birth_date" SET NOT NULL,
ALTER COLUMN "gender" SET NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
