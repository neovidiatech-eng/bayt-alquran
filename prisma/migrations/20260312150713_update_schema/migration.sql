/*
  Warnings:

  - You are about to drop the column `codeCountry` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "codeCountry",
ADD COLUMN     "code_country" TEXT NOT NULL DEFAULT '+20';
