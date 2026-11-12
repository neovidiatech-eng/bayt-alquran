/*
  Warnings:

  - You are about to drop the column `expected_salary` on the `moderator` table. All the data in the column will be lost.
  - Made the column `salary` on table `moderator` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "moderator" DROP COLUMN "expected_salary",
ALTER COLUMN "salary" SET NOT NULL;
