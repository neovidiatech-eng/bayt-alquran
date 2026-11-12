-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "wallet_id" TEXT;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
