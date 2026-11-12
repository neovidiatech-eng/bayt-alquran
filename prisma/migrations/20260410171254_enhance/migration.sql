/*
  Warnings:

  - You are about to drop the column `code_country` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `confirm_at` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `code_country` on the `stuff` table. All the data in the column will be lost.
  - You are about to drop the column `confirm_at` on the `stuff` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `stuff` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `stuff` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `stuff` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `stuff` table. All the data in the column will be lost.
  - You are about to drop the column `code_country` on the `teacher` table. All the data in the column will be lost.
  - You are about to drop the column `confirm_at` on the `teacher` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `teacher` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `teacher` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `teacher` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `teacher` table. All the data in the column will be lost.
  - Made the column `user_id` on table `student` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `stuff` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `teacher` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "student_email_idx";

-- DropIndex
DROP INDEX "student_email_key";

-- DropIndex
DROP INDEX "student_phone_key";

-- DropIndex
DROP INDEX "stuff_email_idx";

-- DropIndex
DROP INDEX "stuff_email_key";

-- DropIndex
DROP INDEX "stuff_phone_key";

-- DropIndex
DROP INDEX "teacher_email_key";

-- DropIndex
DROP INDEX "teacher_phone_key";

-- AlterTable
ALTER TABLE "student" DROP COLUMN "code_country",
DROP COLUMN "confirm_at",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "phone",
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "stuff" DROP COLUMN "code_country",
DROP COLUMN "confirm_at",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "phone",
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "teacher" DROP COLUMN "code_country",
DROP COLUMN "confirm_at",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "phone",
ALTER COLUMN "user_id" SET NOT NULL;
