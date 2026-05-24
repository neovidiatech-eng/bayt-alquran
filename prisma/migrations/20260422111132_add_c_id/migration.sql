-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN     "currencyId" TEXT;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
