-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "discount_type" TEXT NOT NULL DEFAULT 'late',
ADD COLUMN     "paid_session_count" INTEGER NOT NULL DEFAULT 3;
