/*
  Warnings:

  - Added the required column `exchangeRate` to the `currency` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "currency" ADD COLUMN     "exchangeRate" DOUBLE PRECISION NOT NULL;
