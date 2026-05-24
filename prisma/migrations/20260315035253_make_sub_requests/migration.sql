-- CreateTable
CREATE TABLE "subscriptionRequests" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptionRequests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptionRequests_studentId_key" ON "subscriptionRequests"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptionRequests_planId_key" ON "subscriptionRequests"("planId");

-- CreateIndex
CREATE INDEX "subscriptionRequests_studentId_idx" ON "subscriptionRequests"("studentId");

-- CreateIndex
CREATE INDEX "subscriptionRequests_planId_idx" ON "subscriptionRequests"("planId");

-- AddForeignKey
ALTER TABLE "subscriptionRequests" ADD CONSTRAINT "subscriptionRequests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptionRequests" ADD CONSTRAINT "subscriptionRequests_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
