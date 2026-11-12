/*
  Warnings:

  - You are about to drop the column `confirm` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "confirm",
ADD COLUMN     "confirmAt" TIMESTAMP(3);
