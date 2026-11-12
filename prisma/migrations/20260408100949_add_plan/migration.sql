-- CreateTable
CREATE TABLE "subscription_requests" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_requests_user_id_idx" ON "subscription_requests"("user_id");

-- CreateIndex
CREATE INDEX "subscription_requests_planId_idx" ON "subscription_requests"("planId");

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
