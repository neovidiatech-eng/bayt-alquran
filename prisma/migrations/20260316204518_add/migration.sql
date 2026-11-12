/*
  Warnings:

  - Added the required column `sessions_count` to the `student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "student" ADD COLUMN     "sessions_count" INTEGER NOT NULL;
