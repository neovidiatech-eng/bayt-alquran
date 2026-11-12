-- DropForeignKey
ALTER TABLE "subscription_requests" DROP CONSTRAINT "subscription_requests_user_id_fkey";

-- AlterTable
ALTER TABLE "subscription_requests" ADD COLUMN     "studentId" TEXT;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
