-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "withdrawalRequestId" TEXT;

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "bankDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WithdrawalRequest_teacherId_idx" ON "WithdrawalRequest"("teacherId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_withdrawalRequestId_fkey" FOREIGN KEY ("withdrawalRequestId") REFERENCES "WithdrawalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
