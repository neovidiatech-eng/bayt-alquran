/*
  Warnings:

  - Made the column `code` on table `permission` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "permission" ALTER COLUMN "code" SET NOT NULL;
