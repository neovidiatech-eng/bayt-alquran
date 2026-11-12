-- AlterTable
ALTER TABLE "student" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "birth_date" DROP NOT NULL;
