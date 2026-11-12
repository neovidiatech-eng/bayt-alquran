/*
  Warnings:

  - You are about to drop the `subscription_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "subscription_requests" DROP CONSTRAINT "subscription_requests_planId_fkey";

-- DropForeignKey
ALTER TABLE "subscription_requests" DROP CONSTRAINT "subscription_requests_user_id_fkey";

-- DropTable
DROP TABLE "subscription_requests";
