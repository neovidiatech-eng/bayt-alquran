-- AlterTable
ALTER TABLE "student" ADD COLUMN     "paid" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "teacher" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "age" INTEGER DEFAULT 0,
ADD COLUMN     "city" TEXT DEFAULT 'unknown';
