/*
  Warnings:

  - You are about to drop the `subscriptionRequests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "subscriptionRequests" DROP CONSTRAINT "subscriptionRequests_planId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptionRequests" DROP CONSTRAINT "subscriptionRequests_studentId_fkey";

-- DropTable
DROP TABLE "subscriptionRequests";

-- CreateTable
CREATE TABLE "subscription_requests" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_requests_studentId_key" ON "subscription_requests"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_requests_planId_key" ON "subscription_requests"("planId");

-- CreateIndex
CREATE INDEX "subscription_requests_studentId_idx" ON "subscription_requests"("studentId");

-- CreateIndex
CREATE INDEX "subscription_requests_planId_idx" ON "subscription_requests"("planId");

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
